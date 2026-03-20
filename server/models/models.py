from sqlalchemy import Column, String, Integer, DateTime, JSON, ForeignKey, Text, Float, Boolean, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from sqlalchemy.orm import declarative_base

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

# --- Enums ---
class UserRole(str, enum.Enum):
    therapist = "therapist"
    patient = "patient"
    parent = "parent"

class PlanStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    completed = "completed"

class TaskStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    skipped = "skipped"

# --- 1. Users ---
class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # therapist, patient, parent
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

# --- 2. Therapists ---
class Therapist(Base):
    __tablename__ = "therapists"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    clinic = Column(String)
    specialization = Column(String)
    experience = Column(Integer, default=0)
    therapist_code = Column(String, unique=True, index=True)

    patients = relationship("Patient", back_populates="therapist")
    plans = relationship("TherapyPlan", back_populates="therapist")
    notes = relationship("TherapyNote", back_populates="therapist")

# --- 3. Patients ---
class Patient(Base):
    __tablename__ = "patients"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, index=True)
    therapist_id = Column(String, ForeignKey("therapists.id"), nullable=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    age = Column(Integer)
    gender = Column(String)
    language = Column(String, default="English")
    severity = Column(String, default="moderate")  # mild, moderate, severe
    therapist_notes_text = Column(Text, default="")
    category = Column(String, default="adult")  # child or adult
    selected_defects = Column(JSON, default=list)
    approved_task_ids = Column(JSON, default=list)
    approved_task_categories = Column(JSON, default=list)
    baseline_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    therapist = relationship("Therapist", back_populates="patients")
    baseline = relationship("BaselineResult", back_populates="patient", uselist=False)
    plans = relationship("TherapyPlan", back_populates="patient")
    task_logs = relationship("TaskLog", back_populates="patient")
    audio_records = relationship("AudioRecord", back_populates="patient")

# --- 4. Therapy Tasks (Task Library) ---
class TherapyTask(Base):
    __tablename__ = "therapy_tasks"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)  # articulation, fluency, voice, language, pragmatic
    task_type = Column(String, default="read_aloud")  # read_aloud, minimal_pairs, roleplay, breath_control, etc.
    expected_response_type = Column(String, default="exact_match")  # exact_match, duration, free_speech
    difficulty_level = Column(String, nullable=False)  # easy, medium, hard
    therapy_goal = Column(String)
    description = Column(Text)
    age_group = Column(String, default="adult")  # child, adult, both
    stimuli = Column(JSON, default=list)  # word lists, sentences, etc.
    instructions = Column(Text, default="")

# --- 5. Baseline Tasks (defect-specific, loaded from JSON) ---
class BaselineTask(Base):
    __tablename__ = "baseline_tasks"
    id = Column(String, primary_key=True, default=generate_uuid)
    baseline_id = Column(String, unique=True, nullable=False)       # CB001, AB001
    defect_id = Column(String, nullable=False, index=True)          # CD001, AD001
    age_group = Column(String, nullable=False, index=True)          # child, adult
    assessment_name = Column(String, nullable=False)
    assessment_type = Column(String, nullable=False)                # read_aloud, fluency_exercise, etc.
    tasks = Column(JSON, default=list)                              # [{level, task_name, prompt, evaluation_metric}]
    scoring_criteria = Column(JSON, default=dict)
    defect_detail = Column(JSON, default=dict)
    recommended_tasks = Column(JSON, default=list)

# --- 6. Baseline Results ---
class BaselineResult(Base):
    __tablename__ = "baseline_results"
    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"), unique=True)
    accuracy = Column(Float, default=0)
    fluency = Column(Float, default=0)
    emotional_tone = Column(Float, default=0)
    phoneme_accuracy = Column(Float, default=0)
    speech_rate = Column(Float, default=0)
    engagement_score = Column(Float, default=0)
    speech_score = Column(Float, default=0)
    final_score = Column(Float, default=0)  # v3: overall baseline score
    confidence_score = Column(Float, default=0)  # v3: baseline confidence
    tasks_data = Column(JSON, default=dict)  # per-task breakdown
    completed_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="baseline")

# --- 7. Therapy Plans ---
class TherapyPlan(Base):
    __tablename__ = "therapy_plans"
    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"))
    therapist_id = Column(String, ForeignKey("therapists.id"))
    week_start = Column(DateTime)
    plan_data = Column(JSON, default=list)  # list of task assignments
    status = Column(String, default="pending")  # pending, approved, rejected, completed
    ai_reasoning = Column(Text)
    therapist_feedback = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="plans")
    therapist = relationship("Therapist", back_populates="plans")
    daily_tasks = relationship("DailyTask", back_populates="plan")

