# 📊 Speech Therapy AI — Accuracy Formula v2.0
## Complete Redesign: Clinically Valid, Task-Aware, Defect-Specific

---

## ❌ What Was Wrong in v1 (Summary)

| Problem | v1 Behaviour | Impact |
|---|---|---|
| Word Accuracy used Whisper alone | No reference text comparison | Whisper auto-corrects errors — WA always high |
| Phoneme Accuracy aligned to transcription | Not aligned to TARGET phoneme sequence | Wrong phonemes scored against wrong reference |
| Fluency = pause penalty only | Missing repetitions, revisions, fillers | Real disfluency goes undetected |
| One ideal WPM for all tasks | child=110, adult=140 fixed | Word drills penalised for being slow; debates penalised for being fast |
| Same weights for all 30 task types | 0.35PA + 0.25WA + 0.20F + 0.10SR + 0.10C always | Articulation drill gets same formula as debate task |
| Multimodal fusion fixed at 0.75/0.25 | Speech=75% always | Stuttering task emotion is irrelevant at 25% |
| No warmup vs exercise distinction | Both scored identically | Warmup attempt counts toward clinical score |
| No baseline comparison | Absolute score only | 65% could be excellent for dysarthria or failure for articulation |

---

## 🏗️ Core Architecture — Three Layers

```
LAYER 1 — INPUT SEPARATION
    App delivers instruction (TTS or display)
    Microphone activates ONLY after instruction ends
    ASR receives: user speech only (no instruction contamination)
    
LAYER 2 — TASK-AWARE SCORING
    Each task type uses a different formula
    Each prompt has explicit speech_target and evaluation_target
    Scoring compares against reference, not just transcription
    
LAYER 3 — ADAPTIVE CLINICAL OUTPUT
    Score compared against patient's OWN baseline
    Performance level set per defect type
    Adaptive difficulty driven by Layer 2 score only
```

---

# 🔢 SECTION 1 — Component Metrics (Building Blocks)

## 1.1 Word Accuracy (WA) — FIXED

**Problem with v1:** Whisper transcribes what it thinks it heard. If user says "woad" for "road", Whisper may still output "road". WA becomes 100% even with a /w/ substitution error.

**Fix:** Use forced alignment against the REFERENCE text, not the transcription.

```
Reference text  = speech_target.words (from JSON prompt)
ASR transcript  = Whisper output

WA = (Words in transcript that MATCH reference) / (Total words in reference) × 100

Matching rule:
  - Exact match:         full credit   (1.0)
  - Phonetically close:  partial credit (0.5)  ← edit distance ≤ 1 phoneme
  - Wrong word:          no credit     (0.0)
  - Word omitted:        no credit     (0.0)
  - Extra word added:    no penalty    (neutral)
```

**Example:**
```
Reference:   ["road", "red", "run"]
Transcript:  ["woad", "red", "run"]

road vs woad → phonetically close (1 phoneme diff) → 0.5
red  vs red  → exact match                         → 1.0
run  vs run  → exact match                         → 1.0

WA = (0.5 + 1.0 + 1.0) / 3 × 100 = 83.3%
```

---

## 1.2 Phoneme Accuracy (PA) — FIXED

**Problem with v1:** Wav2Vec2 aligns to the transcribed text. If Whisper corrects "woad" to "road", the alignment maps /r/ against /r/ and reports it correct — even though the user said /w/.

**Fix:** Force-align the RAW AUDIO directly against the TARGET PHONEME SEQUENCE from the prompt JSON — bypass the Whisper transcript for phoneme scoring.

```
Target phoneme sequence  = evaluation_target.target_phonemes (from JSON)
Audio alignment          = Wav2Vec2 forced alignment against target sequence

PA = (Phonemes correctly produced) / (Total target phonemes) × 100

Per phoneme scoring:
  - Correct production:            1.0
  - Substitution (wrong phoneme):  0.0
  - Distortion (right phoneme,     0.5
    wrong quality):
  - Omission (phoneme skipped):    0.0
```

**For target-phoneme-only tasks** (word drills, minimal pairs):

