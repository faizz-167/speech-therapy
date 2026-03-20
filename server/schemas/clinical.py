from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class DefectSchema(BaseModel):
    defect_id: str
    code: str
    name: str
    category: str
    description: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class BaselineItemSchema(BaseModel):
    item_id: str
    item_label: str
    stimulus_content: Optional[str] = None
    target_phoneme: Optional[str] = None
    position: Optional[str] = None
    response_type: Optional[str] = None
    scoring_method: Optional[str] = None
    max_score: Optional[int] = None
    order_index: int
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
    model_config = ConfigDict(from_attributes=True)
