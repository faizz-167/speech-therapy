from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any

class LevelSchema(BaseModel):
    level_id: str
    level_name: str
    difficulty_score: int
    model_config = ConfigDict(from_attributes=True)

class TaskSchema(BaseModel):
    task_id: str
    name: str
    type: str
    description: Optional[str] = None
    levels: List[LevelSchema] = []
    model_config = ConfigDict(from_attributes=True)

class RecommendedTaskSchema(TaskSchema):
    relevance_level: Optional[str] = None
    clinical_notes: Optional[str] = None

class SpeechTargetSchema(BaseModel):
    raw_speech_target: Any
    model_config = ConfigDict(from_attributes=True)

class EvaluationTargetSchema(BaseModel):
    scope: str
    target_phonemes: Any
    check_on_words: Any
    substitution_errors: Any
    pass_rule: str
    fail_rule: str
    partial_pass: str
    model_config = ConfigDict(from_attributes=True)

class FeedbackRuleSchema(BaseModel):
    pass_message: Optional[str]
    partial_message: Optional[str]
    fail_message: Optional[str]
    retry_message: Optional[str]
    model_config = ConfigDict(from_attributes=True)

class AdaptiveThresholdSchema(BaseModel):
    advance_to_next_level: int
    stay_at_current_level: str
    drop_to_easier_level: int
    consecutive_to_advance: int
    consecutive_to_drop: int
    model_config = ConfigDict(from_attributes=True)

class PromptQueueSchema(BaseModel):
    prompt_id: str
    source_prompt_id: int
    prompt_type: str
    task_mode: str
    display_content: Optional[str]
    instruction: Optional[str]
    scenario_context: Optional[str]
    speech_target: Optional[SpeechTargetSchema] = None
    evaluation_target: Optional[EvaluationTargetSchema] = None
    feedback_rule: Optional[FeedbackRuleSchema] = None
    adaptive_threshold: Optional[AdaptiveThresholdSchema] = None
    model_config = ConfigDict(from_attributes=True)