Only the TARGET phonemes are scored — not every phoneme in every word.

```
Prompt:  "road   red   run"
Target:  /r/ at word onset only (evaluation_target.scope = "word_onset")

Audio analysis:
  "road" onset → /w/ detected → substitution → 0.0
  "red"  onset → /r/ detected → correct       → 1.0
  "run"  onset → /r/ detected → correct       → 1.0

PA = (0 + 1 + 1) / 3 × 100 = 66.7%
```

**For full sentence tasks** (paragraph reading, roleplay):

All phonemes in the target sentence are scored.

```
Target sentence: "My appointment is on Thursday at half past two."
Target phonemes: full IPA sequence from reference text
PA = % of all phonemes correctly produced
```

---

## 1.3 Fluency Score (FS) — FULLY REDESIGNED

**Problem with v1:** Only penalises pauses. Misses the three main disfluency types: repetitions ("I I I want"), revisions ("I want — I mean I need"), and interjections ("um", "uh", "like").

**New Formula:**

```
Disfluency Rate (DR) = 
  (Repetitions + Revisions + Interjections) / Total Words × 100

Pause Score (PS):
  For each pause detected:
    IF pause_duration < 0.5s  AND  at punctuation boundary → natural  → no penalty
    IF pause_duration < 0.5s  AND  mid-phrase             → mild     → −2 points
    IF pause_duration 0.5–1s  AND  mid-phrase             → moderate → −4 points
    IF pause_duration > 1s    AND  mid-phrase             → severe   → −8 points
    IF pause_duration > 1s    AND  at sentence boundary   → allowed  → no penalty

  PS = 100 − sum(all pause penalties), floor at 0

Fluency Score (FS) = 
  0.60 × (100 − DR × 3)   ← disfluency component
  + 0.40 × PS              ← pause component

  Floor at 0, ceiling at 100
```

**Example — adult stuttering task:**
```
Transcript: "I I want to... um... tell you something important."
Words: 9 total
Repetitions: 1 ("I I")
Interjections: 1 ("um")
Pauses: 1 mid-phrase pause of 0.8s

DR = (1+1) / 9 × 100 = 22.2%
Disfluency component = 100 − 22.2 × 3 = 33.4 → scaled to 0–100 = 33
Pause penalty = 4 points (0.8s mid-phrase)
PS = 100 − 4 = 96

FS = 0.60 × 33 + 0.40 × 96 = 19.8 + 38.4 = 58.2
```

---

## 1.4 Speech Rate Score (SRS) — FIXED

**Problem with v1:** One fixed ideal WPM (child=110, adult=140) for all tasks regardless of what the task requires.

**Fix:** Each task type has its own ideal WPM range.

```
WPM = (word_count / duration_seconds) × 60

Ideal WPM ranges by task type:
┌─────────────────────────────┬──────────────┬──────────────┐
│ Task Type                   │ Ideal Range  │ Tolerance    │
├─────────────────────────────┼──────────────┼──────────────┤
│ Word drill / minimal pairs  │  60 –  90    │ ± 15 WPM     │
│ Sentence reading (slow)     │  80 – 100    │ ± 15 WPM     │
│ Sentence reading (natural)  │ 120 – 140    │ ± 20 WPM     │
│ Paragraph reading           │ 130 – 150    │ ± 20 WPM     │
│ Conversation / roleplay     │ 130 – 160    │ ± 25 WPM     │
│ Debate / presentation       │ 140 – 170    │ ± 25 WPM     │
│ Voicemail / telephone       │ 110 – 130    │ ± 15 WPM     │
│ Stuttering management       │  80 – 120    │ ± 20 WPM     │
│ Child articulation          │  80 – 110    │ ± 20 WPM     │
│ Child fluency               │ 100 – 130    │ ± 20 WPM     │
└─────────────────────────────┴──────────────┴──────────────┘

SRS = 100 − max(0, |WPM − ideal_midpoint| − tolerance) × 1.5

Floor at 0, ceiling at 100
```

