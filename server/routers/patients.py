from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid
import json

from database import get_db
from models.workflow import Patient, PatientBaselineResult, BaselineItemResult
from schemas.workflow import PatientSchema, PatientCreate, PatientBaselineResultSchema, PatientBaselineResultCreate

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.post("", response_model=PatientSchema)
async def create_patient(patient: PatientCreate, db: AsyncSession = Depends(get_db)):
    new_patient = Patient(**patient.model_dump())
    db.add(new_patient)
    await db.commit()
    await db.refresh(new_patient)
    return new_patient

@router.get("", response_model=List[PatientSchema])
async def list_patients(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Patient).order_by(Patient.full_name))
    return result.scalars().all()

@router.get("/{patient_id}", response_model=PatientSchema)
async def get_patient(patient_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Patient).where(Patient.patient_id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

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
