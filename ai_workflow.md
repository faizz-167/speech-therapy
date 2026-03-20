# AI Integration Workflow
## Speech Therapy Platform · 5 Components · Complete Pipeline

---

## 500-Word System Prompt

> Copy this directly into your system prompt field alongside the task JSON.

---

You are the AI evaluation engine for an adaptive speech therapy platform. Your job is to score every spoken attempt by a patient and return a structured result that drives adaptive difficulty decisions and clinician reporting.

You operate as a pipeline of five components.

**Component 1 — Whisper (Speech-to-Text).** Run on every attempt without exception. Transcribe the raw audio and extract word-level timestamps and token confidence scores. Use the transcript to calculate Word Accuracy by comparing against `speech_target.words` from the prompt JSON. Use timestamps to calculate Fluency Score by detecting pause gaps, repetitions, and filler words. Calculate Speech Rate in words per minute and compare against the ideal range for the task mode. Calculate Confidence Score as the mean token probability across all words.

**Component 2 — HuBERT CTC Forced Alignment (Phoneme Accuracy).** Run on `word_drill`, `sentence_read`, and `paragraph_read` tasks. Use the model `facebook/hubert-base-ls960` as primary and `facebook/wav2vec2-base-960h` as fallback. Force-align the audio against the target phoneme sequence defined in `evaluation_target.target_phonemes` from the prompt JSON. Score each target word: correct production scores 1.0, substitution scores 0.0, distortion scores 0.5. Calculate Phoneme Accuracy as the percentage of target phonemes correctly produced. Do not run on free_speech tasks unless defect-specific phonemes are defined.

**Component 3 — spaCy NLP (Content Scoring).** Run only on `free_speech` and `roleplay` tasks. Take the Whisper transcript as input. Use Named Entity Recognition to identify the WHO element. Use dependency parsing to identify subject clauses for the TOPIC element. Detect agreement and result language for the OUTCOME element. Score each required element from `speech_target.required_elements` as present or absent. Calculate ContentScore as the percentage of required elements confirmed at sufficient clarity. Do not run on `word_drill` or `sentence_read` tasks.

**Component 4 — SpeechBrain Emotion Recognition (Engagement Score).** Run on every attempt in parallel with Whisper. Use the model `speechbrain/emotion-recognition-wav2vec2-IEMOCAP`. Map emotion probabilities to an engagement score using context-appropriate weights. Combine with behavioural signals: response latency, task completion, and attempt quality. Apply fusion weights based on task mode: word drills weight speech at 0.95 and engagement at 0.05; stuttering tasks weight speech at 0.60 and engagement at 0.40. If frustration exceeds 0.40 on two consecutive attempts, automatically drop difficulty.

**Component 5 — Rule Engine (Adaptive Intelligence).** Apply the task-mode specific formula to calculate SpeechScore. Apply multimodal fusion to calculate FinalScore. Apply rule-based adjustments: cap FinalScore at 45 if PhonemeAccuracy is below 35. Compare FinalScore against `adaptive_thresholds` from the prompt JSON. Require two consecutive passing attempts to advance and three consecutive failures to drop. Select feedback text from `feedback_rules` based on pass, partial, or fail outcome. Store the full result to the database including per-word phoneme errors for clinician review. Never use warmup prompt scores for adaptive difficulty decisions.

---

## The 5 AI Components

---

### Component 1 — Whisper

| Field | Value |
|---|---|
| **Library** | `openai-whisper` |
| **Model** | `whisper-base` (74 MB) · `whisper-small` (244 MB) |
| **Install** | `pip install openai-whisper` |
| **Runs on** | CPU / GPU |
| **When it runs** | Every attempt — all 30 tasks, all task modes |

**What it gives you:**

- `WA` — Word Accuracy (transcript vs `speech_target.words`)
- `FS` — Fluency Score (pause detection + disfluency rate)
- `SRS` — Speech Rate Score (WPM vs task-ideal range)
- `CS` — Confidence Score (mean token probability)
- Full transcript text
- Word-level timestamps
- Filler word count (um / uh / er)

---

### Component 2 — HuBERT CTC Forced Alignment

| Field | Value |
|---|---|
| **Library** | `transformers` + `torch` + `torchaudio` |
| **Primary model** | `facebook/hubert-base-ls960` (300 MB) ⭐ |
| **Fallback model** | `facebook/wav2vec2-base-960h` (360 MB) |
| **Install** | `pip install transformers torch torchaudio` |
| **Runs on** | CPU / GPU |
| **When it runs** | `word_drill` · `sentence_read` · `paragraph_read` tasks only |

**What it gives you:**

- `PA` — Phoneme Accuracy (forced alignment vs target phoneme sequence)
- Per-word phoneme result (correct / substitution / distortion)
- Substitution detection — e.g. `/w/` instead of `/r/`
- Onset phoneme isolation per target word
- Confidence score per phoneme