**Example:**
```
Task type: word drill (ideal = 75 WPM midpoint, tolerance = 15)
User WPM: 55 (too slow)

Deviation beyond tolerance = |55 − 75| − 15 = 20 − 15 = 5
SRS = 100 − 5 × 1.5 = 100 − 7.5 = 92.5

User WPM: 40 (far too slow)
Deviation = |40 − 75| − 15 = 35 − 15 = 20
SRS = 100 − 20 × 1.5 = 70
```

---

## 1.5 Confidence Score (CS)

No change from v1. Whisper token-level confidence averaged across the response.

```
CS = mean(token_confidence_scores) × 100
```

Use as a reliability weight — if CS < 50, flag the entire attempt for manual review rather than counting it as a scored attempt.

---

# 🔢 SECTION 2 — Task-Type Specific Speech Score

## The Critical Fix: Different Weights for Different Tasks

```
Task type is stored in the JSON prompt as:
  task.type         → "articulation" | "fluency" | "cognition"
  prompt.task_mode  → "word_drill" | "sentence_read" | "free_speech" | 
                      "roleplay" | "debate" | "stuttering"
```

### Mode 1: Word Drill (minimal pairs, phoneme drills, word lists)

```
Reference text EXISTS — compare against it

SpeechScore =
  0.65 × PhonemeAccuracy (target phonemes only)
+ 0.25 × WordAccuracy    (forced alignment vs reference)
+ 0.10 × ConfidenceScore

Note: Fluency and SpeechRate NOT included
      — word drills are not fluency tasks
      — pauses between words are expected and correct
```

### Mode 2: Sentence Reading (read a given sentence aloud)

```
Reference text EXISTS — full sentence comparison

SpeechScore =
  0.45 × PhonemeAccuracy  (all phonemes in sentence)
+ 0.25 × WordAccuracy     (forced alignment vs reference)
+ 0.20 × FluencyScore     (pauses + disfluencies)
+ 0.10 × SpeechRateScore  (sentence-appropriate rate)
```

### Mode 3: Paragraph Reading (multi-sentence read-aloud)

```
Reference text EXISTS — full paragraph comparison

SpeechScore =
  0.35 × PhonemeAccuracy
+ 0.25 × WordAccuracy
+ 0.25 × FluencyScore
+ 0.15 × SpeechRateScore
```

### Mode 4: Free Speech (roleplay, diary, description, opinion)

```
NO reference text — cannot compare words
Phoneme accuracy measured against PHONEME DISTRIBUTION
(are the hard phonemes for this defect being produced correctly)

SpeechScore =
  0.40 × PhonemeAccuracy  (defect-specific phonemes only)
+ 0.35 × FluencyScore     (disfluencies + pauses)
+ 0.15 × SpeechRateScore  (task-appropriate rate)
+ 0.10 × ConfidenceScore

WordAccuracy = NOT USED (no reference text)
```

### Mode 5: Stuttering Management Tasks

```
Fluency IS the primary measure
Word accuracy irrelevant — user speaks their own content

SpeechScore =
  0.55 × FluencyScore          (disfluency rate + pauses)
+ 0.25 × PhonemeAccuracy       (are target onset phonemes smooth)
+ 0.20 × SpeechRateScore       (controlled rate = technique use)

Special stuttering metrics added:
  - technique_use_score:   did the user apply gentle onset / pull-out / cancellation?
  - block_frequency:       number of hard blocks per 100 syllables
  - secondary_behaviour:   head movements, eye blinks (camera-based, optional)
```

### Mode 6: Debate / Presentation / Extended Monologue

```
NO reference text — evaluated on fluency + engagement

SpeechScore =
  0.30 × FluencyScore          (disfluencies + pauses)
+ 0.30 × PhonemeAccuracy       (defect phonemes in free speech)
+ 0.25 × SpeechRateScore       (presentation-appropriate rate)
+ 0.15 × ConfidenceScore
```

---

# 🔢 SECTION 3 — Engagement Score (Fixed)

## 3.1 Emotion Scoring — Fixed

**Problem with v1:** Raw emotion probabilities used directly with arbitrary weights. Surprise scored at 0.9 — but surprise on a clinical task means confusion, not engagement.

