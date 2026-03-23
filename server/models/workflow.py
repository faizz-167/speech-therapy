import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, Numeric, Boolean, Date, DateTime, text
from sqlalchemy.dialects.postgresql import UUID, ENUM, JSONB
from sqlalchemy.orm import relationship
from database import Base

class Therapist(Base):
    __tablename__ = 'therapist'

    therapist_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    full_name = Column(String, nullable=False)
    license_number = Column(String, unique=True)
    specialization = Column(String)
    email = Column(String, unique=True, nullable=False)
    therapist_code = Column(String, unique=True)
    password_hash = Column(String)
    role = Column(String, nullable=False, default='therapist')
    years_of_experience = Column(Integer)

    patients = relationship("Patient", back_populates="therapist")
    therapy_plans = relationship("TherapyPlan", back_populates="therapist")

class Patient(Base):
    __tablename__ = 'patient'

    patient_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    full_name = Column(String, nullable=False)
    email = Column(String)
    age = Column(Integer)
    date_of_birth = Column(Date)
    gender = Column(String)
    primary_diagnosis = Column(String)
    pin_hash = Column(String)
    password_hash = Column(String)
    role = Column(String, nullable=False, default='patient')
    clinical_notes = Column(String)
    pre_assigned_defect_ids = Column(JSONB)
    current_streak = Column(Integer, default=0, nullable=False)
    longest_streak = Column(Integer, default=0, nullable=False)
    assigned_therapist_id = Column(UUID(as_uuid=True), ForeignKey('therapist.therapist_id'))

    therapist = relationship("Therapist", back_populates="patients")
    baseline_results = relationship("PatientBaselineResult", back_populates="patient")
    therapy_plans = relationship("TherapyPlan", back_populates="patient")
    sessions = relationship("Session", back_populates="patient")
    task_progress = relationship("PatientTaskProgress", back_populates="patient")

class PatientBaselineResult(Base):
    __tablename__ = 'patient_baseline_result'

    result_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patient.patient_id'))
    baseline_id = Column(String, ForeignKey('baseline_assessment.baseline_id'))
    therapist_id = Column(UUID(as_uuid=True), ForeignKey('therapist.therapist_id'))
    assessed_on = Column(DateTime)
    raw_score = Column(Integer)
    percentile = Column(Integer)
    severity_rating = Column(String)
    notes = Column(String)

    patient = relationship("Patient", back_populates="baseline_results")
    items = relationship("BaselineItemResult", back_populates="result")

class BaselineItemResult(Base):
    __tablename__ = 'baseline_item_result'

    item_result_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    result_id = Column(UUID(as_uuid=True), ForeignKey('patient_baseline_result.result_id'))
    item_id = Column(String, ForeignKey('baseline_item.item_id'))
    score_given = Column(Integer)
    error_noted = Column(String)
    clinician_note = Column(String)

    result = relationship("PatientBaselineResult", back_populates="items")

class TherapyPlan(Base):
    __tablename__ = 'therapy_plan'

    plan_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patient.patient_id'))
    therapist_id = Column(UUID(as_uuid=True), ForeignKey('therapist.therapist_id'))
    plan_name = Column(String, nullable=False)
    start_date = Column(Date)
    end_date = Column(Date)
    status = Column(ENUM('draft', 'pending', 'active', 'completed', 'paused', 'cancelled', 'expired', name='plan_status', create_type=False))
    goals = Column(String)

    patient = relationship("Patient", back_populates="therapy_plans")
    therapist = relationship("Therapist", back_populates="therapy_plans")
    assignments = relationship("PlanTaskAssignment", back_populates="plan")
    sessions = relationship("Session", back_populates="plan")

class PlanTaskAssignment(Base):
    __tablename__ = 'plan_task_assignment'

    assignment_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    plan_id = Column(UUID(as_uuid=True), ForeignKey('therapy_plan.plan_id'))
    task_id = Column(String, ForeignKey('task.task_id'))
    therapist_id = Column(UUID(as_uuid=True), ForeignKey('therapist.therapist_id'))
    status = Column(ENUM('pending', 'approved', 'active', 'completed', name='assignment_status', create_type=False))
    priority_order = Column(Integer, default=0, nullable=False)
    day_index = Column(Integer, nullable=False, default=1)
    paused = Column(Boolean, default=False, nullable=False)
    clinical_rationale = Column(String)
    assigned_on = Column(DateTime)

    plan = relationship("TherapyPlan", back_populates="assignments")

class SessionEmotionSummary(Base):
    __tablename__ = 'session_emotion_summary'

    summary_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    session_id = Column(UUID(as_uuid=True), ForeignKey('session.session_id', ondelete='CASCADE'), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patient.patient_id', ondelete='CASCADE'), nullable=False)
    session_date = Column(Date, nullable=False)
    dominant_emotion = Column(String)
    avg_frustration = Column(Numeric(4, 3))
    avg_engagement = Column(Numeric(5, 2))
    drop_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, server_default=text("now()"))

    session = relationship("Session")
    patient = relationship("Patient")
