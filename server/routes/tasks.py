from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os
import asyncio

from database import get_db
from models.models import TherapyTask, DailyTask, TaskLog, Patient, TherapyPlan, AudioRecord
from middleware.auth import require_role

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.get("/library")
async def get_task_library(
    age_group: Optional[str] = None,
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    current_user: dict = Depends(require_role(["therapist", "patient"])),
    db: AsyncSession = Depends(get_db)
):
    """Get all therapy tasks from the task library with optional filters."""
    stmt = select(TherapyTask)
    if age_group:
        stmt = stmt.where((TherapyTask.age_group == age_group) | (TherapyTask.age_group == "both"))
    if category:
        stmt = stmt.where(TherapyTask.category == category)
    if difficulty:
        stmt = stmt.where(TherapyTask.difficulty_level == difficulty)
    
    result = await db.execute(stmt)
    tasks = result.scalars().all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "category": t.category,
            "difficulty_level": t.difficulty_level,
            "therapy_goal": t.therapy_goal,
            "description": t.description,
            "age_group": t.age_group,
            "stimuli": t.stimuli,
            "instructions": t.instructions
        }
        for t in tasks
    ]

@router.get("/daily")
async def get_daily_tasks(
    current_user: dict = Depends(require_role(["patient"])),
    db: AsyncSession = Depends(get_db)
):
    """Get today's approved tasks for the patient."""
    p_stmt = select(Patient).where(Patient.user_id == current_user["id"])
    p_result = await db.execute(p_stmt)
    patient = p_result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get active (approved) plan
    plan_stmt = select(TherapyPlan).where(
        TherapyPlan.patient_id == patient.id,
        TherapyPlan.status == "approved"
    ).order_by(TherapyPlan.created_at.desc())
    plan_result = await db.execute(plan_stmt)
    plan = plan_result.scalars().first()
    
    if not plan:
        return []
    
    # Get daily tasks for the current day only (1=Monday...7=Sunday)
    current_day = datetime.now().isoweekday()
    
    dt_stmt = select(DailyTask).where(
        DailyTask.plan_id == plan.id,
        DailyTask.day_number == current_day
    ).order_by(DailyTask.id)
    dt_result = await db.execute(dt_stmt)
    tasks = dt_result.scalars().all()
    
    # Enrich with stimuli from therapy_tasks table
    enriched = []
    for t in tasks:
        task_info = {"id": t.id, "task_name": t.task_name, "difficulty": t.difficulty,
                     "repetitions": t.repetitions, "reason": t.reason, "status": t.status,
                     "day_number": t.day_number, "task_data": t.task_data, "stimuli": [], "instructions": "",
                     "task_type": t.task_type}
        
        # Load associated instructions from legacy TherapyTask (if any)
        if t.therapy_task_id:
            tt_stmt = select(TherapyTask).where(TherapyTask.id == t.therapy_task_id)
            tt_result = await db.execute(tt_stmt)
            tt = tt_result.scalars().first()
            if tt:
                task_info["instructions"] = tt.instructions
                
        # 1. Use the new v3 `prompts` column natively
        if t.prompts and len(t.prompts) > 0:
            task_info["stimuli"] = t.prompts
        
        # 2. Fallback to task_data["prompts"]
        elif t.task_data and "prompts" in t.task_data:
            task_info["stimuli"] = t.task_data["prompts"]
            
        # 3. Fallback to legacy TherapyTask stimuli
        elif tt and tt.stimuli:
            normalized_prompts = []
            for p in tt.stimuli:
                if isinstance(p, dict):
                    text = p.get("prompt_text") or p.get("text") or ""
                    expected = p.get("expected_response") or p.get("expected") or text
                    normalized_prompts.append({"text": text, "expected": expected})
                else:
                    normalized_prompts.append({"text": str(p), "expected": str(p)})
            task_info["stimuli"] = normalized_prompts
                
        # Handle in-progress resumption
        if t.status == "in_progress" and t.task_data:
            task_info["current_prompt_index"] = t.task_data.get("current_prompt_index", 0)
        else:
            task_info["current_prompt_index"] = 0
            
        enriched.append(task_info)
    
    return enriched

class TaskSubmitRequest(BaseModel):
    accuracy_score: float = 0
    fluency_score: float = 0
    emotional_tone_score: float = 0
    score_data: dict = {}
    feedback: str = ""
    attempt_number: int = 1
    transcription: str = ""
    is_final_prompt: bool = False