# --- 8. Daily Tasks ---
class DailyTask(Base):
    __tablename__ = "daily_tasks"
    id = Column(String, primary_key=True, default=generate_uuid)
    plan_id = Column(String, ForeignKey("therapy_plans.id"))
    patient_id = Column(String, ForeignKey("patients.id"))
    therapy_task_id = Column(String, nullable=True)  # References task_id from JSON mapping files
    day_number = Column(Integer)
    task_name = Column(String)
    task_data = Column(JSON, default=dict)
    task_type = Column(String, default="")  # v3: articulation, fluency, voice, etc.
    prompts = Column(JSON, default=list)  # v3: full prompt objects from selected level
    difficulty = Column(String, default="medium")
    repetitions = Column(Integer, default=3)
    reason = Column(Text, default="")
    status = Column(String, default="pending")  # pending, in_progress, completed, skipped

    plan = relationship("TherapyPlan", back_populates="daily_tasks")
    logs = relationship("TaskLog", back_populates="task")

# --- 9. Task Logs ---
class TaskLog(Base):
    __tablename__ = "task_logs"
    id = Column(String, primary_key=True, default=generate_uuid)
    task_id = Column(String, ForeignKey("daily_tasks.id"))
    patient_id = Column(String, ForeignKey("patients.id"))
    audio_path = Column(String)
    # --- v1 scores (kept for backward compat) ---
    accuracy_score = Column(Float, default=0)    # word accuracy (backward compat)
    fluency_score = Column(Float, default=0)
    emotional_tone_score = Column(Float, default=0)  # engagement (backward compat)
    word_accuracy = Column(Float, default=0)
    phoneme_accuracy = Column(Float, default=0)
    speech_rate_score = Column(Float, default=0)
    confidence_score = Column(Float, default=0)
    engagement_score = Column(Float, default=0)
    articulation_score = Column(Float, default=0)
    speech_score = Column(Float, default=0)
    final_score = Column(Float, default=0)
    performance_level = Column(String, default="")
    score_data = Column(JSON, default=dict)
    feedback = Column(Text)
    attempt_number = Column(Integer, default=1)
    session_duration = Column(Integer, default=0)  # seconds
    completed_at = Column(DateTime, default=datetime.utcnow)
    # --- v3 / ai_workflow columns ---
    task_mode = Column(String, default="")  # word_drill, sentence_read, paragraph_read, free_speech, stuttering, roleplay
    prompt_id = Column(Integer, nullable=True)  # which prompt from the JSON was attempted
    prompt_type = Column(String, default="exercise")  # warmup | exercise
    adaptive_decision = Column(String, default="")  # advance, stay, drop, auto_drop, not_applied
    target_phoneme_results = Column(JSON, default=dict)  # per-word phoneme scoring from HuBERT
    content_score = Column(Float, default=0)  # spaCy NLP: % of required_elements (free_speech/roleplay)
    disfluency_data = Column(JSON, default=dict)  # {repetitions, revisions, interjections, filler_count}
    feedback_text = Column(Text, default="")  # text from feedback_rules.pass/partial/fail
    low_confidence_flag = Column(Boolean, default=False)  # CS < 50
    review_recommended = Column(Boolean, default=False)  # flagged for clinician review
    progress_delta = Column(Float, default=0)  # score vs patient baseline
    consecutive_pass_count = Column(Integer, default=0)  # track consecutive passes (2 → advance)
    consecutive_fail_count = Column(Integer, default=0)  # track consecutive fails (3 → drop)
    frustration_flag = Column(Boolean, default=False)  # frustration > 0.40

    task = relationship("DailyTask", back_populates="logs")
    patient = relationship("Patient", back_populates="task_logs")

# --- 10. Audio Records ---
class AudioRecord(Base):
    __tablename__ = "audio_records"
    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"))
    task_log_id = Column(String, ForeignKey("task_logs.id"), nullable=True)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, default=0)
    duration = Column(Float, default=0)
    mime_type = Column(String, default="audio/webm")
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="audio_records")

# --- 11. Therapy Notes ---
class TherapyNote(Base):
    __tablename__ = "therapy_notes"
    id = Column(String, primary_key=True, default=generate_uuid)
    therapist_id = Column(String, ForeignKey("therapists.id"))
    patient_id = Column(String, ForeignKey("patients.id"))
    note_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    therapist = relationship("Therapist", back_populates="notes")

# --- 12. Adaptive Logic ---
class AdaptiveLogic(Base):
    __tablename__ = "adaptive_logic"
    id = Column(String, primary_key=True, default=generate_uuid)
    age_group = Column(String, nullable=False)
    accuracy_threshold_low = Column(Integer)
    accuracy_threshold_high = Column(Integer)
    max_retries = Column(Integer)
    frustration_action = Column(Text)
    pass_action = Column(Text)
    fail_action = Column(Text)
