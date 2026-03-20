from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class TherapistBase(BaseModel):
    name: str = ""
    clinic: str = ""
    specialization: str = ""
    experience: int = 0

class TherapistCreate(TherapistBase):
    pass

class TherapistResponse(TherapistBase):
    id: str
    clerk_id: str
    email: str
    referral_code: str

    class Config:
        from_attributes = True

class PatientBase(BaseModel):
    name: str = ""
    age: int = 0
    gender: str = ""
    language: str = "English"
    diagnosis: str = ""
    category: str = "child" # child or adult
    selected_defects: List[str] = []

class PatientCreate(PatientBase):
    referral_code: str

class PatientResponse(PatientBase):
    id: str
    clerk_id: str
    therapist_id: str
    email: str

    class Config:
        from_attributes = True

# Add more schemas as needed for remaining tables