> **Why HuBERT over wav2vec2:** HuBERT uses offline cluster targets during training making it more stable and more robust on accented or atypical speech — important for therapy patients.

---

### Component 3 — spaCy NLP

| Field | Value |
|---|---|
| **Library** | `spacy` |
| **Model** | `en_core_web_md` (40 MB) — recommended |
| **Install** | `pip install spacy` then `python -m spacy download en_core_web_md` |
| **Runs on** | CPU |
| **When it runs** | `free_speech` and `roleplay` tasks only — input is Whisper transcript |

**What it gives you:**

- `ContentScore` — percentage of `required_elements` confirmed
- **WHO** element — Named Entity Recognition detects person + role
- **TOPIC** element — dependency parsing finds subject clause after `about` / `regarding`
- **OUTCOME** element — agreement language detection (`agreed` / `decided` / `resolved`)
- Required element coverage per attempt

> **Does NOT run on:** `word_drill`, `sentence_read`, `paragraph_read` — those tasks have reference text so HuBERT handles scoring directly.

---

### Component 4 — SpeechBrain Emotion Recognition

| Field | Value |
|---|---|
| **Library** | `speechbrain` |
| **Model** | `speechbrain/emotion-recognition-wav2vec2-IEMOCAP` (90 MB) |
| **Install** | `pip install speechbrain` |
| **Runs on** | CPU / GPU |
| **When it runs** | Every attempt — runs in **parallel** with Whisper on same audio |

**What it gives you:**

- `EngagementScore` — combined emotion + behavioural signal
- Emotion probabilities: `happy` · `neutral` · `sad` · `angry` · `frustrated` · `fearful`
- Frustration flag — triggers auto-drop if > 0.40 on 2 consecutive attempts
- Behavioural score from response latency + task completion + attempt quality

**Fusion weights by task mode:**

| Task Mode | Speech Weight | Engagement Weight |
|---|---|---|
| `word_drill` | 0.95 | 0.05 |
| `sentence_read` | 0.90 | 0.10 |
| `paragraph_read` | 0.85 | 0.15 |
| `free_speech` | 0.75 | 0.25 |
| `stuttering` | 0.60 | 0.40 |
| `roleplay / debate` | 0.70 | 0.30 |

---

### Component 5 — Rule Engine

| Field | Value |
|---|---|
| **Library** | Pure Python — no extra install |
| **Model** | None |
| **Install** | None |
| **Runs on** | CPU |
| **When it runs** | After every **exercise** prompt attempt — reads `adaptive_thresholds` from JSON |

**What it gives you:**

- `FinalScore` — task-mode formula applied then multimodal fusion
- Advance / Stay / Drop decision per attempt
- Consecutive attempt tracking (2 passes to advance, 3 fails to drop)
- Feedback text selected from `feedback_rules.pass` / `.partial` / `.fail`
- Progress delta vs patient baseline
- Clinician alert when score drops 15+ points
- Auto-drop trigger on frustration detection from SpeechBrain

> **Warmup rule:** Warmup prompt scores are **never** used for adaptive difficulty. Only exercise prompts drive the advance/stay/drop logic.

---

## Model Sizes and Memory

| Component | Library | Model Size | RAM Needed | Load Time |
|---|---|---|---|---|
| Whisper | openai-whisper | 244 MB | ~1 GB | ~4s |
| HuBERT CTC | transformers | 300 MB | ~1 GB | ~3s |
| spaCy NLP | spacy | 40 MB | ~200 MB | ~1s |
| SpeechBrain | speechbrain | 90 MB | ~400 MB | ~2s |
| Rule Engine | Python | 0 MB | ~50 MB | instant |
| **TOTAL** | — | **~674 MB** | **~2.65 GB** | **~10s** |

> **Recommendation:** Load all models at server startup and keep them in memory. Do not reload per request. Use GPU if available — 3–5x faster inference.

---

## End-to-End Pipeline Flow

```
USER SPEAKS
    ↓
App shows instruction → user reads it → taps mic button
Microphone activates ONLY after instruction is dismissed
Raw audio recorded (.wav) → sent to backend with prompt_id
    ↓
PARALLEL PROCESSING  (all 3 run simultaneously)
    ↓                       ↓                      ↓
Whisper               HuBERT CTC              SpeechBrain
transcript +          forced alignment         emotion
timestamps +          on target phonemes       probabilities
confidence            (ref-text tasks only)
    ↓
READ task_mode FROM PROMPT JSON
    ↓
word_drill / sentence_read / paragraph_read → HuBERT scores used
free_speech / roleplay                      → spaCy NLP runs on transcript
stuttering                                  → fluency + onset smoothness
    ↓
spaCy NLP  (free_speech / roleplay only)
    WHO element   → Named Entity Recognition
    TOPIC element → subject clause detection
    OUTCOME element → agreement language
    ContentScore = % of required_elements confirmed
    ↓
SCORE CALCULATION
    SpeechScore = task_mode formula (PA + WA + FS + SRS + CS)
    EngagementScore = 0.65 × EmotionScore + 0.35 × BehavioralScore
    FinalScore = SpeechWeight × SpeechScore + EngagementWeight × EngagementScore
    Rule: if PA < 35 → cap FinalScore at 45
    Free speech: FinalScore = 0.60 × SpeechScore + 0.40 × ContentScore
    ↓
ADAPTIVE DECISION  (exercise prompts only)
    FinalScore >= advance threshold AND 2 consecutive passes → ADVANCE
    FinalScore between drop and advance                      → STAY
    FinalScore < drop threshold OR 3 consecutive fails      → DROP
    Frustration > 0.40 on 2 consecutive attempts            → AUTO-DROP
    Warmup prompts → behavioral check only, never advances level
    ↓
FEEDBACK + DATABASE STORAGE
    Select feedback from feedback_rules.pass / .partial / .fail
    Store: transcript + per-word phoneme errors + score breakdown
    Calculate progress_delta vs patient baseline
    Flag clinician if regression detected (drop of 15+ points)
    Return final_score + feedback_text + adaptive_decision to app
```

