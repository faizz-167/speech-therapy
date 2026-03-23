from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta, date
from jose import jwt
import bcrypt
import uuid

from database import get_db
from models.workflow import Therapist, Patient
from config import settings

router = APIRouter(prefix="/auth", tags=["Auth V3"])

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

class TherapistRegisterV3(BaseModel):
    name: str
    email: EmailStr
    password: str
    years_of_experience: Optional[int] = 0

class PatientRegisterV3(BaseModel):
    name: str
    age: int
    gender: str
    email: EmailStr
    password: str
    therapist_code: str

class LoginRequestV3(BaseModel):
    email: EmailStr
    password: str

@router.post("/therapist/register", status_code=201)
async def register_therapist(data: TherapistRegisterV3, db: AsyncSession = Depends(get_db)):
    stmt = select(Therapist).where(Therapist.email == data.email)
    result = await db.execute(stmt)
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    therapist = Therapist(
        full_name=data.name,
        email=data.email,
        license_number=f"LIC-{str(uuid.uuid4()).replace('-', '')[:8].upper()}",
        therapist_code=str(uuid.uuid4()).replace('-', '')[:6].upper(),
        password_hash=hash_password(data.password),
        role="therapist",
        years_of_experience=data.years_of_experience
    )
    db.add(therapist)
    await db.commit()
    await db.refresh(therapist)

    token = create_access_token({"sub": str(therapist.therapist_id), "role": "therapist", "name": therapist.full_name, "email": therapist.email})
    return {"token": token, "user": {"id": str(therapist.therapist_id), "role": "therapist", "name": therapist.full_name}}

@router.post("/therapist/login")
async def login_therapist(data: LoginRequestV3, db: AsyncSession = Depends(get_db)):
    stmt = select(Therapist).where(Therapist.email == data.email)
    result = await db.execute(stmt)
    therapist = result.scalars().first()

    if not therapist or not therapist.password_hash or not verify_password(data.password, therapist.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(therapist.therapist_id), "role": therapist.role, "name": therapist.full_name, "email": therapist.email})
    return {"token": token, "user": {"id": str(therapist.therapist_id), "role": therapist.role, "name": therapist.full_name}}

@router.post("/patient/register", status_code=201)
async def register_patient(data: PatientRegisterV3, db: AsyncSession = Depends(get_db)):
    # 1. Look up therapist by code
    stmt = select(Therapist).where(Therapist.therapist_code == data.therapist_code)
    result = await db.execute(stmt)
    therapist = result.scalars().first()
    if not therapist:
        raise HTTPException(status_code=400, detail="Therapist code not recognised. Please check with your therapist.")

    # 2. Check if patient exists by email
    stmt_p = select(Patient).where(Patient.email == data.email)
    res_p = await db.execute(stmt_p)
    patient = res_p.scalars().first()

    if patient:
        if patient.assigned_therapist_id != therapist.therapist_id:
            raise HTTPException(status_code=400, detail="Email already linked to another therapist.")
        
        # Activate patient record
        patient.password_hash = hash_password(data.password)
        patient.role = "patient"
    else:
        # Note: If date_of_birth is strictly required by the legacy DB, we supply a dummy value matching age if possible,
        # but the prompt says they provide age. Patient table in V3 expects date_of_birth DATE NOT NULL.
        # We'll compute a rough dob
        computed_dob = date.today().replace(year=date.today().year - data.age)
        
        patient = Patient(
            full_name=data.name,
            email=data.email,
            password_hash=hash_password(data.password),
            date_of_birth=computed_dob,
            age=data.age,
            gender=data.gender,
            role="patient",
            assigned_therapist_id=therapist.therapist_id
        )
        db.add(patient)
    
    await db.commit()
    await db.refresh(patient)

    token = create_access_token({"sub": str(patient.patient_id), "role": "patient", "name": patient.full_name, "email": patient.email})
    return {"token": token, "user": {"id": str(patient.patient_id), "role": "patient", "name": patient.full_name}}

@router.post("/patient/login")
async def login_patient(data: LoginRequestV3, db: AsyncSession = Depends(get_db)):
    stmt = select(Patient).where(Patient.email == data.email)
    result = await db.execute(stmt)
    patient = result.scalars().first()

    if not patient or not patient.password_hash or not verify_password(data.password, patient.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(patient.patient_id), "role": patient.role, "name": patient.full_name, "email": patient.email})
    return {"token": token, "user": {"id": str(patient.patient_id), "role": patient.role, "name": patient.full_name}}
