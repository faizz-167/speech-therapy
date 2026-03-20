from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Optional, List

from database import get_db
from models.models import Therapist, Patient, TherapyNote
from middleware.auth import get_current_user, require_role

router = APIRouter(prefix="/therapists", tags=["Therapists"])

class PatientCreateRequest(BaseModel):
    name: str
    email: str
    age: int
    gender: str = ""
    language: str = "English"
    severity: str = "moderate"
    therapist_notes_text: str = ""
    selected_defects: List[str] = []
    approved_task_ids: List[str] = []
    approved_task_categories: List[str] = []

class PatientUpdateRequest(BaseModel):
    severity: Optional[str] = None
    therapist_notes_text: Optional[str] = None
    selected_defects: Optional[List[str]] = None
    approved_task_ids: Optional[List[str]] = None
    approved_task_categories: Optional[List[str]] = None

@router.get("/profile")
async def get_therapist_profile(
    current_user: dict = Depends(require_role(["therapist"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Therapist).where(Therapist.user_id == current_user["id"])
    result = await db.execute(stmt)
    therapist = result.scalars().first()
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist profile not found")
    return {
        "id": therapist.id,
        "name": therapist.name,
        "email": therapist.email,
        "specialization": therapist.specialization,
        "clinic": therapist.clinic,
        "experience": therapist.experience,
        "therapist_code": therapist.therapist_code
    }

@router.get("/patients")
async def get_patients(
    current_user: dict = Depends(require_role(["therapist"])),
    db: AsyncSession = Depends(get_db)
):
    t_stmt = select(Therapist).where(Therapist.user_id == current_user["id"])
    t_result = await db.execute(t_stmt)
    therapist = t_result.scalars().first()
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")
    
    stmt = select(Patient).where(Patient.therapist_id == therapist.id)
    result = await db.execute(stmt)
    patients = result.scalars().all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "email": p.email,
            "age": p.age,
            "gender": p.gender,
            "language": p.language,
            "severity": p.severity,
            "category": p.category,
            "selected_defects": p.selected_defects,
            "approved_task_ids": p.approved_task_ids,
            "approved_task_categories": p.approved_task_categories,
            "baseline_completed": p.baseline_completed,
            "created_at": str(p.created_at) if p.created_at else None
        }
        for p in patients
    ]

@router.post("/patients", status_code=201)
async def create_patient(
    data: PatientCreateRequest,
    current_user: dict = Depends(require_role(["therapist"])),
    db: AsyncSession = Depends(get_db)
):
    t_stmt = select(Therapist).where(Therapist.user_id == current_user["id"])
    t_result = await db.execute(t_stmt)
    therapist = t_result.scalars().first()
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")
    
    patient = Patient(
        therapist_id=therapist.id,
        email=data.email,
        name=data.name,
        age=data.age,
        gender=data.gender,
        language=data.language,
        severity=data.severity,
        therapist_notes_text=data.therapist_notes_text,
        selected_defects=data.selected_defects,
        approved_task_ids=data.approved_task_ids,
        approved_task_categories=data.approved_task_categories,
        category="adult" if data.age >= 18 else "child"
    )
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return {"id": patient.id, "name": patient.name, "message": "Patient created"}

@router.put("/patients/{patient_id}")
async def update_patient(
    patient_id: str,
    data: PatientUpdateRequest,
    current_user: dict = Depends(require_role(["therapist"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Patient).where(Patient.id == patient_id)
    result = await db.execute(stmt)
    patient = result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    if data.severity is not None:
        patient.severity = data.severity
    if data.therapist_notes_text is not None:
        patient.therapist_notes_text = data.therapist_notes_text
    if data.selected_defects is not None:
        patient.selected_defects = data.selected_defects
    if data.approved_task_ids is not None:
        patient.approved_task_ids = data.approved_task_ids
    if data.approved_task_categories is not None:
        patient.approved_task_categories = data.approved_task_categories
    
    await db.commit()
    return {"message": "Patient updated"}

@router.get("/patients/{patient_id}")
async def get_patient_detail(
    patient_id: str,
    current_user: dict = Depends(require_role(["therapist"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Patient).where(Patient.id == patient_id)
    result = await db.execute(stmt)
    patient = result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    return {
        "id": patient.id,
        "name": patient.name,
        "email": patient.email,
        "age": patient.age,
        "gender": patient.gender,
        "language": patient.language,
        "severity": patient.severity,
        "therapist_notes_text": patient.therapist_notes_text,
        "category": patient.category,
        "selected_defects": patient.selected_defects,
        "approved_task_ids": patient.approved_task_ids,
        "approved_task_categories": patient.approved_task_categories,
        "baseline_completed": patient.baseline_completed,
        "created_at": str(patient.created_at) if patient.created_at else None
    }
