import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, Numeric, Boolean, DateTime, text
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import relationship
from database import Base

class Session(Base):
    __tablename__ = 'session'

    session_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    plan_id = Column(UUID(as_uuid=True), ForeignKey('therapy_plan.plan_id'))
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patient.patient_id'))
    therapist_id = Column(UUID(as_uuid=True), ForeignKey('therapist.therapist_id'))
    session_date = Column(DateTime(timezone=True))
    duration_minutes = Column(Integer)
    session_type = Column(String)
    session_notes = Column(String)

    plan = relationship("TherapyPlan", back_populates="sessions")
    patient = relationship("Patient", back_populates="sessions")
    attempts = relationship("SessionPromptAttempt", back_populates="session")

class SessionPromptAttempt(Base):
    __tablename__ = 'session_prompt_attempt'

    attempt_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    session_id = Column(UUID(as_uuid=True), ForeignKey('session.session_id'))
    prompt_id = Column(String, ForeignKey('prompt.prompt_id'))
    attempt_number = Column(Integer)
    result = Column(ENUM('pass', 'partial', 'fail', 'skipped', name='attempt_result', create_type=False))
    accuracy_score = Column(Numeric(5, 2))
    response_latency_sec = Column(Integer)
    speech_detected = Column(Boolean)
    asr_transcript = Column(String)
    therapist_override_note = Column(String)
    attempted_at = Column(DateTime(timezone=True))
    
    # AI workflow signals (from alter_v2)
    audio_file_ref = Column(String)
    emotion_label = Column(String)
    behavioral_score = Column(Numeric(5, 2))
    wpm = Column(Numeric(6, 2))
    disfluency_count = Column(Integer)
    phoneme_accuracy = Column(Numeric(5, 2))
    nlp_score = Column(Numeric(5, 2))

    session = relationship("Session", back_populates="attempts")

class PatientTaskProgress(Base):
    __tablename__ = 'patient_task_progress'

    progress_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patient.patient_id'))
    task_id = Column(String, ForeignKey('task.task_id'))
    current_level_id = Column(String, ForeignKey('task_level.level_id'))
    consecutive_passes = Column(Integer, default=0)
    consecutive_fails = Column(Integer, default=0)
    overall_accuracy = Column(Numeric(5, 2))
    last_attempted_at = Column(DateTime(timezone=True))
    
    # Progress tracking flags (from alter_v2)
    clinician_alert = Column(Boolean, default=False)
    progress_delta = Column(Numeric(5, 2))

    patient = relationship("Patient", back_populates="task_progress")
