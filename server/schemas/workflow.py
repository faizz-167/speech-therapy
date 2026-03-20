from pydantic import BaseModel, ConfigDict, EmailStr
from typing import List, Optional
from datetime import date, datetime
import uuid

class TherapistSchema(BaseModel):
    therapist_id: uuid.UUID
    full_name: str
    license_number: Optional[str] = None
    specialization: Optional[str] = None
    email: EmailStr
    model_config = ConfigDict(from_attributes=True)

class PatientCreate(BaseModel):
    full_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    primary_diagnosis: Optional[str] = None
    assigned_therapist_id: Optional[uuid.UUID] = None

class PatientSchema(PatientCreate):
    patient_id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)

class BaselineItemResultCreate(BaseModel):
    item_id: str
    score_given: Optional[int] = None
    error_noted: Optional[str] = None
    clinician_note: Optional[str] = None

class PatientBaselineResultCreate(BaseModel):
    patient_id: uuid.UUID
    baseline_id: str
    therapist_id: uuid.UUID
    raw_score: Optional[int] = None
    percentile: Optional[int] = None
    severity_rating: Optional[str] = None
    notes: Optional[str] = None
    items: List[BaselineItemResultCreate] = []

class BaselineItemResultSchema(BaselineItemResultCreate):
    item_result_id: uuid.UUID
    result_id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)

class PatientBaselineResultSchema(BaseModel):
    result_id: uuid.UUID
    patient_id: uuid.UUID
    baseline_id: str
    therapist_id: uuid.UUID
    assessed_on: datetime
    raw_score: Optional[int] = None
    percentile: Optional[int] = None
    severity_rating: Optional[str] = None
    notes: Optional[str] = None
    items: List[BaselineItemResultSchema] = []
    model_config = ConfigDict(from_attributes=True)

class PlanTaskAssignmentCreate(BaseModel):
    task_id: str
    therapist_id: uuid.UUID
    clinical_rationale: Optional[str] = None

class TherapyPlanCreate(BaseModel):
    patient_id: uuid.UUID
    therapist_id: uuid.UUID
    plan_name: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    goals: Optional[str] = None
    assignments: List[PlanTaskAssignmentCreate] = []

class PlanTaskAssignmentSchema(BaseModel):
    assignment_id: uuid.UUID
    plan_id: uuid.UUID
    task_id: str
    therapist_id: uuid.UUID
    status: str
    clinical_rationale: Optional[str] = None
    assigned_on: datetime
    model_config = ConfigDict(from_attributes=True)

class TherapyPlanSchema(BaseModel):
    plan_id: uuid.UUID
    patient_id: uuid.UUID
    therapist_id: uuid.UUID
    plan_name: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: str
    goals: Optional[str] = None
    assignments: List[PlanTaskAssignmentSchema] = []
    model_config = ConfigDict(from_attributes=True)
