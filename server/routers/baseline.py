from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
import uuid

from database import get_db
from models.workflow import PatientBaselineResult, BaselineItemResult, Patient
from models.clinical import BaselineAssessment, BaselineSection, BaselineItem, BaselineDefectMapping
from schemas.clinical import BaselineAssessmentSchema, BaselineSectionSchema, BaselineItemSchema

router = APIRouter(prefix="/baselines", tags=["Baselines"])

@router.get("", response_model=List[BaselineAssessmentSchema])
@router.get("", response_model=List[BaselineAssessmentSchema])
async def get_baselines(patient_id: Optional[uuid.UUID] = None, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BaselineAssessment).order_by(BaselineAssessment.code))
    assessments = result.scalars().all()
    
    if not patient_id:
        return [BaselineAssessmentSchema(**{**a.__dict__, "recommended": False}) for a in assessments]
        
    pat_res = await db.execute(select(Patient).where(Patient.patient_id == patient_id))
    patient = pat_res.scalar_one_or_none()
    
    if not patient or not patient.pre_assigned_defect_ids:
        return [BaselineAssessmentSchema(**{**a.__dict__, "recommended": False}) for a in assessments]
        
    map_res = await db.execute(
        select(BaselineDefectMapping)
        .where(BaselineDefectMapping.defect_id.in_(patient.pre_assigned_defect_ids))
    )
    recommended_ids = {m.baseline_id for m in map_res.scalars().all()}
    
    def sort_key(a):
        return (not (a.baseline_id in recommended_ids), a.code)
        
    sorted_assessments = sorted(assessments, key=sort_key)
    
    ret = []
    for a in sorted_assessments:
        ret.append(BaselineAssessmentSchema(**{
            **a.__dict__,
            "recommended": (a.baseline_id in recommended_ids)
        }))
    return ret

@router.get("/{baseline_id}/sections", response_model=List[BaselineSectionSchema])
async def get_baseline_sections(baseline_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(BaselineSection)
        .where(BaselineSection.baseline_id == baseline_id)
        .options(selectinload(BaselineSection.items))
        .order_by(BaselineSection.order_index)
    )
    sections = result.scalars().all()
    if not sections:
        raise HTTPException(status_code=404, detail="No sections found for this baseline")
    return sections


@router.post("/results/{result_id}/complete")
async def complete_assessment(result_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Mark a baseline assessment as completed and return defect profile."""
    # 1. Fetch the result record
    pbr = await db.execute(
        select(PatientBaselineResult).where(PatientBaselineResult.result_id == result_id)
    )
    baseline_result = pbr.scalar_one_or_none()
    if not baseline_result:
        raise HTTPException(status_code=404, detail="Baseline result not found")

    # 2. Fetch all item results with their baseline items (to get defect_codes)
    item_results = await db.execute(
        select(BaselineItemResult)
        .where(BaselineItemResult.result_id == result_id)
    )
    items = item_results.scalars().all()

    # 3. Fetch baseline items for defect_code lookup
    item_ids = [ir.item_id for ir in items]
    if item_ids:
        bi_query = await db.execute(
            select(BaselineItem).where(BaselineItem.item_id.in_(item_ids))
        )
        baseline_items = {bi.item_id: bi for bi in bi_query.scalars().all()}
    else:
        baseline_items = {}

    # 4. Aggregate scores by defect
    defect_scores = {}
    for ir in items:
        bi = baseline_items.get(ir.item_id)
        if not bi:
            continue
        # defect_codes can be stored as comma-separated or JSON
        codes = []
        if hasattr(bi, 'defect_codes') and bi.defect_codes:
            if isinstance(bi.defect_codes, list):
                codes = bi.defect_codes
            elif isinstance(bi.defect_codes, str):
                codes = [c.strip() for c in bi.defect_codes.split(',')]
        
        score = ir.score_given if ir.score_given is not None else 0
        for code in codes:
            if code not in defect_scores:
                defect_scores[code] = {"total": 0, "count": 0}
            defect_scores[code]["total"] += score
            defect_scores[code]["count"] += 1

    # 5. Build defect profile
    def get_severity_label(score):
        if score < 40:
            return "Severe"
        elif score < 60:
            return "Moderate"
        elif score < 80:
            return "Mild"
        return "Within Normal Limits"

    defect_profile = []
    for code, data in defect_scores.items():
        avg_score = round(data["total"] / data["count"], 1) if data["count"] > 0 else 0
        defect_profile.append({
            "defect_id": str(uuid.uuid4()),
            "defect_code": code,
            "defect_name": code.replace("-", " ").replace("_", " ").title(),
            "severity_score": avg_score,
            "severity_label": get_severity_label(avg_score)
        })

    # 6. Mark the result as completed
    baseline_result.assessed_on = datetime.utcnow()
    await db.commit()

    return {
        "result_id": str(result_id),
        "completed_at": datetime.utcnow().isoformat(),
        "defect_profile": defect_profile
    }

