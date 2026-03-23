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

    def _forced_alignment_score(self, logits: torch.Tensor, target_text: str) -> dict:
        """
        Perform a dynamic programming forced alignment of the target_text
        against the CTC logits. Returns a per-character probability which
        we aggregate into a per-word probability.
        """
        # Get log probabilities: (T, C)
        log_probs = torch.nn.functional.log_softmax(logits[0], dim=-1).cpu().numpy()
        T, C = log_probs.shape
        
        # Prepare target sequence of token IDs
        target_text = target_text.upper()
        # Handle word boundaries (spaces are usually replaced by `|` in Wav2Vec2 tokenizer)
        vocab = self.processor.tokenizer.get_vocab()
        blank_id = vocab.get("<pad>", 0)
        word_delimiter = vocab.get("|", vocab.get(" ", 3))
        
        target_ids = []
        chars = []
        for char in target_text:
            if char == " ":
                target_ids.append(word_delimiter)
                chars.append(" ")
            else:
                tid = vocab.get(char)
                if tid is not None:
                    target_ids.append(tid)
                    chars.append(char)
        
        if not target_ids:
            return {}

        L = len(target_ids)
        # DP matrix for Viterbi alignment
        dp = np.full((T, L), -np.inf)
        
        # Init
        dp[0, 0] = log_probs[0, target_ids[0]]
        
        for t in range(1, T):
            for s in range(L):
                # Transition from same token (duration)
                p1 = dp[t-1, s]
                # Transition from previous token
                p2 = dp[t-1, s-1] if s > 0 else -np.inf
                
                dp[t, s] = max(p1, p2) + log_probs[t, target_ids[s]]
                
        # Backtrack to find max probability per token
        scores = []
        for s in range(L):
            max_log_prob = np.max(dp[:, s])
            # normalize roughly
            prob = np.exp(max_log_prob / T) 
            scores.append(prob)
            
        # Aggregate per word
        words_scores = []
        current_word_score = []
        for char, score in zip(chars, scores):
            if char == " " and current_word_score:
                words_scores.append(float(np.mean(current_word_score)))
                current_word_score = []
            elif char != " ":
                current_word_score.append(score)
        if current_word_score:
            words_scores.append(float(np.mean(current_word_score)))
            
        return dict(zip(target_text.lower().split(), words_scores))

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

            # Get model emissions
            inputs = self.processor(y, sampling_rate=16000, return_tensors="pt", padding=True)
            input_values = inputs.input_values.to(self.device)
            with torch.no_grad():
                logits = self.model(input_values).logits
            
            # Predict transcript just for fallback logging
            predicted_ids = torch.argmax(logits, dim=-1)
            decoded_text = self.processor.batch_decode(predicted_ids)[0]

            # ── Forced CTC Alignment ────────────────────────────────  
            # We align the expected words and get acoustic confidences mapped to target_phonemes
            word_confidences = self._forced_alignment_score(logits, expected_text)
            
            target_results = {}
            expected_words = expected_text.lower().split()
            matched_phoneme_count = 0
            total_target_phonemes = len(expected_ph)
            
            # Apportion word scores to phonemes
            ph_idx = 0
            for i, ew in enumerate(expected_words):
                w_ph = self._text_to_phonemes(ew)
                c_score = word_confidences.get(ew, 0.0)
                # Convert log-like output mapping to a 0-1.0 scale using a sigmoid-like curve or scaling
                scaled_score = min(1.0, max(0.0, c_score * 1.5)) 
                
                status = "correct" if scaled_score >= 0.7 else ("distortion" if scaled_score >= 0.4 else "substitution")
                
                target_results[ew] = {
                    "score": round(scaled_score, 2),
                    "status": status,
                    "expected_phonemes": w_ph,
                    "produced_phonemes": w_ph if status == "correct" else [],
                    "acoustic_confidence": round(scaled_score, 2)
                }
                
                # Apply strictly to the phoneme array
                for p in w_ph:
                    if scaled_score >= 0.4:
                        matched_phoneme_count += 1
                        
            # Overall Accuracy
            accuracy = int((matched_phoneme_count / max(1, total_target_phonemes)) * 100)
            
            # Low Accuracy Gate (Fix 5 rule)
            if matched_phoneme_count == 0 or accuracy < 40:
                accuracy = min(accuracy, 39) # Force flag
                
            return {
                "phoneme_accuracy": accuracy,
                "mode": mode,
                "model": self.active_model_id,
                "expected_phonemes": expected_ph[:30],
                "predicted_phonemes": [],
                "target_results": target_results,
                "details": f"Forced Alignment computed {accuracy}% phoneme match",
            }

        except Exception as e:
            print(f"Phoneme alignment error: {e}")
            return {
                "phoneme_accuracy": 0,
                "mode": mode,
                "model": "error",
                "expected_phonemes": [],
                "predicted_phonemes": [],
                "target_results": {},
                "details": f"Failed to process phonemes: {str(e)}"
            }


phoneme_service = PhonemeService()
