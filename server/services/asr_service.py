"""
Component 1 — Whisper ASR Service.

Spec: ai_workflow.md §Component 1
Runs on: Every attempt — all 30 tasks, all task modes.

Outputs:
  WA  — Word Accuracy (handled downstream in analysis_service)
  FS  — Fluency Score (disfluency rate + pause detection)
  SRS — Speech Rate Score (WPM vs task-ideal range)
  CS  — Confidence Score (mean token probability)
  Full transcript, word-level timestamps, filler word count
"""

import re
import torch
from transformers import pipeline
import librosa
from config import settings


# Filler/disfluency patterns
FILLER_WORDS = {"um", "uh", "er", "ah", "erm", "hmm", "like", "you know", "i mean", "sort of", "kind of"}

# Task-mode ideal WPM ranges (midpoint used for scoring)
IDEAL_WPM = {
    "word_drill":     (60, 100),
    "sentence_read":  (120, 160),
    "paragraph_read": (130, 170),
    "free_speech":    (110, 160),
    "stuttering":     (60, 120),
    "roleplay":       (110, 150),
    "debate":         (110, 150),
    "breath_control": (40, 80),
}
DEFAULT_WPM = (110, 160)


class ASRService:
    def __init__(self):
        self.device = 0 if settings.MODEL_DEVICE == "cuda" and torch.cuda.is_available() else -1
        self.model_id = "openai/whisper-small"
        self.pipe = None

    def load_model(self):
        if self.pipe is None:
            print(f"Loading Whisper model {self.model_id} on {'CPU' if self.device == -1 else 'CUDA'}...")
            self.pipe = pipeline(
                "automatic-speech-recognition",
                model=self.model_id,
                device=self.device,
                chunk_length_s=30,
                return_timestamps="word"
            )

    def transcribe(self, audio_path: str, task_mode: str = "sentence_read"):
        """
        Transcribe audio and extract enriched metrics.

        Returns:
            text, words, duration, confidence, disfluency_data, speech_rate_data
        """
        if self.pipe is None:
            self.load_model()

        y, sr = librosa.load(audio_path, sr=16000)
        duration = librosa.get_duration(y=y, sr=sr)

        result = self.pipe(y)

        words = result.get("chunks", [])
        text = result.get("text", "").strip()

        # ── Real Confidence: mean token probability ──────────────
        confidence = self._compute_confidence(result, text, words, duration)

        # ── Disfluency Detection ─────────────────────────────────
        disfluency_data = self._detect_disfluencies(text, words)

        # ── Speech Rate & Fluency Score ──────────────────────────
        total_disfluencies = disfluency_data.get("total_disfluencies", 0)
        speech_rate_data = self._compute_speech_rate(words, duration, task_mode, total_disfluencies)

        return {
            "text": text,
            "words": words,
            "duration": round(duration, 2),
            "confidence": round(confidence, 3),
            "disfluency_data": disfluency_data,
            "speech_rate_data": speech_rate_data,
        }

    # ── Private Helpers ──────────────────────────────────────────

    @staticmethod
    def _compute_confidence(result: dict, text: str, words: list, duration: float) -> float:
        """Extract real token-level confidence when available, else smart heuristic."""
        # Try token-level scores from HF pipeline output
        try:
            if "chunks" in result:
                scores = [c.get("score", None) for c in result["chunks"] if c.get("score") is not None]
                if scores:
                    return sum(scores) / len(scores)
        except Exception:
            pass

        # Heuristic fallback
        if duration > 0 and len(words) > 0:
            words_per_sec = len(words) / duration
            if 0.5 <= words_per_sec <= 5.0:
                return min(0.95, 0.6 + words_per_sec * 0.1)
            return 0.4
        return 0.0 if not text else 0.5

    @staticmethod
    def _detect_disfluencies(text: str, words: list) -> dict:
        """Count fillers, repetitions, and revisions in transcript."""
        lower = text.lower()
        word_list = lower.split()

        # Filler count
        filler_count = 0
        found_fillers = []
        for filler in FILLER_WORDS:
            count = lower.count(filler)
            if count > 0:
                filler_count += count
                found_fillers.append(filler)

        # Repetition detection: consecutive identical words
        repetitions = 0
        for i in range(1, len(word_list)):
            cleaned = re.sub(r'[^\w]', '', word_list[i])
            prev_cleaned = re.sub(r'[^\w]', '', word_list[i - 1])
            if cleaned and cleaned == prev_cleaned:
                repetitions += 1

        # Revision detection: self-corrections like "the the uh big"
        revisions = 0
        for i in range(2, len(word_list)):
            if word_list[i - 1] in FILLER_WORDS and word_list[i - 2] not in FILLER_WORDS:
                revisions += 1

        total = filler_count + repetitions + revisions
        word_count = max(1, len(word_list))
        rate = round(total / word_count, 3)

        return {
            "filler_count": filler_count,
            "fillers_found": found_fillers,
            "repetitions": repetitions,
            "revisions": revisions,
            "total_disfluencies": total,
            "disfluency_rate": rate,
        }

    @staticmethod
    def _compute_speech_rate(words: list, duration: float, task_mode: str, total_disfluencies: int) -> dict:
        """Calculate WPM, Disfluency Rate (DR), Pacing Score (PS) and overall Fluency."""
        word_count = len(words)
        if duration <= 0 or word_count <= 0:
            return {"wpm": 0, "score": 50, "ideal_range": DEFAULT_WPM, "dr": 0, "ps": 50}

        wpm = (word_count / duration) * 60
        low, high = IDEAL_WPM.get(task_mode, DEFAULT_WPM)
        mid = (low + high) / 2

        # Pacing Score (PS)
        if low <= wpm <= high:
            ps = 100.0
        else:
            distance = min(abs(wpm - low), abs(wpm - high))
            ps = 100.0 - (distance * 0.5)

        # Disfluency Rate (DR)
        dr = (total_disfluencies / word_count) * 100.0

        # Overall Fluency Score
        fluency_score = max(0.0, ps - (dr * 2))

        return {
            "wpm": round(wpm, 1),
            "score": int(fluency_score),
            "ideal_range": (low, high),
            "dr": round(dr, 1),
            "ps": round(ps, 1)
        }


asr_service = ASRService()
