from pydantic import BaseModel, ConfigDict
from typing import Any, List, Optional

class DefectSchema(BaseModel):
    defect_id: str
    code: str
    name: str
    category: str
    description: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class BaselineItemSchema(BaseModel):
    item_id: str
    order_index: int
    task_name: str
    instruction: str
    display_content: str
    response_type: str
    expected_output: str
    target_phoneme: Optional[str] = None
    image_keyword: Optional[str] = None
    scoring_method: str
    max_score: int
    scope: str
    formula_mode: str
    reference_text: Optional[Any] = None
    wpm_range: dict
    formula_weights: dict
    fusion_weights: dict
    defect_codes: list
    defect_phoneme_focus: Optional[list] = None
    model_config = ConfigDict(from_attributes=True)

class BaselineSectionSchema(BaseModel):
    section_id: str
    section_name: str
    instructions: Optional[str] = None
    target_defect_id: Optional[str] = None
    order_index: int
    items: List[BaselineItemSchema] = []
    model_config = ConfigDict(from_attributes=True)

class BaselineAssessmentSchema(BaseModel):
    baseline_id: str
    code: str
    name: str
    domain: str
    description: Optional[str] = None
    administration_method: Optional[str] = None
    recommended: Optional[bool] = False
    model_config = ConfigDict(from_attributes=True)