**Fix:** Context-appropriate emotion mapping per task type.

```
For CHILD tasks:
EngagementEmotion =
  happy    × 1.0
+ excited  × 0.9   ← replaces surprise
+ neutral  × 0.6
+ surprised × 0.5  ← not excitement, just acknowledgement
+ sad      × 0.2
+ angry    × 0.1
+ fearful  × 0.1   ← anxiety on task = low engagement

For ADULT tasks:
EngagementEmotion =
  positive_affect × 1.0   ← happy + excited grouped
+ neutral         × 0.7
+ focused         × 0.8   ← neutral + high confidence = focused
+ sad             × 0.3
+ angry           × 0.2
+ fearful         × 0.2

EmotionScore = EngagementEmotion × 100
```

## 3.2 Behavioural Score — Now Fully Defined

**Problem with v1:** BehavioralScore listed as "normalised 0–100" with no formula.

```
BehavioralScore is computed from 3 measurable signals:

Signal 1 — Response Latency (RL)
  Time from mic activation to user starting to speak
  
  RL_score:
    0.0 – 1.0 seconds  → 100  (immediate, engaged)
    1.0 – 2.5 seconds  → 80   (slight hesitation)
    2.5 – 5.0 seconds  → 60   (notable delay)
    5.0 – 10.0 seconds → 30   (long hesitation)
    > 10 seconds       → 0    (no attempt / gave up)

Signal 2 — Task Completion (TC)
  Did the user complete the full required output?
  
  For word drills:
    TC = (words_spoken / words_required) × 100
  
  For timed tasks (e.g. 60-second diary):
    TC = min(actual_duration / target_duration, 1.0) × 100
  
  For open-ended tasks:
    TC = 100 if at least 50% of minimum required length produced
         else proportional

Signal 3 — Attempt Quality (AQ)
  Did the user attempt what was asked
  (not just silence, humming, or off-topic speech)?
  
  AQ = 100 if topic/content relevance score ≥ 0.60
       50  if partial attempt detected
       0   if no relevant speech detected

BehavioralScore = 0.40 × RL_score + 0.35 × TC + 0.25 × AQ
```

## 3.3 Final Engagement Score

```
FinalEngagement = 0.65 × EmotionScore + 0.35 × BehavioralScore
```

Changed from v1 (0.70/0.30) to give more weight to behavioural signals which are more reliable than emotion classification on short audio clips.

---

# 🔢 SECTION 4 — Multimodal Fusion (Task-Aware)

## Problem with v1: Fixed 0.75/0.25 split for all tasks.

## Fix: Fusion weights vary by task type.

```
┌─────────────────────────────┬────────────┬────────────────┐
│ Task Mode                   │ SpeechScore│ EngagementScore│
│                             │ Weight     │ Weight         │
├─────────────────────────────┼────────────┼────────────────┤
│ Word drill                  │ 0.95       │ 0.05           │
│ Sentence reading            │ 0.90       │ 0.10           │
│ Paragraph reading           │ 0.85       │ 0.15           │
│ Free speech / roleplay      │ 0.75       │ 0.25           │
│ Stuttering management       │ 0.60       │ 0.40           │
│ Debate / presentation       │ 0.70       │ 0.30           │
│ Child gamified tasks        │ 0.65       │ 0.35           │
└─────────────────────────────┴────────────┴────────────────┘

FinalScore = SpeechWeight × SpeechScore + EngagementWeight × EngagementScore
```

---

# 🔢 SECTION 5 — Rule-Based Adjustments (Fixed)

## v1 Rules — Kept and Extended

