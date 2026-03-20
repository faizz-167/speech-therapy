from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, cast, String
from sqlalchemy.orm import selectinload

from database import get_db
from models.clinical import Defect, BaselineAssessment, BaselineDefectMapping
from models.tasks import Task, TaskDefectMapping
from models.models import BaselineTask, Patient
from middleware.auth import require_role

router = APIRouter(prefix="/defects", tags=["Defects"])


@router.get("")
async def get_defects(category: str = "adult", db: AsyncSession = Depends(get_db)):
    """Get all defects from DB.
    If category is 'adult' or 'child', return ALL defects (age is not stored in DB).
    If category is a clinical type (articulation/fluency/cognition), filter by it.
    """
    stmt = select(Defect)
    clinical_categories = {"articulation", "fluency", "cognition"}
    if category and category in clinical_categories:
        stmt = stmt.where(cast(Defect.category, String) == category)
    # 'adult', 'child', 'all' → return everything
    stmt = stmt.order_by(Defect.code)
    result = await db.execute(stmt)
    rows = result.scalars().all()

    return [
        {
            "defect_id": d.defect_id,
            "defect_name": d.name,
            "defect_type": d.category,
            "code": d.code,
            "description": d.description or "",
        }
        for d in rows
    ]


@router.get("/{defect_id}/recommendations")
async def get_defect_recommendations(
    defect_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get recommended therapy tasks for a defect, all from the database."""

    # 1. Fetch defect
    defect = await db.get(Defect, defect_id)
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    defect_info = {
        "defect_id": defect.defect_id,
        "defect_name": defect.name,
        "defect_type": defect.category,
        "code": defect.code,
        "description": defect.description or "",
    }

    # 2. Fetch task-defect mappings with eagerly loaded Task
    tdm_stmt = (
        select(TaskDefectMapping)
        .options(selectinload(TaskDefectMapping.task))
        .where(TaskDefectMapping.defect_id == defect_id)
    )
    tdm_result = await db.execute(tdm_stmt)
    mappings = tdm_result.scalars().all()

    therapy_tasks = []
    for m in mappings:
        t = m.task
        therapy_tasks.append({
            "task_id": m.task_id,
            "task_name": t.name if t else "",
            "task_category": t.type if t else "",
            "interaction_type": t.type if t else "",
            "relevance_level": m.relevance_level or "",
            "clinical_notes": m.clinical_notes or "",
        })

    # 3. Fetch baseline assessment (optional)
    baseline_assessment = {}
    try:
        bdm_stmt = (
            select(BaselineDefectMapping)
            .options(selectinload(BaselineDefectMapping.assessment))
            .where(BaselineDefectMapping.defect_id == defect_id)
        )
        bdm_result = await db.execute(bdm_stmt)
        bdm = bdm_result.scalars().first()
        if bdm and bdm.assessment:
            a = bdm.assessment
            baseline_assessment = {
                "baseline_id": a.baseline_id,
                "name": a.name,
                "domain": a.domain,
                "description": a.description or "",
            }
    except Exception:
        pass

    return {
        "defect": defect_info,
        "baseline_assessment": baseline_assessment,
        "therapy_tasks": therapy_tasks,
    }


@router.get("/tasks-for-patient/{patient_id}")
async def get_tasks_for_patient(
    patient_id: str,
    current_user: dict = Depends(require_role(["therapist"])),
    db: AsyncSession = Depends(get_db)
):
    """Get all therapy tasks for a patient based on their selected defects, from DB."""

    p_stmt = select(Patient).where(Patient.id == patient_id)
    p_result = await db.execute(p_stmt)
    patient = p_result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    selected_defects = patient.selected_defects or []
    if not selected_defects:
        return {"tasks": [], "message": "No defects selected for this patient"}

    # Query all task-defect mappings for the selected defect IDs
    tdm_stmt = (
        select(TaskDefectMapping)
        .options(selectinload(TaskDefectMapping.task).selectinload(Task.levels))
        .where(TaskDefectMapping.defect_id.in_(selected_defects))
    )
    tdm_result = await db.execute(tdm_stmt)
    mappings = tdm_result.scalars().all()

    seen_ids = set()
    all_tasks = []
    for m in mappings:
        t = m.task
        if not t or t.task_id in seen_ids:
            continue
        seen_ids.add(t.task_id)
        all_tasks.append({
            "task_id": t.task_id,
            "task_name": t.name,
            "task_type": t.type,
            "description": t.description or "",
            "available_levels": [lv.level_name for lv in (t.levels or [])],
        })

    return {"tasks": all_tasks, "source": "database"}
