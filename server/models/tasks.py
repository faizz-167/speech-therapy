from sqlalchemy import Column, String, Integer, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from database import Base

class Task(Base):
    __tablename__ = 'task'

    task_id = Column(String, primary_key=True)
    source_id = Column(Integer, unique=True, nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    description = Column(String)
    created_at = Column(String)

    levels = relationship("TaskLevel", back_populates="task")
    defect_mappings = relationship("TaskDefectMapping", back_populates="task")

class TaskLevel(Base):
    __tablename__ = 'task_level'

    level_id = Column(String, primary_key=True)
    task_id = Column(String, ForeignKey('task.task_id'))
    source_level_id = Column(Integer)
    level_name = Column(String, nullable=False)
    difficulty_score = Column(Integer, nullable=False)

    task = relationship("Task", back_populates="levels")
    prompts = relationship("Prompt", back_populates="level")

class Prompt(Base):
    __tablename__ = 'prompt'

    prompt_id = Column(String, primary_key=True)
    level_id = Column(String, ForeignKey('task_level.level_id'))
    source_prompt_id = Column(Integer, unique=True, nullable=False)
    prompt_type = Column(String, nullable=False)
    scenario_context = Column(String)
    instruction = Column(String)
    display_content = Column(String)
    target_response = Column(String)
    evaluation_criteria = Column(String)
    accuracy_check = Column(String)
    task_mode = Column(String)

    level = relationship("TaskLevel", back_populates="prompts")
    speech_target = relationship("SpeechTarget", uselist=False, back_populates="prompt")
    evaluation_target = relationship("EvaluationTarget", uselist=False, back_populates="prompt")
    prompt_scoring = relationship("PromptScoring", uselist=False, back_populates="prompt")
    feedback_rule = relationship("FeedbackRule", uselist=False, back_populates="prompt")

class SpeechTarget(Base):
    __tablename__ = 'speech_target'

    speech_target_id = Column(String, primary_key=True)
    prompt_id = Column(String, ForeignKey('prompt.prompt_id'), unique=True)
    raw_speech_target = Column(JSON)

    prompt = relationship("Prompt", back_populates="speech_target")

class EvaluationTarget(Base):
    __tablename__ = 'evaluation_target'

    eval_target_id = Column(String, primary_key=True)
    prompt_id = Column(String, ForeignKey('prompt.prompt_id'), unique=True)
    scope = Column(String)
    target_phonemes = Column(JSON)
    check_on_words = Column(JSON)
    substitution_errors = Column(JSON)
    pass_rule = Column(String)
    fail_rule = Column(String)
    partial_pass = Column(String)

    prompt = relationship("Prompt", back_populates="evaluation_target")

class PromptScoring(Base):
    __tablename__ = 'prompt_scoring'

    scoring_id = Column(String, primary_key=True)
    prompt_id = Column(String, ForeignKey('prompt.prompt_id'), unique=True)
    active = Column(Boolean, default=False)
    note = Column(String)
    response_latency_max_sec = Column(Integer)
    minimum_speech_detected = Column(Boolean)
    task_completion_min_percent = Column(Integer)
    layer1_what = Column(String)
    layer1_method = Column(String)
    layer1_pass = Column(String)
    layer2_what = Column(String)
    layer2_method = Column(String)
    layer2_target_pairs = Column(JSON)
    layer2_pass_threshold = Column(Integer)
    layer2_fail_condition = Column(String)

    prompt = relationship("Prompt", back_populates="prompt_scoring")
    adaptive_threshold = relationship("AdaptiveThreshold", uselist=False, back_populates="scoring")

class AdaptiveThreshold(Base):
    __tablename__ = 'adaptive_threshold'

    threshold_id = Column(String, primary_key=True)
    scoring_id = Column(String, ForeignKey('prompt_scoring.scoring_id'), unique=True)
    advance_to_next_level = Column(Integer)
    stay_at_current_level = Column(String)
    drop_to_easier_level = Column(Integer)
    consecutive_to_advance = Column(Integer)
    consecutive_to_drop = Column(Integer)

    scoring = relationship("PromptScoring", back_populates="adaptive_threshold")

class FeedbackRule(Base):
    __tablename__ = 'feedback_rule'

    feedback_id = Column(String, primary_key=True)
    prompt_id = Column(String, ForeignKey('prompt.prompt_id'), unique=True)
    pass_message = Column(String)
    partial_message = Column(String)
    fail_message = Column(String)
    retry_message = Column(String)

    prompt = relationship("Prompt", back_populates="feedback_rule")

class TaskDefectMapping(Base):
    __tablename__ = 'task_defect_mapping'

    mapping_id = Column(String, primary_key=True)
    task_id = Column(String, ForeignKey('task.task_id'))
    defect_id = Column(String, ForeignKey('defect.defect_id'))
    relevance_level = Column(String)
    clinical_notes = Column(String)

    task = relationship("Task", back_populates="defect_mappings")
    defect = relationship("Defect")