```
Rule 1 — Low Engagement Penalty (kept from v1, adjusted)
  IF FinalEngagement < 35:
    FinalScore -= 5        ← reduced from 8 (less harsh)

Rule 2 — High Engagement Boost (kept from v1)
  IF FinalEngagement > 85:
    FinalScore += 5

Rule 3 — Severe Phoneme Failure Override (kept from v1)
  IF PhonemeAccuracy < 35:
    FinalScore = min(FinalScore, 45)

Rule 4 — NEW: Low Confidence Flag
  IF ConfidenceScore < 50:
    FinalScore → flagged as "low confidence — review recommended"
    FinalScore is stored but NOT used for adaptive difficulty decision

Rule 5 — NEW: Warmup vs Exercise Gate
  IF prompt_type == "warmup":
    FinalScore is NOT used for adaptive difficulty
    FinalScore IS stored for progress tracking
    Only BehavioralScore is used to check: "did the user attempt it?"

Rule 6 — NEW: Baseline Comparison Adjustment
  ProgressScore = FinalScore − patient.baseline_score_for_this_task
  
  IF ProgressScore > 0:  patient is improving  → encourage
  IF ProgressScore < 0:  patient is declining  → flag for review
  
  Adaptive difficulty uses ProgressScore, not absolute FinalScore alone
```

---

# 🔢 SECTION 6 — Adaptive Difficulty Logic (New)

```
After each EXERCISE prompt (not warmup):

  current_score = FinalScore (from this attempt)
  
  Advance to next level:
    IF current_score ≥ advance_threshold (default 75%)
    AND last_2_attempts also ≥ 70%
    → move to next difficulty level

  Stay at current level:
    IF current_score between 55% and 74%
    → repeat current level (max 3 attempts)

  Drop to easier level:
    IF current_score < 55%
    OR 3 consecutive attempts all < 60%
    → drop one difficulty level
    → notify clinician

  Special rule for stuttering tasks:
    advance_threshold = 70% (lower — technique use is the goal)
    drop_threshold = 45%
```

---

# 🔢 SECTION 7 — Per-Defect Phoneme Priority

## The Most Important Fix

Different defects need different phoneme accuracy thresholds.
A dysarthria patient at PA=65% may be clinically excellent.
An articulation disorder patient at PA=65% needs more work.

```
Defect-specific minimum pass thresholds for PA:

┌──────────────────────────────┬────────────┬──────────────────────────────┐
│ Defect                       │ Min PA%    │ Target Phonemes               │
│                              │ to Pass    │                               │
├──────────────────────────────┼────────────┼──────────────────────────────┤
│ Articulation /r/             │ 80%        │ /r/ in all positions          │
│ Articulation /s/ /z/         │ 80%        │ /s/, /z/ in all positions     │
│ Articulation /l/             │ 80%        │ /l/ in all positions          │
│ Phonological disorder        │ 75%        │ final consonants, clusters    │
│ Dysarthria                   │ 60%        │ all consonants (severity adj) │
│ AOS                          │ 65%        │ consistency across attempts   │
│ Adult articulation /r/ /l/   │ 82%        │ /r/, /l/ in connected speech  │
│ Hypernasality                │ 70%        │ /p/, /b/, /t/, /d/ pressure   │
│ Cluttering                   │ 75%        │ all consonants at fast rate   │
│ Stuttering                   │ 70%        │ onset phonemes (smoothness)   │
└──────────────────────────────┴────────────┴──────────────────────────────┘

PA_pass = PA ≥ defect_minimum_threshold
```

---

# 🔢 SECTION 8 — Performance Classification (Fixed)

## Problem with v1: Absolute thresholds mean nothing without baseline.

## Fix: Two-level classification — absolute + relative to baseline.

### Absolute Score Levels

```
Child:
  90 – 100  → Excellent
  75 – 89   → Good
  55 – 74   → Developing
  < 55      → Needs Support

Adult:
  88 – 100  → Excellent
  75 – 87   → Good
  60 – 74   → Developing
  < 60      → Needs Support
```

### Relative to Baseline (Progress Classification)

```
ProgressDelta = CurrentScore − BaselineScore

+15 or more   → Strong Progress
+5 to +14     → Steady Progress
−4 to +4      → Maintained
−5 to −14     → Slight Regression — monitor
−15 or less   → Significant Regression — escalate to clinician
```

### Combined Display to User / Clinician

```
"Score: 72 / 100 — Developing"
"Progress: +8 points above your starting score — Steady Progress ↑"
```

---

# 🔢 SECTION 9 — Final Output Structure (Extended)

