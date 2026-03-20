from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models.models import Patient, BaselineResult, BaselineTask
from middleware.auth import get_current_user, require_role

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.get("/profile")
async def get_patient_profile(
    current_user: dict = Depends(require_role(["patient"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Patient).where(Patient.user_id == current_user["id"])
    result = await db.execute(stmt)
    patient = result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return {
        "id": patient.id,
        "name": patient.name,
        "email": patient.email,
        "age": patient.age,
        "gender": patient.gender,
        "language": patient.language,
        "severity": patient.severity,
        "category": patient.category,
        "baseline_completed": patient.baseline_completed,
        "therapist_id": patient.therapist_id
    }

def _patient_to_dict(patient):
    return {
        "id": patient.id,
        "name": patient.name,
        "email": patient.email,
        "age": patient.age,
        "gender": patient.gender,
        "language": patient.language,
        "severity": patient.severity,
        "category": patient.category,
        "selected_defects": patient.selected_defects or [],
        "approved_task_ids": patient.approved_task_ids or [],
        "baseline_completed": patient.baseline_completed,
        "therapist_id": patient.therapist_id,
        "created_at": str(patient.created_at) if patient.created_at else None
    }



@router.get("/baseline-tasks")
async def get_baseline_tasks(
    current_user: dict = Depends(require_role(["patient"])),
    db: AsyncSession = Depends(get_db)
):
    # Get patient profile to determine defects and age category
    p_stmt = select(Patient).where(Patient.user_id == current_user["id"])
    p_result = await db.execute(p_stmt)
    patient = p_result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    selected_defects = patient.selected_defects or []
    age_group = patient.category or "adult"

    if selected_defects:
        # Fetch defect-specific baseline tasks for the patient's age group
        stmt = (
            select(BaselineTask)
            .where(BaselineTask.defect_id.in_(selected_defects))
            .where(BaselineTask.age_group == age_group)
        )
    else:
        # Fallback: return all baselines for the patient's age group
        stmt = select(BaselineTask).where(BaselineTask.age_group == age_group)

    result = await db.execute(stmt)
    tasks = result.scalars().all()
    return [
        {
            "id": t.id,
            "baseline_id": t.baseline_id,
            "defect_id": t.defect_id,
            "age_group": t.age_group,
            "assessment_name": t.assessment_name,
            "assessment_type": t.assessment_type,
            "tasks": t.tasks,
            "scoring_criteria": t.scoring_criteria,
            "defect_detail": t.defect_detail,
            "recommended_tasks": t.recommended_tasks
        }
        for t in tasks
    ]

class BaselineSubmitRequest(BaseModel):
    accuracy: float
    fluency: float
    emotional_tone: float
    phoneme_accuracy: float = 0
    speech_rate: float = 0
    engagement_score: float = 0
    speech_score: float = 0
    tasks_data: dict = {}

@router.post("/baseline-results")
async def submit_baseline_results(
    data: BaselineSubmitRequest,
    current_user: dict = Depends(require_role(["patient"])),
    db: AsyncSession = Depends(get_db)
):
    p_stmt = select(Patient).where(Patient.user_id == current_user["id"])
    p_result = await db.execute(p_stmt)
    patient = p_result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Check if baseline already exists
    b_stmt = select(BaselineResult).where(BaselineResult.patient_id == patient.id)
    b_result = await db.execute(b_stmt)
    existing = b_result.scalars().first()
    
    if existing:
        existing.accuracy = data.accuracy
        existing.fluency = data.fluency
        existing.emotional_tone = data.emotional_tone
        existing.phoneme_accuracy = data.phoneme_accuracy
        existing.speech_rate = data.speech_rate
        existing.engagement_score = data.engagement_score
        existing.speech_score = data.speech_score
        existing.tasks_data = data.tasks_data
    else:
        baseline = BaselineResult(
            patient_id=patient.id,
            accuracy=data.accuracy,
            fluency=data.fluency,
            emotional_tone=data.emotional_tone,
            phoneme_accuracy=data.phoneme_accuracy,
            speech_rate=data.speech_rate,
            engagement_score=data.engagement_score,
            speech_score=data.speech_score,
            tasks_data=data.tasks_data
        )
        db.add(baseline)
    
    patient.baseline_completed = True
    await db.commit()
    return {"message": "Baseline results saved"}

@router.post("/baseline-analyze")
async def analyze_baseline_audio(
    audio: UploadFile = File(...),
    expected_text: str = Form(""),
    current_user: dict = Depends(require_role(["patient"])),
    db: AsyncSession = Depends(get_db)
):
    """Analyze a single baseline audio recording using AI models (ASR and SER)."""
    p_stmt = select(Patient).where(Patient.user_id == current_user["id"])
    p_result = await db.execute(p_stmt)
    patient = p_result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    import os
    import asyncio
    
    # Save audio temporarily
    temp_path = f"uploads/temp_baseline_{patient.id}.webm"
    os.makedirs("uploads", exist_ok=True)
    with open(temp_path, "wb") as f:
        f.write(await audio.read())
        
    try:
        from services.asr_service import asr_service
        from services.ser_service import ser_service
        from services.phoneme_service import phoneme_service
        from services.analysis_service import analysis_service
        
        asr_task = asyncio.to_thread(asr_service.transcribe, temp_path)
        ser_task = asyncio.to_thread(ser_service.analyze_emotion, temp_path)
        phoneme_task = asyncio.to_thread(
            phoneme_service.compute_phoneme_accuracy, temp_path, expected_text, "fast"
        )
        
        asr_result, ser_result, phoneme_result = await asyncio.gather(
            asr_task, ser_task, phoneme_task
        )
        
        # Determine expected response type
        response_type = "exact_match"
        if len(expected_text.split()) > 10:
            response_type = "free_speech"
            
        analysis_result = analysis_service.process_recording(
            expected_text, asr_result, ser_result, phoneme_result,
            response_type, patient.category or "adult"
        )
        
        return {
            "accuracy": analysis_result.get("word_accuracy", 0),
            "fluency": analysis_result.get("fluency", 0),
            "emotional_tone": analysis_result.get("engagement_score", 70),
            "phoneme_accuracy": analysis_result.get("phoneme_accuracy", 0),
            "speech_rate": analysis_result.get("speech_rate", 0),
            "engagement_score": analysis_result.get("engagement_score", 0),
            "speech_score": analysis_result.get("speech_score", 0),
            "final_score": analysis_result.get("final_score", 0),
            "performance_level": analysis_result.get("performance_level", ""),
            "emotion_label": analysis_result.get("detected_emotion", "neutral"),
            "transcription": analysis_result.get("transcribed_text", "")
        }
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.get("/baseline-results")
async def get_baseline_results(
    current_user: dict = Depends(require_role(["patient", "therapist"])),
    db: AsyncSession = Depends(get_db),
    patient_id: Optional[str] = None
):
    if current_user["role"] == "patient":
        p_stmt = select(Patient).where(Patient.user_id == current_user["id"])
        p_result = await db.execute(p_stmt)
        patient = p_result.scalars().first()
        pid = patient.id if patient else None
    else:
        pid = patient_id
    
    if not pid:
        raise HTTPException(status_code=400, detail="Patient ID required")
    
    stmt = select(BaselineResult).where(BaselineResult.patient_id == pid)
    result = await db.execute(stmt)
    baseline = result.scalars().first()
    if not baseline:
        return None
    
    return {
        "id": baseline.id,
        "accuracy": baseline.accuracy,
        "fluency": baseline.fluency,
        "emotional_tone": baseline.emotional_tone,
        "phoneme_accuracy": baseline.phoneme_accuracy,
        "speech_rate": baseline.speech_rate,
        "engagement_score": baseline.engagement_score,
        "speech_score": baseline.speech_score,
        "tasks_data": baseline.tasks_data,
        "completed_at": str(baseline.completed_at) if baseline.completed_at else None
    }

# IMPORTANT: This catch-all route MUST be last to avoid shadowing literal routes above
@router.get("/{patient_id}")
async def get_patient_by_id(
    patient_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Lookup patient by id or user_id (supports both therapist and patient views)."""
    stmt = select(Patient).where(Patient.id == patient_id)
    result = await db.execute(stmt)
    patient = result.scalars().first()
    if not patient:
        stmt2 = select(Patient).where(Patient.user_id == patient_id)
        result2 = await db.execute(stmt2)
        patient = result2.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return _patient_to_dict(patient)
