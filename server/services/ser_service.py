"""
Component 4 — SpeechBrain Emotion Recognition (Engagement Score).

Spec: ai_workflow.md §Component 4
Model: speechbrain/emotion-recognition-wav2vec2-IEMOCAP
Runs on: Every attempt — in parallel with Whisper.

Outputs:
  EngagementScore — 0.65 × EmotionScore + 0.35 × BehavioralScore
  Emotion probabilities
  Frustration flag (> 0.40 triggers auto-drop on 2 consecutive)
"""

import torch
import librosa
from config import settings

# Context-aware emotion weights: maps emotion label to engagement value
ADULT_EMOTION_WEIGHTS = {
    "hap": 1.0, "happy": 1.0,
    "neu": 0.7, "neutral": 0.7,
    "sad": 0.3,
    "ang": 0.15, "angry": 0.15,
    "fea": 0.2, "fearful": 0.2, "fear": 0.2,
    "dis": 0.2, "disgust": 0.2,
    "sur": 0.9, "surprise": 0.9,
    "calm": 0.8,
    "exc": 0.95, "excited": 0.95,
}

CHILD_EMOTION_WEIGHTS = {
    "hap": 1.0, "happy": 1.0,
    "neu": 0.75, "neutral": 0.75,
    "sad": 0.4,   # Less penalty for children
    "ang": 0.25, "angry": 0.25,
    "fea": 0.3, "fearful": 0.3, "fear": 0.3,
    "dis": 0.25, "disgust": 0.25,
    "sur": 0.9, "surprise": 0.9,
    "calm": 0.85,
    "exc": 1.0, "excited": 1.0,
}

# Frustration-indicative emotions
FRUSTRATION_EMOTIONS = {"ang", "angry", "sad", "fea", "fearful", "fear", "dis", "disgust"}