@router.post("/{task_id}/submit")
async def submit_task(
    task_id: str,
    audio: UploadFile = File(...),
    attempt_number: int = Form(1),
    session_duration: int = Form(0),
    is_final_prompt: bool = Form(False),
    prompt_index: int = Form(0),
    current_user: dict = Depends(require_role(["patient"])),
    db: AsyncSession = Depends(get_db)
):
    """Submit task with audio, transcribe using Whisper, and score with multimodal pipeline."""
    p_stmt = select(Patient).where(Patient.user_id == current_user["id"])
    p_result = await db.execute(p_stmt)
    patient = p_result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get task
    t_stmt = select(DailyTask).where(DailyTask.id == task_id)
    t_result = await db.execute(t_stmt)
    task = t_result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    tt_stmt = select(TherapyTask).where(TherapyTask.id == task.therapy_task_id)
    tt_result = await db.execute(tt_stmt)
    tt = tt_result.scalars().first()
    
    expected_response_type = tt.expected_response_type if tt else "exact_match"
    expected_text = ""
    prompt_obj = None
    
    # 1. Native v3 prompts
    if task.prompts and prompt_index < len(task.prompts):
        prompt_obj = task.prompts[prompt_index]
        expected_text = prompt_obj.get("target_response") or prompt_obj.get("expected_response") or prompt_obj.get("display_content") or ""
    # 2. Legacy task_data prompts
    elif task.task_data and "prompts" in task.task_data and prompt_index < len(task.task_data["prompts"]):
        prompt_obj = task.task_data["prompts"][prompt_index]
        if isinstance(prompt_obj, dict):
            expected_text = prompt_obj.get("expected_response") or prompt_obj.get("expected") or prompt_obj.get("prompt_text") or prompt_obj.get("text") or ""
        else:
            expected_text = str(prompt_obj)
    # 3. Legacy TherapyTask stimuli
    elif tt and tt.stimuli and prompt_index < len(tt.stimuli):
        prompt_obj = tt.stimuli[prompt_index]
        if isinstance(prompt_obj, dict):
            expected_text = prompt_obj.get("expected_response") or prompt_obj.get("expected") or prompt_obj.get("prompt_text") or prompt_obj.get("text") or ""
        else:
            expected_text = str(prompt_obj)

    # Save audio temporarily
    temp_path = f"uploads/temp_{task_id}_{prompt_index}_{patient.id}.webm"
    os.makedirs("uploads", exist_ok=True)
    with open(temp_path, "wb") as f:
        f.write(await audio.read())
        
    try:
        from services.asr_service import asr_service
        from services.ser_service import ser_service
        from services.phoneme_service import phoneme_service
        from services.analysis_service import analysis_service
        from services.nlp_service import nlp_service
        
        # ── Resolve task_mode from prompt or task ────────────────
        task_mode = ""
        prompt_type_val = "exercise"
        if isinstance(prompt_obj, dict):
            task_mode = prompt_obj.get("task_mode", "") or task.task_type or ""
            prompt_type_val = prompt_obj.get("prompt_type", "exercise")
        else:
            task_mode = task.task_type or "sentence_read"

        # ── PARALLEL: Whisper + HuBERT + SpeechBrain ─────────────
        asr_task = asyncio.to_thread(asr_service.transcribe, temp_path, task_mode)
        
        ser_task = asyncio.to_thread(
            ser_service.analyze_emotion, temp_path,
            patient.category or "adult", 0.0, attempt_number, False
        )
        
        # Phoneme: accurate for ref-text tasks, fast otherwise
        phoneme_modes = {"word_drill", "sentence_read", "paragraph_read"}
        p_mode = "accurate" if task_mode in phoneme_modes else "fast"
        target_phonemes = None
        if isinstance(prompt_obj, dict):
            et = prompt_obj.get("evaluation_target", {})
            target_phonemes = et.get("target_phonemes") if isinstance(et, dict) else None

        phoneme_task = asyncio.to_thread(
            phoneme_service.compute_phoneme_accuracy,
            temp_path, expected_text, p_mode, task_mode, target_phonemes
        )
        
        asr_result, ser_result, phoneme_result = await asyncio.gather(
            asr_task, ser_task, phoneme_task
        )
        
        # ── spaCy NLP (free_speech / roleplay only) ──────────────
        content_result = None
        if task_mode in ("free_speech", "roleplay", "debate"):
            required_elements = None
            if isinstance(prompt_obj, dict):
                st = prompt_obj.get("speech_target", {})
                required_elements = st.get("required_elements") if isinstance(st, dict) else None
            
            content_result = await asyncio.to_thread(
                nlp_service.score_content,
                asr_result.get("text", ""),
                required_elements,
                task_mode,
            )
        
        # ── Get consecutive counts from previous logs ────────────
        prev_log_stmt = select(TaskLog).where(
            TaskLog.patient_id == patient.id,
            TaskLog.task_id == task_id,
        ).order_by(TaskLog.completed_at.desc()).limit(1)
        prev_log_result = await db.execute(prev_log_stmt)
        prev_log = prev_log_result.scalars().first()
        
        consecutive_pass = prev_log.consecutive_pass_count if prev_log and prev_log.consecutive_pass_count else 0
        consecutive_fail = prev_log.consecutive_fail_count if prev_log and prev_log.consecutive_fail_count else 0
        
        # ── Get baseline for progress delta ──────────────────────
        from models.models import BaselineResult
        baseline_stmt = select(BaselineResult).where(
            BaselineResult.patient_id == patient.id
        ).order_by(BaselineResult.created_at.desc()).limit(1)
        baseline_result = await db.execute(baseline_stmt)
        baseline = baseline_result.scalars().first()
        baseline_score = baseline.final_score if baseline and baseline.final_score else None
        
        # ── Run Rule Engine ──────────────────────────────────────
        analysis_result = analysis_service.process_recording(
            expected_text=expected_text,
            asr_result=asr_result,
            ser_result=ser_result,
            phoneme_result=phoneme_result,
            task_mode=task_mode,
            patient_category=patient.category or "adult",
            prompt_obj=prompt_obj if isinstance(prompt_obj, dict) else {},
            content_result=content_result,
            baseline_score=baseline_score,
            consecutive_pass=consecutive_pass,
            consecutive_fail=consecutive_fail,
        )
        
        # ── Extract results ──────────────────────────────────────
        word_accuracy = analysis_result.get("word_accuracy", 0)
        phoneme_acc = analysis_result.get("phoneme_accuracy", 0)
        fluency = analysis_result.get("fluency", 0)
        speech_rate = analysis_result.get("speech_rate", 0)
        confidence = analysis_result.get("confidence_score", 0)
        engagement = analysis_result.get("engagement_score", 0)
        articulation = analysis_result.get("articulation_score", 0)
        speech_score = analysis_result.get("speech_score", 0)
        final_score = analysis_result.get("final_score", 0)
        performance_level = analysis_result.get("performance_level", "")
        pause_rate = analysis_result.get("pause_rate", 0)
        transcript_percentage = analysis_result.get("transcript_percentage", 0)
        emotional_label = analysis_result.get("detected_emotion", "neutral")
        transcription = analysis_result.get("transcribed_text", "")
        adaptive_decision = analysis_result.get("adaptive_decision", "")
        feedback_text = analysis_result.get("feedback", "")
        content_score_val = analysis_result.get("content_score", 0.0)
        progress_delta = analysis_result.get("progress_delta", 0.0)
        new_pass = analysis_result.get("consecutive_pass_count", 0)
        new_fail = analysis_result.get("consecutive_fail_count", 0)
        is_frustrated = analysis_result.get("frustration_flag", False)
        clinician_alert = analysis_result.get("clinician_alert", False)

        score_data_full = {
            "transcription": transcription,
            "expected": expected_text,
            "emotion_label": emotional_label,
            "overall_score": final_score,
            "prompt_index": prompt_index,
            "pause_rate": pause_rate,
            "transcript_percentage": transcript_percentage,
            "phoneme_mode": phoneme_result.get("mode", "fast"),
            "phoneme_model": phoneme_result.get("model", ""),
            "adaptive_decision": adaptive_decision,
            "clinician_alert": clinician_alert,
        }

        log = TaskLog(
            task_id=task_id,
            patient_id=patient.id,
            # New AI Workflow Columns
            task_mode=task_mode,
            prompt_id=prompt_index,
            prompt_type=prompt_type_val,
            adaptive_decision=adaptive_decision,
            target_phoneme_results=phoneme_result.get("target_results", {}),
            content_score=content_score_val,
            disfluency_data=analysis_result.get("disfluency_data", {}),
            feedback_text=feedback_text,
            low_confidence_flag=confidence < 40,
            review_recommended=final_score < 60 or clinician_alert,
            progress_delta=progress_delta,
            consecutive_pass_count=new_pass,
            consecutive_fail_count=new_fail,
            frustration_flag=is_frustrated,
            # Legacy Columns
            accuracy_score=word_accuracy,
            fluency_score=fluency,
            emotional_tone_score=engagement,
            word_accuracy=word_accuracy,
            phoneme_accuracy=phoneme_acc,
            speech_rate_score=speech_rate,
            confidence_score=confidence,
            engagement_score=engagement,
            articulation_score=articulation,
            speech_score=speech_score,
            final_score=final_score,
            performance_level=performance_level,
            score_data=score_data_full,
            feedback=feedback_text,
            attempt_number=attempt_number,
            session_duration=session_duration,
        )
        db.add(log)
        
        # ── Adaptive task state ──────────────────────────────────
        should_retry = adaptive_decision in ("stay", "") and final_score < (60 if patient.category == "child" else 80)
        should_break = is_frustrated or session_duration > 600 or adaptive_decision in ("drop", "auto_drop")
        
        if is_final_prompt and not should_retry:
            task.status = "completed"
        else:
            task.status = "in_progress"
            
        if not task.task_data:
            task.task_data = {}
        updated_task_data = dict(task.task_data)
        if not should_retry:
            updated_task_data["current_prompt_index"] = prompt_index + 1
        task.task_data = updated_task_data
        
        await db.commit()
        
        response = {
            "message": "Task submitted successfully",
            "task_status": task.status,
            "should_retry": should_retry,
            "suggest_break": should_break,
            "transcription": transcription,
            # Full metrics
            "word_accuracy": word_accuracy,
            "phoneme_accuracy": phoneme_acc,
            "fluency_score": fluency,
            "speech_rate": speech_rate,
            "confidence_score": confidence,
            "engagement_score": engagement,
            "articulation_score": articulation,
            "speech_score": speech_score,
            "final_score": final_score,
            "performance_level": performance_level,
            "content_score": content_score_val,
            # Adaptive
            "adaptive_decision": adaptive_decision,
            "feedback_text": feedback_text,
            "progress_delta": progress_delta,
            "clinician_alert": clinician_alert,
            # Legacy compat
            "accuracy_score": word_accuracy,
            "emotional_tone_score": engagement,
            "emotion_label": emotional_label,
            "pause_rate": pause_rate,
            "transcript_percentage": transcript_percentage,
        }
        
        if feedback_text:
            response["retry_message"] = feedback_text
        elif should_retry and attempt_number < 3 and not should_break:
            response["retry_message"] = "Needs more practice. Let's try again!"
        elif should_retry and attempt_number >= 3:
            response["retry_message"] = "Let's try another word with a lower difficulty level."
            response["suggest_break"] = True
        elif not should_retry:
            response["retry_message"] = "Great job! Let's move to the next task."
            
        if should_break:
            response["break_message"] = "You're doing your best! Let's lower the difficulty for the next one."
        
        return response
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.get("/history/{patient_id}")
async def get_task_history(
    patient_id: str,
    current_user: dict = Depends(require_role(["therapist", "patient"])),
    db: AsyncSession = Depends(get_db)
):
    """Get task completion history for a patient."""
    stmt = select(TaskLog).where(TaskLog.patient_id == patient_id).order_by(TaskLog.completed_at.desc())
    result = await db.execute(stmt)
    logs = result.scalars().all()
    return [
        {
            "id": l.id,
            "task_id": l.task_id,
            "accuracy_score": l.accuracy_score,
            "fluency_score": l.fluency_score,
            "emotional_tone_score": l.emotional_tone_score,
            "word_accuracy": l.word_accuracy,
            "phoneme_accuracy": l.phoneme_accuracy,
            "speech_rate_score": l.speech_rate_score,
            "engagement_score": l.engagement_score,
            "articulation_score": l.articulation_score,
            "speech_score": l.speech_score,
            "final_score": l.final_score,
            "performance_level": l.performance_level,
            "attempt_number": l.attempt_number,
            "session_duration": l.session_duration,
            "feedback": l.feedback,
            "completed_at": str(l.completed_at)
        }
        for l in logs
    ]
