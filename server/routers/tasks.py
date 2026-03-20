from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from database import get_db
from models.tasks import Task, TaskLevel, Prompt
from schemas.tasks import TaskSchema, LevelSchema

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.get("", response_model=List[TaskSchema])
async def get_tasks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Task).options(selectinload(Task.levels)).order_by(Task.source_id)
    )
    return result.scalars().unique().all()

@router.get("/{task_id}/levels", response_model=List[LevelSchema])
async def get_task_levels(task_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TaskLevel)
        .where(TaskLevel.task_id == task_id)
        .order_by(TaskLevel.difficulty_score)
    )
    levels = result.scalars().all()
    if not levels:
        raise HTTPException(status_code=404, detail="Task levels not found")
    return levels