class SERService:
    def __init__(self):
        self.device = "cuda" if settings.MODEL_DEVICE == "cuda" and torch.cuda.is_available() else "cpu"
        self.model_id = "speechbrain/emotion-recognition-wav2vec2-IEMOCAP"
        self.classifier = None
        self._fallback_mode = False

    def load_model(self):
        if self.classifier is not None:
            return

        try:
            from speechbrain.inference.classifiers import EncoderClassifier
            print(f"Loading SpeechBrain model {self.model_id} on {self.device}...")
            self.classifier = EncoderClassifier.from_hparams(
                source=self.model_id,
                run_opts={"device": self.device},
            )
            self._fallback_mode = False
        except Exception as e:
            print(f"SpeechBrain load failed ({e}), falling back to transformers pipeline")
            self._load_fallback()

    def _load_fallback(self):
        """Fallback to transformers pipeline if SpeechBrain is unavailable."""
        from transformers import pipeline as hf_pipeline
        device = 0 if self.device == "cuda" else -1
        fallback_model = "ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition"
        print(f"Loading fallback SER model {fallback_model}...")
        self.classifier = hf_pipeline("audio-classification", model=fallback_model, device=device)
        self._fallback_mode = True

    def analyze_emotion(
        self,
        audio_path: str,
        patient_category: str = "adult",
        response_latency: float = 0.0,
        attempt_number: int = 1,
        task_completed: bool = False,
    ) -> dict:
        """
        Analyze emotion and compute engagement score.

        Args:
            audio_path: Path to audio file
            patient_category: "adult" or "child" (affects emotion weights)
            response_latency: Time in seconds before patient started speaking
            attempt_number: Current attempt number
            task_completed: Whether the task was completed

        Returns:
            emotion, probabilities, engagement_score, frustration_score, behavioral_score
        """
        if self.classifier is None:
            self.load_model()

        try:
            y, sr = librosa.load(audio_path, sr=16000)
            signal = torch.tensor(y).unsqueeze(0)

            if self._fallback_mode:
                return self._run_fallback(y, patient_category, response_latency, attempt_number, task_completed)

            # SpeechBrain inference
            out_prob, score, index, label = self.classifier.classify_batch(signal)

            # Build probabilities dict
            prob_tensor = out_prob.squeeze()
            labels = self.classifier.hparams.label_encoder.lab2ind
            probabilities = {}
            for lab, idx in labels.items():
                if idx < len(prob_tensor):
                    probabilities[lab.lower()] = round(float(prob_tensor[idx]), 4)

            top_emotion = label[0].lower() if label else "neu"
            top_confidence = float(score[0]) if score.numel() > 0 else 0.0

            # ── Emotion Score ────────────────────────────────────
            weights = CHILD_EMOTION_WEIGHTS if patient_category == "child" else ADULT_EMOTION_WEIGHTS
            emotion_score = 0.0
            for lab, prob in probabilities.items():
                w = weights.get(lab, 0.5)
                emotion_score += w * prob
            emotion_score = min(100, max(0, int(emotion_score * 100)))

            # ── Behavioral Score ─────────────────────────────────
            behavioral_score = self._compute_behavioral(response_latency, attempt_number, task_completed)

            # ── Engagement: 0.65 × Emotion + 0.35 × Behavioral ──
            engagement = int(0.65 * emotion_score + 0.35 * behavioral_score)
            engagement = max(0, min(100, engagement))

            # ── Frustration Detection ────────────────────────────
            frustration_score = sum(
                probabilities.get(e, 0) for e in FRUSTRATION_EMOTIONS
            )

            return {
                "emotion": top_emotion,
                "confidence": round(top_confidence, 4),
                "probabilities": probabilities,
                "emotion_score": emotion_score,
                "behavioral_score": behavioral_score,
                "engagement_score": engagement,
                "frustration_score": round(frustration_score, 4),
                "frustration_flag": frustration_score > 0.40,
            }

        except Exception as e:
            print(f"Error in SER: {e}")
            return {
                "emotion": "neutral",
                "confidence": 0.0,
                "probabilities": {"neutral": 1.0},
                "emotion_score": 70,
                "behavioral_score": 70,
                "engagement_score": 70,
                "frustration_score": 0.0,
                "frustration_flag": False,
                "error": str(e),
            }

    def _run_fallback(self, y, patient_category, response_latency, attempt_number, task_completed):
        """Run using transformers pipeline fallback."""
        results = self.classifier(y)
        probabilities = {}
        if results:
            for item in results:
                probabilities[item["label"].lower()] = round(item["score"], 4)

        top = results[0] if results else {"label": "neutral", "score": 1.0}

        weights = CHILD_EMOTION_WEIGHTS if patient_category == "child" else ADULT_EMOTION_WEIGHTS
        emotion_score = 0.0
        for lab, prob in probabilities.items():
            emotion_score += weights.get(lab, 0.5) * prob
        emotion_score = min(100, max(0, int(emotion_score * 100)))

        behavioral_score = self._compute_behavioral(response_latency, attempt_number, task_completed)
        engagement = int(0.65 * emotion_score + 0.35 * behavioral_score)
        frustration_score = sum(probabilities.get(e, 0) for e in FRUSTRATION_EMOTIONS)

        return {
            "emotion": top["label"].lower(),
            "confidence": round(top["score"], 4),
            "probabilities": probabilities,
            "emotion_score": emotion_score,
            "behavioral_score": behavioral_score,
            "engagement_score": max(0, min(100, engagement)),
            "frustration_score": round(frustration_score, 4),
            "frustration_flag": frustration_score > 0.40,
        }

    @staticmethod
    def _compute_behavioral(response_latency: float, attempt_number: int, task_completed: bool) -> int:
        """
        Behavioral score from response latency + completion + attempt quality.

        Components:
          - Latency: 100 if < 3s, decreasing toward 0 at 30s
          - Completion: +20 if completed, +0 if not
          - Attempt quality: -10 per retry beyond first
        """
        # Latency component (0–40 points)
        if response_latency <= 3:
            latency_score = 40
        elif response_latency <= 10:
            latency_score = int(40 - (response_latency - 3) * 3)
        else:
            latency_score = max(0, int(20 - (response_latency - 10)))

        # Completion component (0–40 points)
        completion_score = 40 if task_completed else 20

        # Attempt quality component (0–20 points)
        attempt_score = max(0, 20 - (attempt_number - 1) * 10)

        return min(100, latency_score + completion_score + attempt_score)


ser_service = SERService()
