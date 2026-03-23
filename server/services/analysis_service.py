"""
Component 5 — Rule Engine (Adaptive Intelligence).

Spec: ai_workflow.md §Component 5
Pure Python — no extra install.
Runs after every exercise prompt attempt.

Outputs:
  FinalScore with task-mode specific formula
  Advance / Stay / Drop decision
  Consecutive attempt tracking
  Feedback text from prompt JSON
  Progress delta vs baseline
  Clinician alerts on regression
"""

import re
from difflib import SequenceMatcher


import math

FORMULA_CONFIG = {
    "word_drill": {
        "formula_weights": {"phoneme_accuracy": 0.65, "word_accuracy": 0.25, "confidence_score": 0.10, "fluency_score": 0.00, "speech_rate": 0.00},
        "wpm_range": {"min": 60, "max": 90, "tolerance": 15},
        "fusion_weights": {"speech": 0.95, "engagement": 0.05}
    },
    "sentence_read": {
        "formula_weights": {"phoneme_accuracy": 0.45, "word_accuracy": 0.25, "fluency_score": 0.20, "speech_rate": 0.10, "confidence_score": 0.00},
        "wpm_range": {"min": 80, "max": 100, "tolerance": 15},
        "fusion_weights": {"speech": 0.90, "engagement": 0.10}
    },
    "paragraph_read": {
        "formula_weights": {"phoneme_accuracy": 0.35, "word_accuracy": 0.25, "fluency_score": 0.25, "speech_rate": 0.15, "confidence_score": 0.00},
        "wpm_range": {"min": 130, "max": 150, "tolerance": 20},
        "fusion_weights": {"speech": 0.85, "engagement": 0.15}
    },
    "free_speech": {
        "formula_weights": {"phoneme_accuracy": 0.40, "fluency_score": 0.35, "speech_rate": 0.15, "confidence_score": 0.10, "word_accuracy": 0.00},
        "wpm_range": {"min": 130, "max": 160, "tolerance": 25},
        "fusion_weights": {"speech": 0.75, "engagement": 0.25}
    },
    "stuttering": {
        "formula_weights": {"fluency_score": 0.55, "phoneme_accuracy": 0.25, "speech_rate": 0.20, "word_accuracy": 0.00, "confidence_score": 0.00},
        "wpm_range": {"min": 80, "max": 120, "tolerance": 20},
        "fusion_weights": {"speech": 0.60, "engagement": 0.40}
    },
    "roleplay": {
        "formula_weights": {"phoneme_accuracy": 0.25, "fluency_score": 0.35, "speech_rate": 0.15, "nlp_score": 0.25, "word_accuracy": 0.00},
        "wpm_range": {"min": 110, "max": 150, "tolerance": 25},
        "fusion_weights": {"speech": 0.70, "engagement": 0.30}
    }
}

def _validate_formulas():
    import math
    for mode, config in FORMULA_CONFIG.items():
        fw_sum = sum(config["formula_weights"].values())
        fu_sum = sum(config["fusion_weights"].values())
        assert math.isclose(fw_sum, 1.0), f"Formula weights for {mode} don't sum to 1.0 (sum is {fw_sum})"
        assert math.isclose(fu_sum, 1.0), f"Fusion weights for {mode} don't sum to 1.0 (sum is {fu_sum})"

_validate_formulas()

def get_formula_config(task_mode: str) -> dict:
    if task_mode not in FORMULA_CONFIG:
        raise ValueError(f"Unknown task_mode: {task_mode}")
    return FORMULA_CONFIG[task_mode]

# ── Performance Levels ──────────────────────────────────────────
CHILD_LEVELS = [(85, "Excellent"), (70, "Well Performing"), (50, "Good"), (0, "Needs Improvement")]
ADULT_LEVELS = [(90, "Excellent"), (80, "Well Performing"), (65, "Good"), (0, "Needs Improvement")]