---

## Scoring Formulas by Task Mode

| Task Mode | Speech Score Formula | Fusion |
|---|---|---|
| `word_drill` | `0.65×PA + 0.25×WA + 0.10×CS` | Speech 0.95 / Eng 0.05 |
| `sentence_read` | `0.45×PA + 0.25×WA + 0.20×FS + 0.10×SRS` | Speech 0.90 / Eng 0.10 |
| `paragraph_read` | `0.35×PA + 0.25×WA + 0.25×FS + 0.15×SRS` | Speech 0.85 / Eng 0.15 |
| `free_speech` | `0.40×PA + 0.35×FS + 0.15×SRS + 0.10×CS` | Speech 0.75 / Eng 0.25 |
| `stuttering` | `0.55×FS + 0.25×PA + 0.20×SRS` | Speech 0.60 / Eng 0.40 |
| `roleplay / debate` | `0.30×FS + 0.30×PA + 0.25×SRS + 0.15×CS` | Speech 0.70 / Eng 0.30 |

---

## Metric Reference

| Metric | Full Name | Tool | Used On |
|---|---|---|---|
| `PA` | Phoneme Accuracy | HuBERT CTC | `word_drill`, `sentence_read`, `paragraph_read` |
| `WA` | Word Accuracy | Whisper ASR | `word_drill`, `sentence_read`, `paragraph_read` |
| `FS` | Fluency Score | Whisper timestamps | All tasks |
| `SRS` | Speech Rate Score | Whisper timestamps | All tasks |
| `CS` | Confidence Score | Whisper | All tasks |
| `ContentScore` | Content Score | spaCy NLP | `free_speech`, `roleplay` only |
| `EngagementScore` | Engagement Score | SpeechBrain | All tasks (weight varies) |

---

## Integration Order

| Phase | Component | Install | Unlocks |
|---|---|---|---|
| ✅ Now | Whisper | `pip install openai-whisper` | WA · FS · SRS · CS — 4 of 5 metrics |
| ✅ Now | HuBERT CTC | `pip install transformers torch torchaudio` | PA — full clinical pipeline complete |
| Week 2 | spaCy | `pip install spacy` + `python -m spacy download en_core_web_md` | ContentScore for all free_speech tasks (21–30) |
| Week 3 | SpeechBrain | `pip install speechbrain` | EngagementScore + frustration detection + auto-drop |
| Week 4 | Rule Engine | No install — pure Python | Consecutive tracking + clinician alerts + progress delta |

---

## Full Install Command

```bash
pip install torch torchaudio transformers openai-whisper \
            speechbrain spacy librosa soundfile \
            numpy fastapi uvicorn sqlalchemy psycopg2-binary

python -m spacy download en_core_web_md
```

---

## Processing Time Per Attempt

| Mode | CPU (no GPU) | GPU (T4+) |
|---|---|---|
| Sequential | 3.5 – 7 seconds | 0.5 – 1.5 seconds |
| Parallel (recommended) | 2 – 4 seconds | 0.5 – 1 second |

> Run Whisper + HuBERT + SpeechBrain in parallel using `ThreadPoolExecutor` or `asyncio`. spaCy runs on text only and takes < 50ms — run it after Whisper completes.

---

## Rule-Based Adjustments

```
IF phoneme_accuracy < 35:
    FinalScore = min(FinalScore, 45)      # severe failure cap

IF engagement < 35:
    FinalScore -= 5                       # low engagement penalty

IF engagement > 85:
    FinalScore += 5                       # high engagement boost

IF frustration > 0.40 on 2 consecutive attempts:
    adaptive_decision = "auto_drop"       # frustration override

IF prompt_type == "warmup":
    adaptive_decision = "not_applied"     # warmup never drives level change
```

---

*Speech Therapy AI Platform · AI Integration Workflow · v1.0*
*Components: Whisper + HuBERT CTC + spaCy + SpeechBrain + Rule Engine*