```json
{
  "attempt_id": "uuid",
  "patient_id": "uuid",
  "task_id": 2,
  "prompt_id": 7,
  "prompt_type": "exercise",
  "task_mode": "word_drill",
  "defect_id": "AD010",

  "raw_metrics": {
    "word_accuracy": 83.3,
    "phoneme_accuracy": 66.7,
    "fluency_score": null,
    "speech_rate_wpm": 72,
    "speech_rate_score": 95.0,
    "confidence_score": 88.0
  },

  "target_phoneme_results": {
    "target_phoneme": "/r/",
    "words_checked": ["road", "red", "run"],
    "results": {
      "road": { "produced": "/w/", "correct": false, "score": 0.0 },
      "red":  { "produced": "/r/", "correct": true,  "score": 1.0 },
      "run":  { "produced": "/r/", "correct": true,  "score": 1.0 }
    },
    "target_pa": 66.7
  },

  "speech_score": 74.2,
  "engagement_score": 81.0,
  "final_score": 74.6,

  "adaptive_decision": "stay",
  "pass_fail": "fail",
  "fail_reason": "/w/ substitution on 'road' onset",

  "performance_level": "Developing",
  "progress_delta": "+6.2 above baseline",
  "progress_classification": "Steady Progress",

  "low_confidence_flag": false,
  "review_recommended": false,

  "feedback": {
    "positive": "Great — 'red' and 'run' both started with a clear /r/ sound.",
    "target": "Try 'road' again — make sure your tongue is raised inside your mouth before you start the word, not your lips coming together.",
    "next_action": "Repeat current level"
  }
}
```

---

# 🚀 SECTION 10 — Complete System Flow (Updated)

```
USER SPEECH INPUT
      ↓
App delivers instruction (TTS) — mic NOT recording
      ↓
Mic activates — records USER SPEECH ONLY
      ↓
┌─────────────────────────────────────────────┐
│  PARALLEL PROCESSING                        │
│                                             │
│  Whisper ASR → transcript + timestamps      │
│  Wav2Vec2    → forced alignment vs          │
│               speech_target phonemes        │
│  Emotion model → probabilities              │
│  Timestamp analysis → pauses, rate         │
└─────────────────────────────────────────────┘
      ↓
Determine task_mode from prompt JSON
      ↓
Apply task_mode specific formula:
  word_drill / sentence_read / paragraph_read
  / free_speech / stuttering / debate
      ↓
SpeechScore calculated
      ↓
EngagementScore calculated
      ↓
Task-aware Multimodal Fusion
      ↓
Rule-Based Adjustments applied
      ↓
Compare against patient baseline
      ↓
Adaptive difficulty decision
      ↓
Performance level + progress classification
      ↓
Feedback generated
      ↓
Store to database (full output structure)
```

---

# 🎯 One-Line Panel Explanation (Updated)

> "We designed a task-aware multimodal speech evaluation system that applies different scoring formulas per task type, compares phoneme output against explicit target sequences using forced alignment, and benchmarks each attempt against the patient's own baseline to produce clinically meaningful adaptive feedback."

---

# 📋 What Changed from v1 to v2

| Component | v1 | v2 |
|---|---|---|
| Word Accuracy | Whisper output only | Forced alignment vs reference text |
| Phoneme Accuracy | Aligned to transcript | Aligned to target phoneme sequence |
| Fluency | Pause penalty only | Disfluency rate + pause type classification |
| Speech Rate | Fixed ideal WPM | Task-type specific WPM range |
| Speech Score weights | Same for all tasks | 6 different formulas by task mode |
| Fusion weights | Fixed 0.75/0.25 | 7 different weights by task mode |
| Engagement | Raw emotion × fixed weights | Context-aware emotion + defined behavioural formula |
| Warmup handling | Scored same as exercise | Warmup = attempt detection only, not scored |
| Performance levels | Absolute thresholds | Absolute + relative to patient baseline |
| Phoneme pass threshold | None | Per-defect minimum PA threshold |
| Adaptive difficulty | Not defined | Explicit advance/stay/drop rules |
| Feedback | Not defined | Positive + target + next action per attempt |