class AnalysisService:
    # ── Text Helpers ────────────────────────────────────────────

    @staticmethod
    def clean_text(text: str) -> str:
        text = text.lower()
        text = re.sub(r'[^\w\s]', '', text)
        return text.strip()

    # ── Individual Metrics ──────────────────────────────────────

    @staticmethod
    def compute_word_accuracy(expected: str, actual: str) -> int:
        if not expected or not actual:
            return 0
        expected_words = AnalysisService.clean_text(expected).split()
        actual_words = AnalysisService.clean_text(actual).split()
        if not expected_words:
            return 0
        matcher = SequenceMatcher(None, expected_words, actual_words)
        correct = sum(block.size for block in matcher.get_matching_blocks())
        return min(100, int((correct / len(expected_words)) * 100))

    @staticmethod
    def compute_fluency(asr_words: list, disfluency_data: dict = None) -> int:
        """Fluency = 100 − pause_penalty − disfluency_penalty."""
        if not asr_words or len(asr_words) < 2:
            return 100

        # Pause penalty
        total_pause = 0.0
        for i in range(1, len(asr_words)):
            prev_ts = asr_words[i - 1].get("timestamp", [0, 0])
            curr_ts = asr_words[i].get("timestamp", [0, 0])
            prev_end = float(prev_ts[1]) if isinstance(prev_ts, (list, tuple)) and len(prev_ts) == 2 else 0.0
            curr_start = float(curr_ts[0]) if isinstance(curr_ts, (list, tuple)) and len(curr_ts) > 0 else 0.0
            gap = curr_start - prev_end
            if gap > 0.5:
                total_pause += gap

        pause_penalty = min(total_pause * 8, 30)

        # Disfluency penalty (fillers, repetitions, revisions)
        disfluency_penalty = 0
        if disfluency_data:
            rate = disfluency_data.get("disfluency_rate", 0)
            disfluency_penalty = min(rate * 50, 20)  # Cap at 20

        return max(0, int(100 - pause_penalty - disfluency_penalty))

    @staticmethod
    def compute_articulation(phoneme_accuracy: int, word_accuracy: int) -> int:
        return int(0.6 * phoneme_accuracy + 0.4 * word_accuracy)

    @staticmethod
    def compute_pause_stats(asr_words: list) -> tuple:
        pauses = 0
        total_pause = 0.0
        word_count = max(1, len(asr_words))
        for i in range(1, len(asr_words)):
            prev_ts = asr_words[i - 1].get("timestamp", [0.0, 0.0])
            curr_ts = asr_words[i].get("timestamp", [0.0, 0.0])
            prev_end = float(prev_ts[1]) if isinstance(prev_ts, (list, tuple)) and len(prev_ts) == 2 else 0.0
            curr_start = float(curr_ts[0]) if isinstance(curr_ts, (list, tuple)) and len(curr_ts) > 0 else 0.0
            gap = curr_start - prev_end
            if gap > 0.5:
                pauses += 1
                total_pause += gap
        return pauses, round(total_pause, 2), round(pauses / word_count, 2)

    @staticmethod
    def classify_performance(final_score: int, patient_category: str = "adult") -> str:
        levels = CHILD_LEVELS if patient_category == "child" else ADULT_LEVELS
        for threshold, label in levels:
            if final_score >= threshold:
                return label
        return "Needs Improvement"

    # ── Main Processing Pipeline ────────────────────────────────

    def process_recording(
        self,
        expected_text: str,
        asr_result: dict,
        ser_result: dict,
        phoneme_result: dict,
        task_mode: str = "sentence_read",
        patient_category: str = "adult",
        prompt_obj: dict = None,
        content_result: dict = None,
        baseline_score: float = None,
        consecutive_pass: int = 0,
        consecutive_fail: int = 0,
    ) -> dict:
        """
        Full multimodal scoring pipeline with task-mode formulas and adaptive logic.

        Args:
            expected_text: Expected text from prompt
            asr_result: Whisper output (text, words, duration, confidence, disfluency_data, speech_rate_data)
            ser_result: SpeechBrain output (engagement_score, frustration_score, etc.)
            phoneme_result: HuBERT output (phoneme_accuracy, target_results, etc.)
            task_mode: Task mode for formula selection
            patient_category: "child" or "adult"
            prompt_obj: Full prompt object from JSON (for adaptive_thresholds, feedback_rules)
            content_result: spaCy NLP output (content_score) for free_speech/roleplay
            baseline_score: Patient's baseline score for progress delta
            consecutive_pass: Current consecutive pass count
            consecutive_fail: Current consecutive fail count
        """
        actual_text = asr_result.get("text", "")
        asr_words = asr_result.get("words", [])
        duration = asr_result.get("duration", 0.0)
        disfluency_data = asr_result.get("disfluency_data", {})
        speech_rate_data = asr_result.get("speech_rate_data", {})
        word_count = max(1, len(asr_words))

        prompt_obj = prompt_obj or {}
        is_warmup = prompt_obj.get("prompt_type", "exercise") == "warmup"

        # ── Core Metrics ────────────────────────────────────────
        # WA — Word Accuracy
        if task_mode in ("free_speech", "roleplay", "debate"):
            word_accuracy = min(100, int(
                self.compute_fluency(asr_words, disfluency_data) * 1.1
            ) - int(self.compute_pause_stats(asr_words)[2] * 10))
        else:
            word_accuracy = self.compute_word_accuracy(expected_text, actual_text)

        # PA — Phoneme Accuracy
        pa_from_ctc = phoneme_result.get("phoneme_accuracy", 0)
        pa_mode = phoneme_result.get("mode", "fast")
        if pa_mode in ("fast", "skipped") or pa_from_ctc == 0:
            phoneme_accuracy = min(100, int(word_accuracy * 1.2))
        else:
            phoneme_accuracy = pa_from_ctc

        # FS — Fluency Score (now with disfluency)
        fluency = self.compute_fluency(asr_words, disfluency_data)

        # SRS — Speech Rate Score (from Whisper)
        speech_rate = speech_rate_data.get("score", 50) if speech_rate_data else 50

        # CS — Confidence Score
        asr_confidence = asr_result.get("confidence", 0.5)
        confidence_score = min(100, int(asr_confidence * 100))

        # Engagement
        engagement = ser_result.get("engagement_score", 70)
        frustration_score = ser_result.get("frustration_score", 0.0)

        # Content Score (for free_speech/roleplay)
        content_score = 0
        if content_result:
            content_score = content_result.get("content_score", 0)

        # Pause stats
        _, _, pause_rate = self.compute_pause_stats(asr_words)

        # Transcript percentage
        if task_mode in ("free_speech", "roleplay", "debate"):
            transcript_percentage = 100 if word_count > 3 else int((word_count / 3.0) * 100)
        else:
            expected_words_len = len(expected_text.split()) if expected_text else 1
            transcript_percentage = int(min((word_count / max(1, expected_words_len)) * 100, 100))

        # ── Speech Score (task-mode formula) ─────────────────────
        source = prompt_obj.get("source", "task")
        
        if source == "baseline":
            # For baselines, backend should explicitly pass the baseline item formula configurations.
            # But baseline evaluation itself is skipped here per Fix 6 instructions (should be natively in `/item-results`)
            # For now, safely fallback or raise for baseline items going through here.
            baseline_formula = prompt_obj.get("formula_weights", {})
            baseline_fusion = prompt_obj.get("fusion_weights", {})
            f_weights = baseline_formula
            fu_weights = baseline_fusion
        else:
            config = get_formula_config(task_mode)
            f_weights = config["formula_weights"]
            fu_weights = config["fusion_weights"]

        metrics = {
            "phoneme_accuracy": phoneme_accuracy, 
            "word_accuracy": word_accuracy, 
            "fluency_score": fluency, 
            "speech_rate": speech_rate, 
            "confidence_score": confidence_score,
            "nlp_score": content_score
        }
        
        speech_score = sum(metrics.get(k, 0) * w for k, w in f_weights.items())

        # Articulation
        articulation = self.compute_articulation(phoneme_accuracy, word_accuracy)

        # ── Multimodal Fusion ────────────────────────────────────
        final_score = (fu_weights.get("speech", 1.0) * speech_score) + (fu_weights.get("engagement", 0.0) * engagement)

        # ── Confidence Gate ──────────────────────────────────────
        low_confidence_flag = False
        review_recommended = False
        
        if confidence_score < 50.0:
            low_confidence_flag = True
            review_recommended = True
            
        # ── Rule-Based Adjustments ───────────────────────────────
        if engagement < 35:
            final_score -= 5
        elif engagement > 85:
            final_score += 5

        if phoneme_accuracy < 35:
            final_score = min(final_score, 45)

        final_score = max(0, min(100, final_score))
        performance_level = self.classify_performance(final_score, patient_category)

        # ── Adaptive Decision ────────────────────────────────────
        adaptive_decision = "not_applied"
        new_consecutive_pass = consecutive_pass
        new_consecutive_fail = consecutive_fail
        feedback_text = ""
        progress_delta = 0.0
        clinician_alert = False

        if not is_warmup and not low_confidence_flag and source != "baseline":
            thresholds = prompt_obj.get("adaptive_thresholds")
            
            if not thresholds:
                raise ValueError("Expected adaptive_thresholds for exercise prompt, none found.")

            at_advance = thresholds.get("advance_to_next_level")
            at_stay = thresholds.get("stay_at_current_level")
            at_drop = thresholds.get("drop_to_easier_level", 55)
            at_c_advance = thresholds.get("consecutive_to_advance", 2)
            at_c_drop = thresholds.get("consecutive_to_drop", 3)
            
            if at_advance is None:
                raise ValueError("adaptive_thresholds row is missing valid thresholds.")

            # Step 1: Frustration override
            detected_emotion = ser_result.get("emotion", "neutral")
            if frustration_score > 0.40 or (detected_emotion in ("angry", "sad") and frustration_score > 0.30):
                adaptive_decision = "drop"
                new_consecutive_pass = 0
                new_consecutive_fail = consecutive_fail + 1
            else:
                # Step 2: Threshold comparison
                if final_score >= at_advance:
                    new_consecutive_pass = consecutive_pass + 1
                    new_consecutive_fail = 0
                    if new_consecutive_pass >= at_c_advance:
                        adaptive_decision = "advance"
                    else:
                        adaptive_decision = "stay"
                elif final_score < at_drop:
                    new_consecutive_fail = consecutive_fail + 1
                    new_consecutive_pass = 0
                    if new_consecutive_fail >= at_c_drop:
                        adaptive_decision = "drop"
                    else:
                        adaptive_decision = "stay"
                else:
                    adaptive_decision = "stay"

            # Step 3: Clinician alert check
            if baseline_score is not None:
                progress_delta = round(final_score - baseline_score, 2)
                if progress_delta < -15.0:
                    clinician_alert = True
                    if adaptive_decision == "advance":
                        adaptive_decision = "stay"

            # ── Feedback Selection ───────────────────────────────
            feedback_rules = prompt_obj.get("feedback_rules", {})
            
            result = "fail"
            if final_score >= at_advance:
                result = "pass"
            elif final_score >= at_drop:
                result = "partial" if getattr(prompt_obj.get("evaluation_target", object), "partial_pass", None) is not None else "fail"
            
            if result == "pass":
                feedback_text = feedback_rules.get("pass_message", "Great job!")
            elif result == "partial":
                feedback_text = feedback_rules.get("partial_message") or feedback_rules.get("pass_message", "Good effort.")
            elif result == "fail" and adaptive_decision == "stay":
                feedback_text = feedback_rules.get("retry_message") or feedback_rules.get("fail_message", "Let's try again.")
            elif result == "fail" and (adaptive_decision == "drop" or adaptive_decision == "auto_drop"):
                feedback_text = feedback_rules.get("fail_message", "Let's review this.")
                
            if result == "fail" and (adaptive_decision == "drop" or adaptive_decision == "auto_drop") and clinician_alert:
                feedback_text += " Your therapist has been notified and will review your recent progress."

        return {
            # Primary metrics
            "word_accuracy": word_accuracy,
            "phoneme_accuracy": phoneme_accuracy,
            "fluency": fluency,
            "speech_rate": speech_rate,
            "confidence_score": confidence_score,
            "engagement_score": engagement,
            "articulation_score": articulation,
            "speech_score": speech_score,
            "final_score": final_score,
            "performance_level": performance_level,
            "content_score": content_score,
            # Adaptive
            "adaptive_decision": adaptive_decision if not low_confidence_flag else None,
            "feedback": feedback_text,
            "consecutive_pass_count": new_consecutive_pass,
            "consecutive_fail_count": new_consecutive_fail,
            "progress_delta": progress_delta,
            "clinician_alert": clinician_alert,
            "frustration_flag": frustration_score > 0.40,
            "low_confidence_flag": low_confidence_flag,
            "review_recommended": review_recommended,
            # Secondary
            "pause_rate": pause_rate,
            "transcript_percentage": transcript_percentage,
            "transcribed_text": actual_text,
            "detected_emotion": ser_result.get("emotion", "neutral"),
            "disfluency_data": disfluency_data,
            # Backward compat
            "accuracy": word_accuracy,
            "overall_score": final_score,
        }


analysis_service = AnalysisService()
