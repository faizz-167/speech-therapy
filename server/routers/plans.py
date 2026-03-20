from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from typing import List
import uuid
from pydantic import BaseModel

from database import get_db
from models.workflow import TherapyPlan, PlanTaskAssignment
from schemas.workflow import TherapyPlanSchema, TherapyPlanCreate, PlanTaskAssignmentSchema

router = APIRouter(prefix="/plans", tags=["Plans"])

@router.post("", response_model=TherapyPlanSchema)
async def create_plan(plan_data: TherapyPlanCreate, db: AsyncSession = Depends(get_db)):
    plan_dict = plan_data.model_dump(exclude={"assignments"})
    from datetime import datetime
    
    # default status is draft
    new_plan = TherapyPlan(**plan_dict, status="draft")
    db.add(new_plan)
    await db.flush() # get plan_id
    
    for assign in plan_data.assignments:
        new_assign = PlanTaskAssignment(
            plan_id=new_plan.plan_id,
            task_id=assign.task_id,
            therapist_id=assign.therapist_id,
            status="pending",
            clinical_rationale=assign.clinical_rationale,
            assigned_on=datetime.utcnow()
        )
        db.add(new_assign)
        
    await db.commit()
    await db.refresh(new_plan)
    return new_plan

@router.get("/patient/{patient_id}", response_model=List[TherapyPlanSchema])
async def get_patient_plans(patient_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TherapyPlan)
        .where(TherapyPlan.patient_id == patient_id)
        .options(selectinload(TherapyPlan.assignments))
        .order_by(TherapyPlan.start_date.desc().nulls_last())
    )
    return result.scalars().all()

@router.patch("/assignments/{assignment_id}/approve")
async def approve_assignment(assignment_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = (
        update(PlanTaskAssignment)
        .where(PlanTaskAssignment.assignment_id == assignment_id)
        .values(status="approved")
    )
    result = await db.execute(stmt)
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Assignment not found")
    await db.commit()
    return {"message": "Assignment approved"}

@router.patch("/{plan_id}/activate")
async def activate_plan(plan_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = (
        update(TherapyPlan)
        .where(TherapyPlan.plan_id == plan_id)
        .values(status="active")
    )
    result = await db.execute(stmt)
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    await db.commit()
    return {"message": "Plan activated"}

class PlanGenerateRequest(BaseModel):
    approved_task_ids: List[str]

@router.post("/generate", response_model=TherapyPlanSchema)
async def generate_plan(patient_id: uuid.UUID, request: PlanGenerateRequest, db: AsyncSession = Depends(get_db)):
    from datetime import datetime, timedelta
    
    # Find patient therapist
    from models.workflow import Patient
    patient = await db.execute(select(Patient).where(Patient.patient_id == patient_id))
    p = patient.scalar_one_or_none()
    
    new_plan = TherapyPlan(
        patient_id=patient_id,
        therapist_id=p.assigned_therapist_id if p else None,
        start_date=datetime.utcnow().date(),
        end_date=(datetime.utcnow() + timedelta(days=7)).date(),
        status="draft",
        focus_areas=[],
        target_metrics={}
    )
    db.add(new_plan)
    await db.flush()
    
    for t_id in request.approved_task_ids:
        assign = PlanTaskAssignment(
            plan_id=new_plan.plan_id,
            task_id=t_id,
            therapist_id=p.assigned_therapist_id if p else None,
            status="pending",
            assigned_on=datetime.utcnow()
        )
        db.add(assign)
        
    await db.commit()
    # Eager load assignments to return
    result = await db.execute(
        select(TherapyPlan)
        .where(TherapyPlan.plan_id == new_plan.plan_id)
        .options(selectinload(TherapyPlan.assignments))
    )
    return result.scalar_one()
