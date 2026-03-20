from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from database import get_db
from models.models import TherapyPlan, Patient, Therapist, BaselineResult, TherapyTask, DailyTask
from middleware.auth import require_role
from services.therapy_engine import generate_therapy_plan

router = APIRouter(prefix="/plans", tags=["Therapy Plans"])

class PlanGenerateRequest(BaseModel):
    approved_task_ids: List[str] = []

@router.post("/generate")
async def generate_plan(
    patient_id: str,
    data: PlanGenerateRequest,
    current_user: dict = Depends(require_role(["therapist"])),
    db: AsyncSession = Depends(get_db)
):
    """AI generates a weekly therapy plan based on baseline + diagnosis + task library."""
    # Get patient
    p_stmt = select(Patient).where(Patient.id == patient_id)
    p_result = await db.execute(p_stmt)
    patient = p_result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get baseline
    b_stmt = select(BaselineResult).where(BaselineResult.patient_id == patient_id)
    b_result = await db.execute(b_stmt)
    baseline = b_result.scalars().first()
    
    # Get therapist
    th_stmt = select(Therapist).where(Therapist.user_id == current_user["id"])
    th_result = await db.execute(th_stmt)
    therapist = th_result.scalars().first()
    
    # Generate plan using AI engine with deterministic logic
    plan_data, reasoning = generate_therapy_plan(patient, baseline, data.approved_task_ids)
    
    # Create plan
    plan = TherapyPlan(
        patient_id=patient_id,
        therapist_id=therapist.id if therapist else None,
        week_start=datetime.utcnow(),
        plan_data=plan_data,
        status="pending",
        ai_reasoning=reasoning
    )
    db.add(plan)
    await db.flush()
    
    # Create daily tasks from plan
    for i, task_item in enumerate(plan_data):
        daily = DailyTask(
            plan_id=plan.id,
            patient_id=patient_id,
            therapy_task_id=str(task_item.get("therapy_task_id", "")),
            day_number=task_item.get("day", (i % 7) + 1),
            task_name=task_item.get("task_name", ""),
            task_data=task_item,
            task_type=task_item.get("category", "") or task_item.get("interaction_type", "") or task_item.get("task_type", ""),
            prompts=task_item.get("prompts", []),
            difficulty=task_item.get("difficulty", "medium"),
            repetitions=task_item.get("repetitions", 3),
            reason=task_item.get("reason", ""),
            status="pending"
        )
        db.add(daily)
    
    await db.commit()
    await db.refresh(plan)
    
    return {
        "id": plan.id,
        "status": plan.status,
        "plan_data": plan.plan_data,
        "ai_reasoning": plan.ai_reasoning,
        "created_at": str(plan.created_at)
    }

@router.get("/{plan_id}")
async def get_plan(
    plan_id: str,
    current_user: dict = Depends(require_role(["therapist", "patient"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(TherapyPlan).where(TherapyPlan.id == plan_id)
    result = await db.execute(stmt)
    plan = result.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Get daily tasks
    dt_stmt = select(DailyTask).where(DailyTask.plan_id == plan_id).order_by(DailyTask.day_number)
    dt_result = await db.execute(dt_stmt)
    daily_tasks = dt_result.scalars().all()
    
    return {
        "id": plan.id,
        "patient_id": plan.patient_id,
        "status": plan.status,
        "plan_data": plan.plan_data,
        "ai_reasoning": plan.ai_reasoning,
        "therapist_feedback": plan.therapist_feedback,
        "created_at": str(plan.created_at),
        "daily_tasks": [
            {
                "id": dt.id,
                "day_number": dt.day_number,
                "task_name": dt.task_name,
                "difficulty": dt.difficulty,
                "repetitions": dt.repetitions,
                "reason": dt.reason,
                "status": dt.status
            }
            for dt in daily_tasks
        ]
    }

@router.get("/patient/{patient_id}")
async def get_patient_plans(
    patient_id: str,
    current_user: dict = Depends(require_role(["therapist", "patient"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(TherapyPlan).where(TherapyPlan.patient_id == patient_id).order_by(TherapyPlan.created_at.desc())
    result = await db.execute(stmt)
    plans = result.scalars().all()
    return [
        {
            "id": p.id,
            "status": p.status,
            "week_start": str(p.week_start) if p.week_start else None,
            "created_at": str(p.created_at),
            "task_count": len(p.plan_data) if p.plan_data else 0
        }
        for p in plans
    ]

class PlanEditRequest(BaseModel):
    plan_data: Optional[list] = None
    therapist_feedback: Optional[str] = None

@router.put("/{plan_id}/approve")
async def approve_plan(
    plan_id: str,
    current_user: dict = Depends(require_role(["therapist"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(TherapyPlan).where(TherapyPlan.id == plan_id)
    result = await db.execute(stmt)
    plan = result.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan.status = "approved"
    await db.commit()
    return {"message": "Plan approved", "status": "approved"}

@router.put("/{plan_id}/reject")
async def reject_plan(
    plan_id: str,
    data: PlanEditRequest,
    current_user: dict = Depends(require_role(["therapist"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(TherapyPlan).where(TherapyPlan.id == plan_id)
    result = await db.execute(stmt)
    plan = result.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan.status = "rejected"
    if data.therapist_feedback:
        plan.therapist_feedback = data.therapist_feedback
    await db.commit()
    return {"message": "Plan rejected", "status": "rejected"}

@router.delete("/{plan_id}")
async def delete_plan(
    plan_id: str,
    current_user: dict = Depends(require_role(["therapist"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(TherapyPlan).where(TherapyPlan.id == plan_id)
    result = await db.execute(stmt)
    plan = result.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    await db.delete(plan)
    await db.commit()
    return {"message": "Plan deleted"}

@router.put("/{plan_id}/edit")
async def edit_plan(
    plan_id: str,
    data: PlanEditRequest,
    current_user: dict = Depends(require_role(["therapist"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(TherapyPlan).where(TherapyPlan.id == plan_id)
    result = await db.execute(stmt)
    plan = result.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    if data.plan_data is not None:
        plan.plan_data = data.plan_data
        # Update daily tasks
        del_stmt = select(DailyTask).where(DailyTask.plan_id == plan_id)
        del_result = await db.execute(del_stmt)
        for old in del_result.scalars().all():
            await db.delete(old)
        
        for i, task_item in enumerate(data.plan_data):
            daily = DailyTask(
                plan_id=plan.id,
                patient_id=plan.patient_id,
                therapy_task_id=str(task_item.get("therapy_task_id", "")),
                day_number=task_item.get("day", (i % 7) + 1),
                task_name=task_item.get("task_name", ""),
                task_data=task_item,
                task_type=task_item.get("category", "") or task_item.get("interaction_type", "") or task_item.get("task_type", ""),
                prompts=task_item.get("prompts", []),
                difficulty=task_item.get("difficulty", "medium"),
                repetitions=task_item.get("repetitions", 3),
                reason=task_item.get("reason", ""),
                status="pending"
            )
            db.add(daily)
    
    if data.therapist_feedback:
        plan.therapist_feedback = data.therapist_feedback
    
    await db.commit()
    return {"message": "Plan updated"}
