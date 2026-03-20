from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
from jose import jwt
import bcrypt

from database import get_db
from models.models import User, Therapist, Patient
from middleware.auth import get_current_user
from config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    pwd_bytes = password.encode('utf-8')
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

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

# --- Request Models ---

class TherapistRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    specialization: str = ""
    clinic: str = ""
    experience: int = 0

class PatientRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    age: int
    language: str = "English"
    gender: str = ""
    therapist_id: str = ""

class LoginRequest(BaseModel):
    email: str
    password: str

# --- Endpoints ---

@router.post("/register/therapist", status_code=201)
async def register_therapist(data: TherapistRegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    stmt = select(User).where(User.email == data.email)
    result = await db.execute(stmt)
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        name=data.name,
        role="therapist"
    )
    db.add(user)
    await db.flush()

    # Create therapist profile
    import uuid
    therapist = Therapist(
        user_id=user.id,
        email=data.email,
        name=data.name,
        specialization=data.specialization,
        clinic=data.clinic,
        experience=data.experience,
        therapist_code=str(uuid.uuid4())[:8].upper()
    )
    db.add(therapist)
    await db.commit()
    await db.refresh(user)
    await db.refresh(therapist)

    token = create_access_token({"sub": user.id, "role": "therapist", "email": user.email, "name": user.name})
    return {"token": token, "user": {"id": user.id, "name": user.name, "role": "therapist", "therapist_id": therapist.id}}

@router.post("/register/patient", status_code=201)
async def register_patient(data: PatientRegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    stmt = select(User).where(User.email == data.email)
    result = await db.execute(stmt)
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Validate therapist_id if provided
    therapist_id = None
    if data.therapist_id:
        t_stmt = select(Therapist).where(Therapist.id == data.therapist_id)
        t_result = await db.execute(t_stmt)
        therapist = t_result.scalars().first()
        if not therapist:
            raise HTTPException(status_code=400, detail="Invalid therapist ID")
        therapist_id = therapist.id

    # Create user
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        name=data.name,
        role="patient"
    )
    db.add(user)
    await db.flush()

    # Check if patient profile already exists (e.g., pre-created by therapist)
    p_stmt = select(Patient).where(Patient.email == data.email)
    p_result = await db.execute(p_stmt)
    existing_patient = p_result.scalars().first()

    if existing_patient:
        existing_patient.user_id = user.id
        existing_patient.name = data.name
        existing_patient.age = data.age
        if data.gender: existing_patient.gender = data.gender
        if data.language: existing_patient.language = data.language
        existing_patient.category = "adult" if data.age >= 18 else "child"
        if therapist_id and not existing_patient.therapist_id:
            existing_patient.therapist_id = therapist_id
        patient = existing_patient
    else:
        # Create new patient profile
        patient = Patient(
            user_id=user.id,
            therapist_id=therapist_id,
            email=data.email,
            name=data.name,
            age=data.age,
            gender=data.gender,
            language=data.language,
            category="adult" if data.age >= 18 else "child"
        )
        db.add(patient)
    
    await db.commit()
    await db.refresh(user)
    await db.refresh(patient)

    token = create_access_token({"sub": user.id, "role": "patient", "email": user.email, "name": user.name})
    return {"token": token, "user": {"id": user.id, "name": user.name, "role": "patient", "patient_id": patient.id}}

@router.post("/login")
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == data.email)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": user.id, "role": user.role, "email": user.email, "name": user.name})
    
    # Get profile id
    profile_id = None
    if user.role == "therapist":
        t_stmt = select(Therapist).where(Therapist.user_id == user.id)
        t_result = await db.execute(t_stmt)
        t = t_result.scalars().first()
        profile_id = t.id if t else None
    elif user.role == "patient":
        p_stmt = select(Patient).where(Patient.user_id == user.id)
        p_result = await db.execute(p_stmt)
        p = p_result.scalars().first()
        profile_id = p.id if p else None

    return {
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "profile_id": profile_id
        }
    }

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.id == current_user["id"])
    result = await db.execute(stmt)
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = None
    if user.role == "therapist":
        t_stmt = select(Therapist).where(Therapist.user_id == user.id)
        t_result = await db.execute(t_stmt)
        t = t_result.scalars().first()
        if t:
            profile = {
                "therapist_id": t.id,
                "specialization": t.specialization,
                "clinic": t.clinic,
                "experience": t.experience,
                "therapist_code": t.therapist_code
            }
    elif user.role == "patient":
        p_stmt = select(Patient).where(Patient.user_id == user.id)
        p_result = await db.execute(p_stmt)
        p = p_result.scalars().first()
        if p:
            profile = {
                "patient_id": p.id,
                "age": p.age,
                "gender": p.gender,
                "language": p.language,
                "severity": p.severity,
                "therapist_id": p.therapist_id
            }

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "profile": profile
    }
