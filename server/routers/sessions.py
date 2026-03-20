from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from fastapi import UploadFile, File, Form
from typing import List
import uuid
import os
import asyncio

from database import get_db
from models.session import Session, PatientTaskProgress, SessionPromptAttempt
from models.workflow import TherapyPlan, PlanTaskAssignment, Patient
from models.tasks import Task, TaskLevel, Prompt, SpeechTarget, EvaluationTarget, FeedbackRule, AdaptiveThreshold, PromptScoring
from schemas.session import SessionSchema, SessionCreate, SessionPromptAttemptSchema
from schemas.tasks import PromptQueueSchema

from services.audio_service import audio_service
from services.asr_service import asr_service
from services.ser_service import ser_service
from services.phoneme_service import phoneme_service
from services.nlp_service import nlp_service
from services.analysis_service import analysis_service

router = APIRouter(prefix="/sessions", tags=["Sessions"])

@router.post("", response_model=SessionSchema)
async def create_session(session_data: SessionCreate, db: AsyncSession = Depends(get_db)):
    from datetime import datetime
    new_session = Session(
        **session_data.model_dump(),
        session_date=datetime.utcnow()
    )
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)
    return new_session

@router.get("/{session_id}/queue", response_model=List[PromptQueueSchema])
async def get_session_queue(session_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    # 1. Fetch Session and find Plan ID + Patient ID
    res = await db.execute(select(Session).where(Session.session_id == session_id))
    session_obj = res.scalar_one_or_none()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")
        
    plan_id = session_obj.plan_id
    patient_id = session_obj.patient_id
    
    # 2. Find assigned tasks for this plan
    assign_res = await db.execute(
        select(PlanTaskAssignment)
        .where(PlanTaskAssignment.plan_id == plan_id)
        .where(PlanTaskAssignment.status.in_(["approved", "active"]))
    )
    assignments = assign_res.scalars().all()
    if not assignments:
        return []

    # 3. For each task, check patient_task_progress or fallback to lowest level
    results = []
    
    for assign in assignments:
        task_id = assign.task_id
        
        prog_res = await db.execute(
            select(PatientTaskProgress)
            .where(PatientTaskProgress.patient_id == patient_id)
            .where(PatientTaskProgress.task_id == task_id)
        )
        progress = prog_res.scalar_one_or_none()
        
        target_level_id = None
        if progress and progress.current_level_id:
            target_level_id = progress.current_level_id
        else:
            # Fallback to easy level (lowest difficulty)
            level_res = await db.execute(
                select(TaskLevel)
                .where(TaskLevel.task_id == task_id)
                .order_by(TaskLevel.difficulty_score.asc())
                .limit(1)
            )
            level_obj = level_res.scalar_one_or_none()
            if level_obj:
                target_level_id = level_obj.level_id
                
        if target_level_id:
            # Fetch prompts for this target level
            prompts_res = await db.execute(
                select(Prompt)
                .options(
                    selectinload(Prompt.speech_target),
                    selectinload(Prompt.evaluation_target),
                    selectinload(Prompt.feedback_rule),
                    selectinload(Prompt.prompt_scoring).selectinload(PromptScoring.adaptive_threshold)
                )
                .where(Prompt.level_id == target_level_id)
            )
            prompts = prompts_res.scalars().all()
            
            for p in prompts:
                # Structure the response
                schema_dict = {
                    "prompt_id": p.prompt_id,
                    "source_prompt_id": p.source_prompt_id,
                    "prompt_type": p.prompt_type,
                    "task_mode": p.task_mode,
                    "display_content": p.display_content,
                    "instruction": p.instruction,
                    "scenario_context": p.scenario_context,
                    "speech_target": p.speech_target,
                    "evaluation_target": p.evaluation_target,
                    "feedback_rule": p.feedback_rule,
                    "adaptive_threshold": p.prompt_scoring.adaptive_threshold if getattr(p, 'prompt_scoring', None) else None
                }
                results.append(PromptQueueSchema(**schema_dict))
                
    return results

@router.post("/{session_id}/prompts/{prompt_id}/submit", response_model=SessionPromptAttemptSchema)
async def submit_attempt(
    session_id: uuid.UUID,
    prompt_id: str,
    audio: UploadFile = File(...),
    attempt_number: int = Form(1),
    db: AsyncSession = Depends(get_db)
):
    # 1. Validate Session & Plan -> Patient
    session_res = await db.execute(select(Session).where(Session.session_id == session_id))
    sess = session_res.scalar_one_or_none()
    if not sess: raise HTTPException(status_code=404, detail="Session not found")
    
    patient_res = await db.execute(select(Patient).where(Patient.patient_id == sess.patient_id))
    patient = patient_res.scalar_one_or_none()
    
    # 2. Extract specific Prompt config for scoring rules
    prompt_res = await db.execute(
        select(Prompt)
        .options(
            selectinload(Prompt.speech_target),
            selectinload(Prompt.evaluation_target),
            selectinload(Prompt.feedback_rule),
            selectinload(Prompt.prompt_scoring).selectinload(PromptScoring.adaptive_threshold)
        )
        .where(Prompt.prompt_id == prompt_id)
    )
    prompt_obj = prompt_res.scalar_one_or_none()
    if not prompt_obj: raise HTTPException(status_code=404, detail="Prompt not found")
    
    task_mode = prompt_obj.task_mode
    # Expected target text
    st = prompt_obj.speech_target.raw_speech_target if prompt_obj.speech_target else {}
    expected_text = st.get("target_response", "") or st.get("expected_response", "") or prompt_obj.display_content or ""
    
    # 3. Handle Audio formatting
    temp_webm = f"uploads/temp_{session_id}_{prompt_id}.webm"
    with open(temp_webm, "wb") as f:
        f.write(await audio.read())
        
    wav_path = None
    try:
        # Check warmup/behavior_only bypass
        is_warmup = prompt_obj.prompt_type == "warmup"
        if is_warmup:
            pass # TODO: simple behavior tracking
            
        wav_path = audio_service.convert_webm_to_wav(temp_webm)
        
        # 4. PARALLEL AI INVOCATION
        asr_task = asyncio.to_thread(asr_service.transcribe, wav_path, task_mode)
        ser_task = asyncio.to_thread(
            ser_service.analyze_emotion, wav_path, "adult", 0.0, attempt_number, False
        )
        
        target_phonemes = prompt_obj.evaluation_target.target_phonemes if getattr(prompt_obj, "evaluation_target", None) else None
        p_mode = "accurate" if task_mode in ("word_drill", "sentence_read") else "fast"
        phoneme_task = asyncio.to_thread(
            phoneme_service.compute_phoneme_accuracy, wav_path, expected_text, p_mode, task_mode, target_phonemes
        )
        
        asr_res, ser_res, pho_res = await asyncio.gather(asr_task, ser_task, phoneme_task)
        
        content_res = None
        if task_mode in ("free_speech", "roleplay"):
            req_els = st.get("required_elements") if st else None
            content_res = await asyncio.to_thread(
                nlp_service.score_content, asr_res.get("text", ""), req_els, task_mode
            )
            
        # 5. Rule Engine / Fusion
        # Need prev progress stats for drop logic
        prog_res = await db.execute(
            select(PatientTaskProgress).where(
                PatientTaskProgress.patient_id == sess.patient_id,
                PatientTaskProgress.task_id == prompt_obj.level.task_id if prompt_obj.level else None
            )
        )
        prog = prog_res.scalar_one_or_none()
        c_pass = prog.consecutive_passes if prog else 0
        c_fail = prog.consecutive_fails if prog else 0
        
        # Format legacy prompt_obj dict for analysis_service backwards compatibility temporarily
        po_dict = {
            "prompt_type": prompt_obj.prompt_type,
            "task_mode": prompt_obj.task_mode,
            "target_response": expected_text,
            "speech_target": prompt_obj.speech_target.raw_speech_target if prompt_obj.speech_target else None,
            "evaluation_target": prompt_obj.evaluation_target.__dict__ if prompt_obj.evaluation_target else None,
            "prompt_scoring": prompt_obj.prompt_scoring.__dict__ if prompt_obj.prompt_scoring else None,
        }
        
        analysis = analysis_service.process_recording(
            expected_text=expected_text,
            asr_result=asr_res,
            ser_result=ser_res,
            phoneme_result=pho_res,
            task_mode=task_mode,
            patient_category="adult",
            prompt_obj=po_dict,
            content_result=content_res,
            baseline_score=None, # implement baseline regression in Phase 4
            consecutive_pass=c_pass,
            consecutive_fail=c_fail
        )
        
        # 6. Save State Record to Database (SessionPromptAttempt)
        attempt = SessionPromptAttempt(
            session_id=session_id,
            prompt_id=prompt_id,
            attempt_number=attempt_number,
            result="pass" if analysis.get("final_score", 0) >= 80 else ("partial" if analysis.get("final_score", 0) >= 55 else "fail"),
            accuracy_score=analysis.get("final_score", 0.0),
            response_latency_sec=0,
            speech_detected=asr_res.get("text", "") != "",
            asr_transcript=asr_res.get("text", ""),
            audio_file_ref=wav_path,
            emotion_label=analysis.get("detected_emotion", "neutral"),
            behavioral_score=analysis.get("engagement_score", 0),
            wpm=analysis.get("speech_rate", 0),
            disfluency_count=0, # temp
            phoneme_accuracy=analysis.get("phoneme_accuracy", 0.0),
            nlp_score=analysis.get("content_score", 0.0)
        )
        db.add(attempt)
        await db.commit()
        await db.refresh(attempt)
        
        # 7. Update PatientTaskProgress
        from datetime import datetime
        task_id = prompt_obj.level.task_id if prompt_obj.level else None
        
        if prog:
            prog.consecutive_passes = analysis.get("consecutive_pass_count", 0)
            prog.consecutive_fails = analysis.get("consecutive_fail_count", 0)
            
            # Smooth overall accuracy
            if prog.overall_accuracy:
                prog.overall_accuracy = float(prog.overall_accuracy) * 0.8 + float(analysis.get("final_score", 0)) * 0.2
            else:
                prog.overall_accuracy = analysis.get("final_score", 0)
                
            prog.last_attempted_at = datetime.utcnow()
            
            # Apply Adaptive Decision: advance / drop
            decision = analysis.get("adaptive_decision", "")
            if decision == "advance" and not prog.clinician_alert:
                next_lvl = await db.execute(
                    select(TaskLevel)
                    .where(TaskLevel.task_id == task_id)
                    .where(TaskLevel.difficulty_score > prompt_obj.level.difficulty_score)
                    .order_by(TaskLevel.difficulty_score.asc())
                    .limit(1)
                )
                nl = next_lvl.scalar_one_or_none()
                if nl: prog.current_level_id = nl.level_id
                
            elif decision in ("drop", "auto_drop"):
                prev_lvl = await db.execute(
                    select(TaskLevel)
                    .where(TaskLevel.task_id == task_id)
                    .where(TaskLevel.difficulty_score < prompt_obj.level.difficulty_score)
                    .order_by(TaskLevel.difficulty_score.desc())
                    .limit(1)
                )
                pl = prev_lvl.scalar_one_or_none()
                if pl: prog.current_level_id = pl.level_id
            
            # Alerts
            if analysis.get("clinician_alert", False):
                prog.clinician_alert = True
            
            if analysis.get("progress_delta", 0) > 0:
                prog.progress_delta = analysis.get("progress_delta")
                
            await db.commit()
        else:
            # Create progress row if missing
            new_prog = PatientTaskProgress(
                patient_id=sess.patient_id,
                task_id=task_id,
                current_level_id=prompt_obj.level_id,
                consecutive_passes=analysis.get("consecutive_pass_count", 0),
                consecutive_fails=analysis.get("consecutive_fail_count", 0),
                overall_accuracy=analysis.get("final_score", 0),
                last_attempted_at=datetime.utcnow(),
                clinician_alert=analysis.get("clinician_alert", False),
                progress_delta=analysis.get("progress_delta", 0)
            )
            db.add(new_prog)
            await db.commit()
        
    finally:
        audio_service.cleanup(temp_webm, wav_path)
