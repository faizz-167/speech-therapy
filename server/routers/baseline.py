from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from database import get_db
from models.clinical import BaselineAssessment, BaselineSection, BaselineItem
from schemas.clinical import BaselineAssessmentSchema, BaselineSectionSchema, BaselineItemSchema

router = APIRouter(prefix="/baselines", tags=["Baselines"])

@router.get("", response_model=List[BaselineAssessmentSchema])
async def get_baselines(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BaselineAssessment).order_by(BaselineAssessment.code))
    return result.scalars().all()

@router.get("/{baseline_id}/sections", response_model=List[BaselineSectionSchema])
async def get_baseline_sections(baseline_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(BaselineSection)
        .where(BaselineSection.baseline_id == baseline_id)
        .options(selectinload(BaselineSection.items))
        .order_by(BaselineSection.order_index)
    )
    sections = result.scalars().all()
    if not sections:
        raise HTTPException(status_code=404, detail="No sections found for this baseline")
    return sections
