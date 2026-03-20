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

router = APIRouter(prefix="/progress", tags=["Progress & Alerts"])

@router.get("/patients/{patient_id}", response_model=List[PatientTaskProgressSchema])
async def get_patient_progress(patient_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PatientTaskProgress)
        .where(PatientTaskProgress.patient_id == patient_id)
        .order_by(PatientTaskProgress.last_attempted_at.desc())
    )
    return result.scalars().all()

@router.get("/clinician/alerts", response_model=List[PatientTaskProgressSchema])
async def get_clinician_alerts(therapist_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    # Find all patients belonging to therapist who have an active clinician_alert
    stmt = (
        select(PatientTaskProgress)
        .join(Patient)
        .where(Patient.assigned_therapist_id == therapist_id)
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
