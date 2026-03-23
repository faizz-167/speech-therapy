from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from typing import List
import uuid

from database import get_db
from models.session import PatientTaskProgress
from models.workflow import Patient
from schemas.session import PatientTaskProgressSchema
from middleware.auth import get_current_user

router = APIRouter(prefix="/progress", tags=["Progress & Alerts"])

@router.get("/patients/{patient_id}", response_model=List[PatientTaskProgressSchema])
async def get_patient_progress(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get active task progress for a patient, 'me' resolves to current user."""
    if patient_id == "me":
        # Check if auth gives us 'patient_id' directly or fall back to 'user_id'
        pid = current_user.get("patient_id") or current_user.get("id") or current_user.get("user_id")
    else:
        pid = patient_id

    try:
        pid_uuid = uuid.UUID(str(pid))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid patient ID")

    result = await db.execute(
        select(PatientTaskProgress)
        .where(PatientTaskProgress.patient_id == pid_uuid)
        .order_by(PatientTaskProgress.last_attempted_at.desc())
    )
    return result.scalars().all()


@router.get("/clinician/alerts", response_model=List[PatientTaskProgressSchema])
async def get_clinician_alerts(therapist_id: str, db: AsyncSession = Depends(get_db)):
    """Find patients with active alerts for a therapist.
    
    The therapist_id param is actually the auth user.id — we need to look up
    their patients via the old therapists table.
    """
    from models.models import Therapist as OldTherapist, Patient as OldPatient

    # Step 1: Find old therapist by user_id
    t_result = await db.execute(
        select(OldTherapist).where(OldTherapist.user_id == therapist_id)
    )
    therapist = t_result.scalars().first()
    if not therapist:
        return []  # No therapist record → no alerts

    # Step 2: Find all patients for this therapist
    p_result = await db.execute(
        select(OldPatient.id).where(OldPatient.therapist_id == therapist.id)
    )
    patient_ids = [row[0] for row in p_result.all()]
    if not patient_ids:
        return []

    # Step 3: Find progress rows with clinician_alert for those patients
    stmt = (
        select(PatientTaskProgress)
        .where(PatientTaskProgress.patient_id.in_(patient_ids))
        .where(PatientTaskProgress.clinician_alert == True)
        .order_by(PatientTaskProgress.last_attempted_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()

@router.patch("/{progress_id}/dismiss-alert")
async def dismiss_alert(progress_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = (
        update(PatientTaskProgress)
        .where(PatientTaskProgress.progress_id == progress_id)
        .values(clinician_alert=False, progress_delta=0.0)
    )
    result = await db.execute(stmt)
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Progress tracking row not found")
    await db.commit()
    return {"message": "Alert dismissed"}
