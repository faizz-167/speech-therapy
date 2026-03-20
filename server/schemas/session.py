from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
import uuid

class SessionCreate(BaseModel):
    plan_id: uuid.UUID
    patient_id: uuid.UUID
    therapist_id: uuid.UUID
    session_type: Optional[str] = None
    session_notes: Optional[str] = None

class SessionSchema(SessionCreate):
    session_id: uuid.UUID
    session_date: datetime
    duration_minutes: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class SessionPromptAttemptCreate(BaseModel):
    session_id: uuid.UUID
    prompt_id: str
    attempt_number: Optional[int] = 1
    result: str
    accuracy_score: Optional[float] = None
    response_latency_sec: Optional[int] = None
    speech_detected: Optional[bool] = None
    asr_transcript: Optional[str] = None
    audio_file_ref: Optional[str] = None
    emotion_label: Optional[str] = None
    behavioral_score: Optional[float] = None
    wpm: Optional[float] = None
    disfluency_count: Optional[int] = None
    phoneme_accuracy: Optional[float] = None
    nlp_score: Optional[float] = None

class SessionPromptAttemptSchema(SessionPromptAttemptCreate):
    attempt_id: uuid.UUID
    attempted_at: datetime
    therapist_override_note: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class PatientTaskProgressCreate(BaseModel):
    patient_id: uuid.UUID
    task_id: str
    current_level_id: str

class PatientTaskProgressSchema(PatientTaskProgressCreate):
    progress_id: uuid.UUID
    consecutive_passes: int
    consecutive_fails: int
    overall_accuracy: Optional[float] = None
    last_attempted_at: Optional[datetime] = None
    clinician_alert: bool
    progress_delta: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)
