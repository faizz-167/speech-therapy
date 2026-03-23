from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import List, Optional
import random
import string

from database import get_db
from models.workflow import Therapist, Patient
from models.models import Therapist as OldTherapist
from models.clinical import Defect
from middleware.auth import require_role

router = APIRouter(prefix="/therapist", tags=["Therapist (V3)"])

def generate_code():
    chars = [c for c in string.ascii_uppercase + string.digits if c not in 'O0I1']
    return ''.join(random.choices(chars, k=6))

async def find_therapist(current_user: dict, db: AsyncSession):
    """Look up therapist by email, then by ID, then old schema."""
    therapist = None
    email = current_user.get("email")
    user_id = current_user.get("id")
    if email:
        res = await db.execute(select(Therapist).where(Therapist.email == email))
        therapist = res.scalar_one_or_none()
    if not therapist and user_id:
        res = await db.execute(select(Therapist).where(Therapist.therapist_id == user_id))
        therapist = res.scalar_one_or_none()
    if not therapist and email:
        res = await db.execute(select(OldTherapist).where(OldTherapist.email == email))
        therapist = res.scalar_one_or_none()
    return therapist


# ── Therapist Code ──

@router.get("/code")
async def get_therapist_code(
    current_user: dict = Depends(require_role(["therapist"])),
    db: AsyncSession = Depends(get_db)
):
    therapist = await find_therapist(current_user, db)
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")
        
    if not getattr(therapist, "therapist_code", None):
        for _ in range(5):
            code = generate_code()
            # Check both schemas for uniqueness
            check_v3 = await db.execute(select(Therapist).where(Therapist.therapist_code == code))
            check_old = await db.execute(select(OldTherapist).where(OldTherapist.therapist_code == code))
            if not check_v3.scalar_one_or_none() and not check_old.scalar_one_or_none():
                therapist.therapist_code = code
                await db.commit()
                break
        else:
            raise HTTPException(status_code=500, detail="Could not generate unique therapist code after 5 attempts")
            
    return {"therapist_code": therapist.therapist_code}


@router.post("/code/regenerate")
async def regenerate_therapist_code(
    current_user: dict = Depends(require_role(["therapist"])),
    db: AsyncSession = Depends(get_db)
):
    therapist = await find_therapist(current_user, db)
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")

    for _ in range(5):
        code = generate_code()
        check_v3 = await db.execute(select(Therapist).where(Therapist.therapist_code == code))
        check_old = await db.execute(select(OldTherapist).where(OldTherapist.therapist_code == code))
        if not check_v3.scalar_one_or_none() and not check_old.scalar_one_or_none():
            therapist.therapist_code = code
            await db.commit()
            return {"therapist_code": code}
    raise HTTPException(status_code=500, detail="Could not generate unique code")


# ── Therapist Profile ──

@router.get("/profile")  
async def get_profile(
    current_user: dict = Depends(require_role(["therapist"])),
    db: AsyncSession = Depends(get_db)
):
    therapist = await find_therapist(current_user, db)
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")
        
    t_id = getattr(therapist, "therapist_id", getattr(therapist, "id", ""))
    t_name = getattr(therapist, "full_name", getattr(therapist, "name", ""))
    
    return {
        "therapist_id": str(t_id),
        "name": t_name,
        "email": therapist.email,
        "specialization": therapist.specialization,
        "license_number": getattr(therapist, "license_number", None),
        "therapist_code": therapist.therapist_code,
    }


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None

@router.patch("/profile")
async def update_profile(
    body: ProfileUpdate,
    current_user: dict = Depends(require_role(["therapist"])),
    db: AsyncSession = Depends(get_db)
):
    therapist = await find_therapist(current_user, db)
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")
        
    if body.name:
        if hasattr(therapist, "full_name"):
            therapist.full_name = body.name
        else:
            therapist.name = body.name
    if body.email:
        therapist.email = body.email
    await db.commit()
    return {"status": "updated"}


# ── Therapist Patient Intake ──

class TherapistPatientIntake(BaseModel):
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    email: Optional[str] = None
    pre_assigned_defect_codes: List[str] = []

router_therapists = APIRouter(prefix="/therapists", tags=["Therapists"])

@router_therapists.post("/patients")
async def create_patient_by_therapist(
    data: TherapistPatientIntake,
    current_user: dict = Depends(require_role(["therapist"])),
    db: AsyncSession = Depends(get_db)
):
    # Find the therapist — try email first, fall back to ID from JWT
    therapist_email = current_user.get("email")
    therapist = None
    if therapist_email:
        stmt = select(Therapist).where(Therapist.email == therapist_email)
        res = await db.execute(stmt)
        therapist = res.scalar_one_or_none()
    if not therapist:
        # Fallback: look up by therapist_id (the JWT 'sub' claim)
        therapist_id = current_user.get("id")
        if therapist_id:
            stmt2 = select(Therapist).where(Therapist.therapist_id == therapist_id)
            res2 = await db.execute(stmt2)
            therapist = res2.scalar_one_or_none()
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")

    # Resolve defect codes to IDs
    defect_ids = []
    if data.pre_assigned_defect_codes:
        defects_res = await db.execute(select(Defect).where(Defect.code.in_(data.pre_assigned_defect_codes)))
        defects = defects_res.scalars().all()
        defect_ids = [d.defect_id for d in defects]

    # Calculate DOB from age (approximate)
    from datetime import date, timedelta
    dob = None
    if data.age:
        dob = date.today() - timedelta(days=data.age * 365)

    new_patient = Patient(
        full_name=data.name,
        email=data.email,
        date_of_birth=dob,
        gender=data.gender,
        assigned_therapist_id=therapist.therapist_id,
        pre_assigned_defect_ids=defect_ids if defect_ids else None,
    )
    db.add(new_patient)
    await db.commit()
    await db.refresh(new_patient)

    return {
        "id": str(new_patient.patient_id),
        "patient_id": str(new_patient.patient_id),
        "name": new_patient.full_name,
    }

