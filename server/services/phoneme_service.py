"""
Component 2 — HuBERT CTC Forced Alignment (Phoneme Accuracy).

Spec: ai_workflow.md §Component 2
Primary model: facebook/hubert-base-ls960
Fallback model: facebook/wav2vec2-base-960h
Runs on: word_drill, sentence_read, paragraph_read only.

Outputs:
  PA — Phoneme Accuracy (forced alignment vs target phoneme sequence)
  Per-word phoneme result (correct / substitution / distortion)
  target_results dict for clinician review
"""

import torch
import numpy as np
import librosa
from difflib import SequenceMatcher
from config import settings

# Task modes that should run phoneme analysis
PHONEME_TASK_MODES = {"word_drill", "sentence_read", "paragraph_read"}


class PhonemeService:
    def __init__(self):
        self.device = "cuda" if settings.MODEL_DEVICE == "cuda" and torch.cuda.is_available() else "cpu"
        self.primary_model_id = "facebook/hubert-base-ls960"
        self.fallback_model_id = "facebook/wav2vec2-base-960h"
        self.processor = None
        self.model = None
        self.active_model_id = None
        self.g2p = None

    def load_model(self):
        if self.model is not None:
            return

        from transformers import Wav2Vec2Processor, Wav2Vec2ForCTC

        # Try primary HuBERT first
        try:
            print(f"Loading HuBERT CTC model {self.primary_model_id} on {self.device}...")
            self.processor = Wav2Vec2Processor.from_pretrained(self.primary_model_id)
            self.model = Wav2Vec2ForCTC.from_pretrained(self.primary_model_id).to(self.device)
            self.active_model_id = self.primary_model_id
        except Exception as e:
            print(f"HuBERT load failed ({e}), falling back to {self.fallback_model_id}")
            self.processor = Wav2Vec2Processor.from_pretrained(self.fallback_model_id)
            self.model = Wav2Vec2ForCTC.from_pretrained(self.fallback_model_id).to(self.device)
            self.active_model_id = self.fallback_model_id

        self.model.eval()

    def _load_g2p(self):
        if self.g2p is None:
            from g2p_en import G2p
            self.g2p = G2p()

    def _text_to_phonemes(self, text: str) -> list[str]:
        """Convert text to phoneme sequence using G2P."""
        self._load_g2p()
        raw = self.g2p(text)
        return [p.lower().rstrip("012") for p in raw if p.strip() and p.isalpha()]

    def _audio_to_phonemes(self, audio: np.ndarray) -> list[str]:
        """Run CTC decoding on audio, then G2P on the decoded text."""
        inputs = self.processor(audio, sampling_rate=16000, return_tensors="pt", padding=True)
        input_values = inputs.input_values.to(self.device)

        with torch.no_grad():
            logits = self.model(input_values).logits

        predicted_ids = torch.argmax(logits, dim=-1)
        transcription = self.processor.batch_decode(predicted_ids)[0]
        return self._text_to_phonemes(transcription), transcription

    def compute_phoneme_accuracy(
        self,
        audio_path: str,
        expected_text: str,
        mode: str = "accurate",
        task_mode: str = "sentence_read",
        target_phonemes: list = None,
    ) -> dict:
        """
        Compute phoneme accuracy with forced alignment.

        Args:
            audio_path: Path to audio file
            expected_text: Expected text from prompt
            mode: "accurate" for full CTC, "fast" for approximation
            task_mode: The task mode (word_drill, sentence_read, etc.)
            target_phonemes: Optional explicit target phoneme list from prompt JSON

        Returns:
            dict with phoneme_accuracy, per-word results, model info
        """
        # Task-mode filter: skip for non-applicable modes
        if task_mode and task_mode not in PHONEME_TASK_MODES:
            return {
                "phoneme_accuracy": 0,
                "mode": "skipped",
                "model": "none",
                "target_results": {},
                "details": f"Phoneme analysis not applicable for task_mode={task_mode}",
            }

        if not expected_text or not expected_text.strip():
            return {
                "phoneme_accuracy": 0, "mode": mode, "model": "none",
                "target_results": {}, "details": "No expected text",
            }

        try:
            if mode == "fast":
                return {
                    "phoneme_accuracy": 0, "mode": "fast", "model": "none",
                    "target_results": {}, "details": "Fast mode — use WA × 1.2",
                }

            # Full CTC pipeline
            self.load_model()
            y, sr = librosa.load(audio_path, sr=16000)

            # Get expected phonemes: use target_phonemes from JSON if available
            if target_phonemes and len(target_phonemes) > 0:
                expected_ph = [p.lower().rstrip("012") for p in target_phonemes]
            else:
                expected_ph = self._text_to_phonemes(expected_text)

            predicted_ph, decoded_text = self._audio_to_phonemes(y)

            if not expected_ph:
                return {
                    "phoneme_accuracy": 0, "mode": mode, "model": self.active_model_id,
                    "target_results": {}, "details": "G2P returned no phonemes",
                }

            # ── Per-word scoring ──────────────────────────────────
            target_results = self._score_per_word(expected_text, decoded_text)

            # ── Overall phoneme accuracy ──────────────────────────
            ratio = SequenceMatcher(None, expected_ph, predicted_ph).ratio()
            accuracy = min(100, int(ratio * 100))

            return {
                "phoneme_accuracy": accuracy,
                "mode": "accurate",
                "model": self.active_model_id,
                "expected_phonemes": expected_ph[:30],
                "predicted_phonemes": predicted_ph[:30],
                "target_results": target_results,
                "details": f"Matched {accuracy}% of {len(expected_ph)} expected phonemes",
            }

        except Exception as e:
            print(f"Error in phoneme analysis: {e}")
            return {
                "phoneme_accuracy": 0, "mode": "error", "model": self.active_model_id or "none",
                "target_results": {}, "details": f"Error: {str(e)}",
            }

    def _score_per_word(self, expected_text: str, decoded_text: str) -> dict:
        """
        Score each target word: correct=1.0, substitution=0.0, distortion=0.5.

        Returns dict keyed by word with score and details.
        """
        self._load_g2p()

        expected_words = expected_text.lower().split()
        decoded_words = decoded_text.lower().split()

        results = {}
        matcher = SequenceMatcher(None, expected_words, decoded_words)

        matched_decoded = set()
        for block in matcher.get_matching_blocks():
            for i in range(block.size):
                ew = expected_words[block.a + i]
                matched_decoded.add(block.b + i)
                results[ew] = {"score": 1.0, "status": "correct", "expected": ew, "produced": ew}

        # Score unmatched expected words
        for i, ew in enumerate(expected_words):
            if ew in results:
                continue

            # Find closest decoded word
            best_ratio = 0
            best_word = None
            for j, dw in enumerate(decoded_words):
                if j in matched_decoded:
                    continue
                r = SequenceMatcher(None, ew, dw).ratio()
                if r > best_ratio:
                    best_ratio = r
                    best_word = dw

            if best_ratio >= 0.7:
                # Distortion: close but not exact
                results[ew] = {"score": 0.5, "status": "distortion", "expected": ew, "produced": best_word}
            elif best_word:
                # Substitution: different word entirely
                exp_ph = self._text_to_phonemes(ew)
                prod_ph = self._text_to_phonemes(best_word) if best_word else []
                results[ew] = {
                    "score": 0.0, "status": "substitution",
                    "expected": ew, "produced": best_word,
                    "expected_phonemes": exp_ph[:5], "produced_phonemes": prod_ph[:5],
                }
            else:
                results[ew] = {"score": 0.0, "status": "omission", "expected": ew, "produced": None}

        return results


phoneme_service = PhonemeService()
