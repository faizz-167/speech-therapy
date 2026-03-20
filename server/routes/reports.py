from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from database import get_db
from models.models import Patient, TaskLog, TherapyPlan, DailyTask, Therapist
from middleware.auth import require_role

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/patient/{patient_id}")
async def get_patient_report(
    patient_id: str,
    current_user: dict = Depends(require_role(["therapist", "patient"])),
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive report for a patient."""
    # Get all task logs
    stmt = select(TaskLog).where(TaskLog.patient_id == patient_id).order_by(TaskLog.completed_at)
    result = await db.execute(stmt)
    logs = result.scalars().all()
    
    if not logs:
        return {
            "patient_id": patient_id,
            "total_sessions": 0,
            "avg_accuracy": 0,
            "avg_fluency": 0,
            "avg_emotional_tone": 0,
            "avg_speech_score": 0,
            "avg_final_score": 0,
            "avg_engagement": 0,
            "avg_phoneme_accuracy": 0,
            "improvement_trend": [],
            "completion_rate": 0
        }
    
    # Calculate metrics
    total = len(logs)
    avg_accuracy = sum(l.accuracy_score for l in logs) / total
    avg_fluency = sum(l.fluency_score for l in logs) / total
    avg_emotional = sum(l.emotional_tone_score for l in logs) / total
    avg_speech_score = sum((l.speech_score or 0) for l in logs) / total
    avg_final_score = sum((l.final_score or 0) for l in logs) / total
    avg_engagement = sum((l.engagement_score or 0) for l in logs) / total
    avg_phoneme = sum((l.phoneme_accuracy or 0) for l in logs) / total
    
    # Group by week for trend
    trend = []
    weekly = {}
    for l in logs:
        if l.completed_at:
            week_key = l.completed_at.strftime("%Y-W%W")
            if week_key not in weekly:
                weekly[week_key] = {
                    "accuracy": [], "fluency": [], "emotional": [],
                    "speech_score": [], "final_score": [], "engagement": []
                }
            weekly[week_key]["accuracy"].append(l.accuracy_score)
            weekly[week_key]["fluency"].append(l.fluency_score)
            weekly[week_key]["emotional"].append(l.emotional_tone_score)
            weekly[week_key]["speech_score"].append(l.speech_score or 0)
            weekly[week_key]["final_score"].append(l.final_score or 0)
            weekly[week_key]["engagement"].append(l.engagement_score or 0)
    
    for week, data in weekly.items():
        trend.append({
            "week": week,
            "avg_accuracy": sum(data["accuracy"]) / len(data["accuracy"]),
            "avg_fluency": sum(data["fluency"]) / len(data["fluency"]),
            "avg_emotional": sum(data["emotional"]) / len(data["emotional"]),
            "avg_speech_score": sum(data["speech_score"]) / len(data["speech_score"]),
            "avg_final_score": sum(data["final_score"]) / len(data["final_score"]),
            "avg_engagement": sum(data["engagement"]) / len(data["engagement"])
        })
    
    # Completion rate
    dt_stmt = select(DailyTask).where(DailyTask.patient_id == patient_id)
    dt_result = await db.execute(dt_stmt)
    all_tasks = dt_result.scalars().all()
    completed_tasks = [t for t in all_tasks if t.status == "completed"]
    completion_rate = (len(completed_tasks) / len(all_tasks) * 100) if all_tasks else 0
    
    return {
        "patient_id": patient_id,
        "total_sessions": total,
        "avg_accuracy": round(avg_accuracy, 1),
        "avg_fluency": round(avg_fluency, 1),
        "avg_emotional_tone": round(avg_emotional, 1),
        "avg_speech_score": round(avg_speech_score, 1),
        "avg_final_score": round(avg_final_score, 1),
        "avg_engagement": round(avg_engagement, 1),
        "avg_phoneme_accuracy": round(avg_phoneme, 1),
        "improvement_trend": trend,
        "completion_rate": round(completion_rate, 1),
        "total_tasks": len(all_tasks),
        "completed_tasks": len(completed_tasks)
    }

@router.get("/therapist/overview")
async def get_therapist_overview(
    current_user: dict = Depends(require_role(["therapist"])),
    db: AsyncSession = Depends(get_db)
):
    """Get aggregated overview for therapist dashboard."""
    t_stmt = select(Therapist).where(Therapist.user_id == current_user["id"])
    t_result = await db.execute(t_stmt)
    therapist = t_result.scalars().first()
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")
    
    # Total patients
    p_stmt = select(func.count()).select_from(Patient).where(Patient.therapist_id == therapist.id)
    p_result = await db.execute(p_stmt)
    total_patients = p_result.scalar()
    
    # Active plans
    plan_stmt = select(func.count()).select_from(TherapyPlan).where(
        TherapyPlan.therapist_id == therapist.id,
        TherapyPlan.status == "approved"
    )
    plan_result = await db.execute(plan_stmt)
    active_plans = plan_result.scalar()
    
    # Pending approvals
    pending_stmt = select(func.count()).select_from(TherapyPlan).where(
        TherapyPlan.therapist_id == therapist.id,
        TherapyPlan.status == "pending"
    )
    pending_result = await db.execute(pending_stmt)
    pending_approvals = pending_result.scalar()
    
    return {
        "total_patients": total_patients,
        "active_plans": active_plans,
        "pending_approvals": pending_approvals
    }
