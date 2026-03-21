from sqlalchemy import Column, String, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base

class Defect(Base):
    __tablename__ = 'defect'

    defect_id = Column(String, primary_key=True)
    code = Column(String, nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    description = Column(String)

    # relationships
    baseline_mappings = relationship("BaselineDefectMapping", back_populates="defect")
    task_mappings = relationship("TaskDefectMapping", back_populates="defect")

class BaselineAssessment(Base):
    __tablename__ = 'baseline_assessment'

    baseline_id = Column(String, primary_key=True)
    code = Column(String, nullable=False)
    name = Column(String, nullable=False)
    domain = Column(String, nullable=False)
    description = Column(String)
    administration_method = Column(String)
    created_at = Column(String)

    # relationships
    sections = relationship("BaselineSection", back_populates="assessment", order_by="BaselineSection.order_index")
    defect_mappings = relationship("BaselineDefectMapping", back_populates="assessment")

class BaselineDefectMapping(Base):
    __tablename__ = 'baseline_defect_mapping'

    mapping_id = Column(String, primary_key=True)
    baseline_id = Column(String, ForeignKey('baseline_assessment.baseline_id'))
    defect_id = Column(String, ForeignKey('defect.defect_id'))
    relevance_level = Column(String)
    clinical_notes = Column(String)

    assessment = relationship("BaselineAssessment", back_populates="defect_mappings")
    defect = relationship("Defect", back_populates="baseline_mappings")

class BaselineSection(Base):
    __tablename__ = 'baseline_section'

    section_id = Column(String, primary_key=True)
    baseline_id = Column(String, ForeignKey('baseline_assessment.baseline_id'))
    section_name = Column(String, nullable=False)
    instructions = Column(String)
    target_defect_id = Column(String, ForeignKey('defect.defect_id'))
    order_index = Column(Integer, nullable=False)

    assessment = relationship("BaselineAssessment", back_populates="sections")
    items = relationship("BaselineItem", back_populates="section", order_by="BaselineItem.order_index")

class BaselineItem(Base):
    __tablename__ = 'baseline_item'

    item_id = Column(String, primary_key=True)
    section_id = Column(String, ForeignKey('baseline_section.section_id'), nullable=False)
    order_index = Column(Integer, nullable=False)
    task_name = Column(String, nullable=False)
    instruction = Column(String, nullable=False)
    display_content = Column(String, nullable=False)
    response_type = Column(String, nullable=False)
    expected_output = Column(String, nullable=False)
    target_phoneme = Column(String)
    image_keyword = Column(String)
    scoring_method = Column(String, nullable=False)
    max_score = Column(Integer, nullable=False)
    scope = Column(String, nullable=False)
    formula_mode = Column(String, nullable=False)
    reference_text = Column(JSON)
    wpm_range = Column(JSON, nullable=False)
    formula_weights = Column(JSON, nullable=False)
    fusion_weights = Column(JSON, nullable=False)
    defect_codes = Column(JSON, nullable=False)
    defect_phoneme_focus = Column(JSON)

    section = relationship("BaselineSection", back_populates="items")
