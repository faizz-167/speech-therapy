from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from typing import List, Optional
import uuid
from pydantic import BaseModel
from datetime import date

from database import get_db
from models.workflow import TherapyPlan, PlanTaskAssignment
from schemas.workflow import TherapyPlanSchema, TherapyPlanCreate, PlanTaskAssignmentSchema

router = APIRouter(prefix="/plans", tags=["Plans"])

@router.post("", response_model=TherapyPlanSchema)
async def create_plan(plan_data: TherapyPlanCreate, db: AsyncSession = Depends(get_db)):
    plan_dict = plan_data.model_dump(exclude={"assignments", "generate", "clinical_notes"})
    from datetime import datetime
    
    # default status is draft
    new_plan = TherapyPlan(**plan_dict, status="draft")
    db.add(new_plan)
    await db.flush() # get plan_id
    
    if getattr(plan_data, "generate", False):
        from models.workflow import Patient
        from models.tasks import TaskDefectMapping
        import random
        
        pat_res = await db.execute(select(Patient).where(Patient.patient_id == new_plan.patient_id))
        patient = pat_res.scalar_one_or_none()
        
        if patient and patient.pre_assigned_defect_ids:
            td_res = await db.execute(select(TaskDefectMapping).where(TaskDefectMapping.defect_id.in_(patient.pre_assigned_defect_ids)))
            matched_tasks = list(set([td.task_id for td in td_res.scalars().all()]))
            
            if matched_tasks:
                for day in range(7):
                    daily_tasks = random.sample(matched_tasks, min(3, len(matched_tasks)))
                    for task_id in daily_tasks:
                        assign = PlanTaskAssignment(
                            plan_id=new_plan.plan_id,
                            task_id=task_id,
                            therapist_id=new_plan.therapist_id,
                            status="approved", 
                            assigned_on=datetime.utcnow(),
                            day_index=day
                        )
                        db.add(assign)
    else:
        for assign in plan_data.assignments:
            new_assign = PlanTaskAssignment(
                plan_id=new_plan.plan_id,
                task_id=assign.task_id,
                therapist_id=assign.therapist_id,
                status="pending",
                clinical_rationale=assign.clinical_rationale,
                assigned_on=datetime.utcnow(),
                day_index=getattr(assign, "day_index", 0)
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

@router.get("/{plan_id}/week")
async def get_plan_weekly_schedule(plan_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    from models.tasks import Task
    stmt = (
        select(PlanTaskAssignment, Task)
        .join(Task, PlanTaskAssignment.task_id == Task.task_id)
        .where(PlanTaskAssignment.plan_id == plan_id)
        .order_by(PlanTaskAssignment.day_index.asc(), PlanTaskAssignment.priority_order.asc())
    )
    result = await db.execute(stmt)
    assignments = result.all()
    
    week_plan = {i: [] for i in range(7)}
    for assign, task in assignments:
        idx = assign.day_index if assign.day_index is not None else 0
        if idx not in week_plan:
            week_plan[idx] = []
        week_plan[idx].append({
            "assignment_id": str(assign.assignment_id),
            "task_id": assign.task_id,
            "status": assign.status,
            "clinical_rationale": assign.clinical_rationale,
            "task": {
                "task_name": task.task_name,
                "description": task.description
            }
        })
    return week_plan

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

class PlanUpdateRequest(BaseModel):
    end_date: Optional[date] = None
    status: Optional[str] = None

@router.patch("/{plan_id}", response_model=TherapyPlanSchema)
async def update_plan(plan_id: uuid.UUID, data: PlanUpdateRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(TherapyPlan).where(TherapyPlan.plan_id == plan_id).options(selectinload(TherapyPlan.assignments))
    res = await db.execute(stmt)
    plan = res.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    if data.end_date is not None:
        plan.end_date = data.end_date
    if data.status is not None:
        plan.status = data.status
        
    await db.commit()
    await db.refresh(plan)
    return plan

class AssignmentUpdateRequest(BaseModel):
    priority_order: Optional[int] = None
    paused: Optional[bool] = None

@router.patch("/assignments/{assignment_id}")
async def update_assignment(assignment_id: uuid.UUID, data: AssignmentUpdateRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(PlanTaskAssignment).where(PlanTaskAssignment.assignment_id == assignment_id)
    result = await db.execute(stmt)
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    if data.priority_order is not None:
        assignment.priority_order = data.priority_order
    if data.paused is not None:
        assignment.paused = data.paused
        
    await db.commit()
    return {"message": "Assignment updated"}

from models.session import PatientTaskProgress

@router.delete("/assignments/{assignment_id}")
async def delete_assignment(assignment_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(PlanTaskAssignment).where(PlanTaskAssignment.assignment_id == assignment_id)
    res = await db.execute(stmt)
    assign = res.scalar_one_or_none()
    if not assign:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    plan_stmt = select(TherapyPlan).where(TherapyPlan.plan_id == assign.plan_id)
    plan_res = await db.execute(plan_stmt)
    plan = plan_res.scalar_one_or_none()
    
    if plan:
        ptp_stmt = select(PatientTaskProgress).where(
            PatientTaskProgress.patient_id == plan.patient_id,
            PatientTaskProgress.task_id == assign.task_id,
        )
        ptp_res = await db.execute(ptp_stmt)
        if ptp_res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Cannot delete task assignment, patient has already made progress on it")
            
    await db.delete(assign)
    await db.commit()
    return {"message": "Assignment deleted"}

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


class AddAssignmentRequest(BaseModel):
    task_id: str


@router.post("/{plan_id}/assignments")
async def add_assignment(plan_id: uuid.UUID, request: AddAssignmentRequest, db: AsyncSession = Depends(get_db)):
    """Add a task assignment to an existing therapy plan."""
    from datetime import datetime

    # Check plan exists
    plan_q = await db.execute(select(TherapyPlan).where(TherapyPlan.plan_id == plan_id))
    plan = plan_q.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # Check for duplicate
    dup_q = await db.execute(
        select(PlanTaskAssignment)
        .where(PlanTaskAssignment.plan_id == plan_id, PlanTaskAssignment.task_id == request.task_id)
    )
    if dup_q.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Task already assigned to this plan")

    new_assign = PlanTaskAssignment(
        plan_id=plan_id,
        task_id=request.task_id,
        therapist_id=plan.therapist_id,
        status="pending",
        assigned_on=datetime.utcnow()
    )
    db.add(new_assign)
    await db.commit()
    await db.refresh(new_assign)

    return {
        "assignment_id": str(new_assign.assignment_id),
        "plan_id": str(new_assign.plan_id),
        "task_id": str(new_assign.task_id),
        "status": new_assign.status
    }
