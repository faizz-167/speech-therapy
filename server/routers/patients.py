from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
import uuid
import os
import asyncio
import json

from database import get_db
from models.workflow import Patient, PatientBaselineResult, BaselineItemResult, Therapist, SessionEmotionSummary
from models.models import Patient as OldPatient, Therapist as OldTherapist
from models.clinical import BaselineItem, BaselineSection, Defect
from models.tasks import TaskDefectMapping, TaskLevel
from models.session import PatientTaskProgress
from schemas.workflow import (
    PatientSchema, PatientCreate, PatientBaselineResultSchema, PatientBaselineResultCreate,
    PatientRegistration, PatientLogin, EmotionTrendsResponse, PatientStreakResponse, EmotionTrendSchema
)
import bcrypt
from datetime import datetime, date, timedelta
from services.audio_service import audio_service
from services.asr_service import asr_service
from services.ser_service import ser_service
from services.phoneme_service import phoneme_service
from services.analysis_service import analysis_service

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.post("/", response_model=PatientSchema)
async def register_patient(patient_data: PatientRegistration, db: AsyncSession = Depends(get_db)):
    # 1. Lookup therapist
    therapist_res = await db.execute(select(Therapist).where(Therapist.therapist_code == patient_data.therapist_code))
    therapist = therapist_res.scalar_one_or_none()
    
    if not therapist:
        old_therapist_res = await db.execute(select(OldTherapist).where(OldTherapist.therapist_code == patient_data.therapist_code))
        old_therapist = old_therapist_res.scalar_one_or_none()
        if old_therapist:
            # Auto-migrate legacy therapist to V3 schema to satisfy Foreign Key constraints
            import uuid
            therapist = Therapist(
                therapist_id=uuid.UUID(old_therapist.id) if isinstance(old_therapist.id, str) else old_therapist.id,
                full_name=old_therapist.name or "Legacy Therapist",
                license_number=f"LEGACY-{old_therapist.therapist_code}",
                email=old_therapist.email,
                specialization=old_therapist.specialization,
                therapist_code=old_therapist.therapist_code
            )
            db.add(therapist)
            await db.flush()

    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist code not recognised. Please check with your therapist.")
        
    t_id = getattr(therapist, "therapist_id", getattr(therapist, "id", None))

    # 2. Resolve defect codes
    defect_ids = []
    if patient_data.pre_assigned_defect_codes:
        defects_res = await db.execute(select(Defect).where(Defect.code.in_(patient_data.pre_assigned_defect_codes)))
        defects = defects_res.scalars().all()
        valid_codes = {d.code for d in defects}
        for code in patient_data.pre_assigned_defect_codes:
            if code not in valid_codes:
                raise HTTPException(status_code=422, detail=f"Invalid defect code: {code}")
        defect_ids = [d.defect_id for d in defects]

    # 3. Parse date
    dob = None
    if patient_data.date_of_birth:
        try:
            dob = datetime.strptime(patient_data.date_of_birth, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid date format, expected YYYY-MM-DD")

    new_patient = Patient(
        full_name=patient_data.full_name,
        email=patient_data.email,
        age=patient_data.age,
        date_of_birth=dob,
        gender=patient_data.gender,
        primary_diagnosis=patient_data.primary_language,
        assigned_therapist_id=t_id,
        pre_assigned_defect_ids=defect_ids if defect_ids else None
    )
    db.add(new_patient)
    await db.commit()
    await db.refresh(new_patient)
    return new_patient



@router.get("", response_model=List[PatientSchema])
async def list_patients(therapist_id: Optional[uuid.UUID] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(Patient).order_by(Patient.full_name)
    if therapist_id:
        stmt = stmt.where(Patient.assigned_therapist_id == therapist_id)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{patient_id}/emotion-trends", response_model=EmotionTrendsResponse)
async def get_emotion_trends(patient_id: uuid.UUID, days: int = 30, db: AsyncSession = Depends(get_db)):
    days = min(max(days, 1), 90)
    cutoff = datetime.utcnow().date() - timedelta(days=days)
    
    stmt = (
        select(SessionEmotionSummary)
        .where(SessionEmotionSummary.patient_id == patient_id)
        .where(SessionEmotionSummary.session_date >= cutoff)
        .order_by(SessionEmotionSummary.session_date.desc())
    )
    res = await db.execute(stmt)
    summaries = res.scalars().all()
    
    trends = []
    for s in summaries:
        trends.append(EmotionTrendSchema(
            session_date=s.session_date,
            dominant_emotion=s.dominant_emotion,
            avg_frustration=float(s.avg_frustration) if s.avg_frustration else None,
            avg_engagement=float(s.avg_engagement) if s.avg_engagement else None,
            drop_count=s.drop_count
        ))
        
    avg_frust_3 = 0.0
    chronic = False
    if len(summaries) >= 3:
        last_3 = summaries[:3]
        frusts = [float(s.avg_frustration) if s.avg_frustration else 0.0 for s in last_3]
        avg_frust_3 = sum(frusts) / 3
        if all(f > 0.35 for f in frusts):
            chronic = True
            
    return EmotionTrendsResponse(
        patient_id=patient_id,
        trends=trends,
        chronic_frustration_flag=chronic,
        avg_frustration_last_3_sessions=round(avg_frust_3, 3)
    )

@router.get("/{patient_id}/streak", response_model=PatientStreakResponse)
async def get_streak(patient_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Patient).where(Patient.patient_id == patient_id))
    patient = res.scalar_one_or_none()
    
    current_streak = 0
    longest_streak = 0

    if not patient:
        # Fallback to Old Schema Patient to avoid 404
        old_res = await db.execute(select(OldPatient).where(OldPatient.id == str(patient_id)))
        old_patient = old_res.scalar_one_or_none()
        if not old_patient:
            raise HTTPException(status_code=404, detail="Patient not found in any schema")
    else:
        current_streak = patient.current_streak
        longest_streak = patient.longest_streak
        
    stmt = (
        select(SessionEmotionSummary.session_date)
        .where(SessionEmotionSummary.patient_id == patient_id)
        .order_by(SessionEmotionSummary.session_date.desc())
        .limit(1)
    )
    last_res = await db.execute(stmt)
    last_date = last_res.scalar_one_or_none()
    
    return PatientStreakResponse(
        current_streak=current_streak,
        longest_streak=longest_streak,
        last_session_date=last_date
    )

@router.post("/{patient_id}/baseline-results", response_model=PatientBaselineResultSchema)
async def create_baseline_result(patient_id: uuid.UUID, result_data: PatientBaselineResultCreate, db: AsyncSession = Depends(get_db)):
    # 1. Create PatientBaselineResult
    result_dict = result_data.model_dump(exclude={"items"})
    new_result = PatientBaselineResult(**result_dict)
    
    # Override assessed_on timestamp for real default behavior
    from datetime import datetime
    new_result.assessed_on = datetime.utcnow()
    
    db.add(new_result)
    await db.flush() # flush to get result_id
    
    # 2. Add BaselineItemResults
    for item in result_data.items:
        new_item = BaselineItemResult(
            result_id=new_result.result_id,
            item_id=item.item_id,
            score_given=item.score_given,
            error_noted=item.error_noted,
            clinician_note=item.clinician_note
        )
        db.add(new_item)
    
    await db.commit()
    await db.refresh(new_result)
    
    # return re-queried to include relationship mapping (if needed, else simple representation works)
    return new_result


@router.get("/baseline-results", response_model=List[PatientBaselineResultSchema])
async def get_baseline_results(patient_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(PatientBaselineResult)
        .where(PatientBaselineResult.patient_id == patient_id)
        .order_by(PatientBaselineResult.assessed_on.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/item-results")
async def process_baseline_item(
    item_id: str = Form(...),
    patient_id: uuid.UUID = Form(...),
    baseline_id: str = Form(...),
    audio: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    # 1. Load Baseline Item
    stmt = select(BaselineItem).options(selectinload(BaselineItem.section)).where(BaselineItem.item_id == item_id)
    res = await db.execute(stmt)
    item_obj = res.scalar_one_or_none()
    if not item_obj:
        raise HTTPException(status_code=404, detail="Baseline item not found")

    # 2. Get or Create PatientBaselineResult for this session
    stmt = select(PatientBaselineResult).where(
        PatientBaselineResult.patient_id == patient_id,
        PatientBaselineResult.baseline_id == baseline_id
    ).order_by(PatientBaselineResult.assessed_on.desc()).limit(1)
    res = await db.execute(stmt)
    pb_result = res.scalar_one_or_none()
    
    if not pb_result:
        from datetime import datetime
        pb_result = PatientBaselineResult(
            patient_id=patient_id,
            baseline_id=baseline_id,
            assessed_on=datetime.utcnow()
        )
        db.add(pb_result)
        await db.commit()
        await db.refresh(pb_result)

    # 3. Handle Audio processing
    temp_webm = f"uploads/base_{patient_id}_{item_id}.webm"
    with open(temp_webm, "wb") as f:
        f.write(await audio.read())
        
    try:
        wav_path = audio_service.convert_webm_to_wav(temp_webm)
        
        # Parallel Audio Analysis
        task_mode = item_obj.formula_mode
        asr_task = asyncio.to_thread(asr_service.transcribe, wav_path, task_mode)
        ser_task = asyncio.to_thread(ser_service.analyze_emotion, wav_path, "adult", 0.0, 1, False)
        p_mode = "accurate" if task_mode in ("word_drill", "sentence_read") else "fast"
        phoneme_task = asyncio.to_thread(
            phoneme_service.compute_phoneme_accuracy, wav_path, item_obj.expected_output, p_mode, task_mode, None
        )
        
        asr_res, ser_res, pho_res = await asyncio.gather(asr_task, ser_task, phoneme_task)
        
        po_dict = {
            "source": "baseline",
            "task_mode": task_mode,
            "formula_weights": item_obj.formula_weights,
            "fusion_weights": item_obj.fusion_weights,
            "wpm_range": item_obj.wpm_range
        }
        
        analysis = analysis_service.process_recording(
            expected_text=item_obj.expected_output,
            asr_result=asr_res,
            ser_result=ser_res,
            phoneme_result=pho_res,
            task_mode=task_mode,
            patient_category="adult",
            prompt_obj=po_dict,
            content_result=None,
            baseline_score=None,
            consecutive_pass=0,
            consecutive_fail=0
        )
        
        final_score = analysis.get("final_score", 0.0)
        
        # 4. Save the baseline item score
        new_item = BaselineItemResult(
            result_id=pb_result.result_id,
            item_id=item_id,
            score_given=int(final_score),
            error_noted=analysis.get("feedback", ""),
            clinician_note="AI Evaluated"
        )
        db.add(new_item)
        await db.commit()

        # 5. Check for Section Completion & Aggregate initial milestones (Fix 6)
        section_id = item_obj.section_id
        # Get all items in this section
        all_sec_items = await db.execute(select(BaselineItem).where(BaselineItem.section_id == section_id))
        all_sec_items = all_sec_items.scalars().all()
        # Get all stored results for this pb_result
        all_stored = await db.execute(
            select(BaselineItemResult).where(BaselineItemResult.result_id == pb_result.result_id)
        )
        stored_item_ids = [s.item_id for s in all_stored.scalars().all()]
        
        section_item_ids = [i.item_id for i in all_sec_items]
        
        if all(sid in stored_item_ids for sid in section_item_ids):
            # Section is fully complete!
            dt_stored = all_stored.scalars().all()
            sec_scores = [s.score_given for s in dt_stored if s.item_id in section_item_ids]
            
            if sec_scores and item_obj.section.target_defect_id:
                avg_score = sum(sec_scores) / len(sec_scores)
                # Find task mappings for this defect
                defect_mappings = await db.execute(
                    select(TaskDefectMapping).where(TaskDefectMapping.defect_id == item_obj.section.target_defect_id)
                )
                
                # Determine initial Level logic (simplified)
                for mapping in defect_mappings.scalars().all():
                    # get task levels
                    lvls = await db.execute(
                        select(TaskLevel)
                        .where(TaskLevel.task_id == mapping.task_id)
                        .order_by(TaskLevel.difficulty_score.asc())
                    )
                    task_lvls = lvls.scalars().all()
                    if not task_lvls: continue
                    
                    target_lvl = task_lvls[0] # Assume lowest if weak
                    if avg_score > 80:
                        target_lvl = task_lvls[-1] # Highest if strong
                    elif avg_score > 50 and len(task_lvls) > 1:
                        target_lvl = task_lvls[len(task_lvls)//2] # Mid
                        
                    from datetime import datetime
                    pt_prog = PatientTaskProgress(
                        patient_id=patient_id,
                        task_id=mapping.task_id,
                        current_level_id=target_lvl.level_id,
                        consecutive_passes=0,
                        consecutive_fails=0,
                        overall_accuracy=avg_score,
                        last_attempted_at=datetime.utcnow()
                    )
                    # merge to overwrite if exists
                    db.add(pt_prog)
                await db.commit()

        return {"item_id": item_id, "score": final_score, "details": "Processed natively."}
        
    finally:
        audio_service.cleanup(temp_webm)


# ── Clinical Notes ──

@router.get("/{patient_id}/notes")
async def get_notes(patient_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Patient).where(Patient.patient_id == patient_id))
    patient = result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"notes": getattr(patient, 'clinical_notes', '') or ''}


@router.patch("/{patient_id}/notes")
async def save_notes(patient_id: uuid.UUID, body: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Patient).where(Patient.patient_id == patient_id))
    patient = result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient.clinical_notes = body.get("notes", "")
    await db.commit()
    return {"notes": patient.clinical_notes}

@router.post("/{patient_id}/notes")
async def add_note(patient_id: uuid.UUID, body: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Patient).where(Patient.patient_id == patient_id))
    patient = result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    current_notes_str = getattr(patient, 'clinical_notes', '') or '[]'
    try:
        current_notes = json.loads(current_notes_str)
        if not isinstance(current_notes, list):
            current_notes = []
    except json.JSONDecodeError:
        current_notes = []
        
    # Append the new note (body)
    current_notes.insert(0, body)
    
    # Save back to clinical_notes
    patient.clinical_notes = json.dumps(current_notes)
    await db.commit()
    return body


@router.get("/{patient_id}", response_model=PatientSchema)
async def get_patient(patient_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Patient).where(Patient.patient_id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient
