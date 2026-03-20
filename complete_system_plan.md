# Speech Therapy Platform — Complete System Build Plan
**Version**: 3.0 | **Schema**: 22 tables | **Stack**: FastAPI + React 19 + PostgreSQL

---

## Part 1 — Gap Analysis: Old Design vs New Schema

### What the old context.md described (but the schema now makes explicit)

| Old context assumption | New schema reality | Action required |
|---|---|---|
| Baseline assessment = single scored instrument | `baseline_section` (37) + `baseline_item` (217) give it internal structure | Build section-by-section assessment UI + `baseline_item_result` recording |
| Task selection was implicit / manual | `task_defect_mapping` (64 rows) explicitly maps tasks to defects | Task recommendation engine reads this bridge table |
| Therapist approval was assumed | `plan_task_assignment` is a formal approval gate with status enum | Add approval workflow UI and `PATCH /assignments/{id}/approve` endpoint |
| `patient_task_progress` was conceptual | Now has `consecutive_passes`, `consecutive_fails`, `overall_accuracy`, `current_level_id` | Rule engine must write to this after every `session_prompt_attempt` |
| Clinician alert was described in text | No DB column exists for it yet — **schema gap** | Add `clinician_alert BOOLEAN` + `progress_delta NUMERIC` to `patient_task_progress` |
| feedback_rule messages were referenced | `feedback_rule.pass_message / partial_message / fail_message` fully seeded | Frontend reads and displays these after each attempt result |
| spaCy NLP input was described as "speech_target" | `speech_target.raw_speech_target` (JSONB) is the exact source | Backend must parse this JSONB before passing to spaCy |
| `prompt.task_mode` drives scoring formula selection | 6 enum values: word_drill, sentence_read, paragraph_read, free_speech, roleplay, stuttering | `analysis_service.py` must switch on this exact enum |

### Net new components required (not in old context at all)

1. **Baseline Assessment Runner** — UI to step through `baseline_section` → `baseline_item`, capture clinician/patient scores, write `baseline_item_result` rows
2. **Defect Profile Builder** — after baseline completion, aggregate `baseline_item_result` scores → infer active defects → show defect profile to therapist
3. **Task Recommendation Panel** — query `task_defect_mapping` to surface relevant tasks for a patient's defect profile
4. **Plan Builder with Approval Gate** — therapist selects recommended tasks → `plan_task_assignment` rows created → therapist approves each → status flips to `approved`
5. **Progress Regression Monitor** — compute `progress_delta` per patient after each session; flag clinician alert if delta > 15 points
6. **Clinician Review Dashboard** — lists patients with active clinician alerts, shows regression details, allows alert dismissal

---

## Part 2 — Complete Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         React 19 Frontend                            │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Baseline │  │  Therapy  │  │   Session    │  │  Clinician    │  │
│  │ Assessment│  │ Plan UI   │  │   Runner     │  │  Dashboard    │  │
│  │  Runner  │  │ + Approval│  │ + Audio Cap. │  │  + Alerts     │  │
│  └────┬─────┘  └─────┬─────┘  └──────┬───────┘  └──────┬────────┘  │
└───────┼──────────────┼───────────────┼─────────────────┼────────────┘
        │  Axios HTTP  │               │                 │
┌───────┼──────────────┼───────────────┼─────────────────┼────────────┐
│       │         FastAPI + Uvicorn    │                 │            │
│  ┌────▼────┐  ┌──────▼──────┐  ┌────▼──────┐  ┌──────▼──────────┐  │
│  │baseline │  │  plan /     │  │  session  │  │  progress /     │  │
│  │router   │  │  assignment │  │  router   │  │  alert router   │  │
│  │         │  │  router     │  │           │  │                 │  │
│  └────┬────┘  └──────┬──────┘  └────┬──────┘  └──────┬──────────┘  │
│       │              │              │                 │             │
│  ┌────▼──────────────▼──────────────▼─────────────────▼──────────┐  │
│  │              SQLAlchemy Async ORM (asyncpg)                   │  │
│  └──────────────────────────┬───────────────────────────────────┘  │
│                             │                                       │
│  ┌──────────────────────────▼───────────────────────────────────┐  │
│  │                AI Pipeline (parallel async tasks)             │  │
│  │  Whisper ASR → HuBERT CTC → spaCy NLP → SpeechBrain SER     │  │
│  │                     ↓                                         │  │
│  │              analysis_service.py (Rule Engine)                │  │
│  │     reads: adaptive_threshold, feedback_rule, task_mode       │  │
│  │     writes: session_prompt_attempt, patient_task_progress     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
               ┌──────────────▼──────────────┐
               │    PostgreSQL (Neon)          │
               │    22 tables + 2 new cols     │
               └─────────────────────────────┘
```

---

## Part 3 — Database Modifications Required

### 3.1 Add two columns to `patient_task_progress`

```sql
ALTER TABLE patient_task_progress
  ADD COLUMN IF NOT EXISTS clinician_alert  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS progress_delta   NUMERIC(5,2);

CREATE INDEX IF NOT EXISTS idx_progress_alert ON patient_task_progress(clinician_alert)
  WHERE clinician_alert = TRUE;
```

**Why**: The context.md specifies "Clinician Alert: Flags session for manual review if there's a >15-point baseline regression, freezing adaptive upgrades locally." The current schema has no column to store this flag or the delta value.

### 3.2 Add `retry_message` to `feedback_rule`

```sql
ALTER TABLE feedback_rule
  ADD COLUMN IF NOT EXISTS retry_message TEXT;
```

**Why**: The context.md references "Send nuanced `retry_message` from JSON feedback banks" for the Stay state. The current `feedback_rule` table only has `pass_message`, `partial_message`, `fail_message`.

### 3.3 Add `audio_file_ref` to `session_prompt_attempt`

```sql
ALTER TABLE session_prompt_attempt
  ADD COLUMN IF NOT EXISTS audio_file_ref TEXT,
  ADD COLUMN IF NOT EXISTS emotion_label  TEXT,
  ADD COLUMN IF NOT EXISTS behavioral_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS wpm             NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS disfluency_count INTEGER,
  ADD COLUMN IF NOT EXISTS phoneme_accuracy NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS nlp_score       NUMERIC(5,2);
```

**Why**: The old context describes the AI pipeline producing WPM, disfluency count, phoneme accuracy, emotion label, behavioral score, and NLP score as separate signals. Storing these raw signals alongside the final `accuracy_score` enables per-signal analysis and regression detection.

### 3.4 Index additions for new query patterns

```sql
-- Clinician alert fast lookup
CREATE INDEX IF NOT EXISTS idx_ptp_alert    ON patient_task_progress(patient_id) WHERE clinician_alert = TRUE;
-- Baseline item result lookup by item
CREATE INDEX IF NOT EXISTS idx_bir_item     ON baseline_item_result(item_id);
-- Assignment approval workflow
CREATE INDEX IF NOT EXISTS idx_pta_status   ON plan_task_assignment(status);
```

---

## Part 4 — Backend: Complete File Structure

```
backend/
├── main.py                          # FastAPI app factory, CORS, lifespan
├── config.py                        # Settings (DB URL, model paths, env vars)
├── database.py                      # SQLAlchemy async engine + session factory
│
├── models/                          # SQLAlchemy ORM models (one file per domain)
│   ├── clinical.py                  # defect, baseline_assessment, baseline_section,
│   │                                #   baseline_item, baseline_defect_mapping
│   ├── tasks.py                     # task, task_level, prompt, speech_target,
│   │                                #   evaluation_target, prompt_scoring,
│   │                                #   adaptive_threshold, feedback_rule,
│   │                                #   task_defect_mapping
│   ├── workflow.py                  # therapist, patient, patient_baseline_result,
│   │                                #   baseline_item_result, therapy_plan,
│   │                                #   plan_task_assignment
│   └── session.py                   # session, session_prompt_attempt,
│                                    #   patient_task_progress
│
├── schemas/                         # Pydantic v2 request/response models
│   ├── clinical.py
│   ├── tasks.py
│   ├── workflow.py
│   └── session.py
│
├── routers/                         # FastAPI routers
│   ├── baseline.py                  # GET /baselines, /baselines/{id}/sections,
│   │                                #   /sections/{id}/items, POST /item-results
│   ├── defects.py                   # GET /defects, /defects/{id}/tasks
│   ├── patients.py                  # CRUD /patients, /patients/{id}/profile
│   ├── plans.py                     # POST /plans, GET /plans/{id},
│   │                                #   POST /plans/{id}/assignments,
│   │                                #   PATCH /assignments/{id}/approve
│   ├── sessions.py                  # POST /sessions, GET /sessions/{id}/queue,
│   │                                #   POST /sessions/{id}/submit-attempt
│   ├── progress.py                  # GET /patients/{id}/progress,
│   │                                #   GET /clinician/alerts,
│   │                                #   PATCH /progress/{id}/dismiss-alert
│   └── tasks.py                     # GET /tasks, /tasks/{id}/levels,
│                                    #   /levels/{id}/prompts
│
├── services/
│   ├── audio_service.py             # Audio file handling, format conversion (webm→wav)
│   ├── asr_service.py               # Whisper ASR: transcription, WPM, disfluency
│   ├── phoneme_service.py           # HuBERT CTC: forced alignment, phoneme accuracy
│   ├── nlp_service.py               # spaCy NLP: WHO/TOPIC/OUTCOME parsing
│   ├── emotion_service.py           # SpeechBrain SER: emotion + behavioral score
│   └── analysis_service.py          # Rule Engine: fusion weighting, adaptive logic,
│                                    #   clinician alert, patient_task_progress update
│
└── migrations/
    ├── schema.sql                   # Complete DDL (22 tables + 3 new columns)
    ├── migrate.py                   # JSON seed migration script
    └── alter_v2.sql                 # The 4 ALTER TABLE statements above
```

---

## Part 5 — Backend: Complete API Route Specification

### 5.1 Baseline & Clinical Routes (`/api/v1/baseline`)

```
GET  /baselines
     Response: [{ baseline_id, code, name, domain, administration_method }]
     Purpose: List all 12 instruments for intake selection

GET  /baselines/{baseline_id}/sections
     Response: [{ section_id, section_name, instructions, target_defect_id, order_index,
                  items: [{ item_id, item_label, stimulus_content, target_phoneme,
                             position, response_type, scoring_method, max_score }] }]
     Purpose: Full section+item tree for assessment runner

POST /baseline-results
     Body: { patient_id, baseline_id, therapist_id, assessed_on }
     Response: { result_id }
     Purpose: Open a new assessment session, get result_id for item scoring

POST /item-results
     Body: { result_id, item_id, score_given, error_noted?, clinician_note? }
     Response: { item_result_id }
     Purpose: Record one item score during assessment (called per item)

POST /baseline-results/{result_id}/complete
     Body: { raw_score, severity_rating, notes? }
     Response: { result_id, defect_profile: [{ defect_id, code, name, severity }] }
     Purpose: Finalise assessment, compute defect profile from item results
              Logic: aggregate item scores per defect → map via baseline_defect_mapping
```

### 5.2 Defect & Task Recommendation Routes (`/api/v1/defects`)

```
GET  /defects
     Response: [{ defect_id, code, name, category }]

GET  /defects/{defect_id}/recommended-tasks
     Response: [{ task_id, name, type, relevance_level, clinical_notes,
                  levels: [{ level_id, level_name, difficulty_score }] }]
     Purpose: Query task_defect_mapping to surface recommended tasks for a defect
              Sorted by: primary relevance first, then by task type matching defect category
```

### 5.3 Therapy Plan Routes (`/api/v1/plans`)

```
POST /plans
     Body: { patient_id, therapist_id, plan_name, start_date, end_date?, goals? }
     Response: { plan_id }

GET  /plans/{plan_id}
     Response: Full plan with assignments and their statuses

POST /plans/{plan_id}/assignments
     Body: { task_id, therapist_id, clinical_rationale? }
     Response: { assignment_id, status: "pending" }
     Purpose: Add a task to the plan (status starts as pending)

PATCH /assignments/{assignment_id}/approve
     Body: { therapist_id }
     Response: { assignment_id, status: "approved" }
     Purpose: Therapist approval gate — only approved tasks appear in sessions

DELETE /assignments/{assignment_id}
     Purpose: Remove a task from plan before session starts
```

### 5.4 Session Routes (`/api/v1/sessions`)

```
POST /sessions
     Body: { plan_id, patient_id, therapist_id?, session_type }
     Response: { session_id }

GET  /sessions/{session_id}/queue
     Response: {
       session_id,
       prompts: [{
         prompt_id, source_prompt_id, prompt_type, task_mode,
         display_content, instruction, scenario_context,
         speech_target: { raw_speech_target },
         evaluation_target: { scope, target_phonemes, substitution_errors, pass_rule },
         feedback_rule: { pass_message, partial_message, fail_message, retry_message },
         adaptive_threshold: { advance_to_next_level, drop_to_easier_level,
                               consecutive_to_advance, consecutive_to_drop }
       }]
     }
     Purpose: Returns the ordered prompt queue for the session,
              filtered to prompts at the patient's current_level_id for each task

POST /sessions/{session_id}/submit-attempt
     Body: multipart/form-data {
       prompt_id: string,
       attempt_number: integer,
       response_latency_sec: integer,
       audio: File (.webm)
     }
     Response: {
       attempt_id,
       result: "pass"|"partial"|"fail",
       accuracy_score: float,
       feedback_message: string,       ← from feedback_rule
       adaptive_action: "advance"|"stay"|"drop"|"clinician_alert",
       next_level: { level_id, level_name, difficulty_score } | null,
       breakdown: {
         asr:  { transcript, wpm, disfluency_count },
         phoneme: { accuracy, per_word: [{word, status, expected_phoneme}] },
         emotion: { label, behavioral_score },
         nlp:  { topic_score, who_score, outcome_score } | null
       }
     }
     Purpose: Core AI pipeline entry point — runs all 5 components in parallel,
              fuses scores, applies adaptive logic, updates patient_task_progress
```

### 5.5 Progress & Alerts Routes (`/api/v1/progress`)

```
GET  /patients/{patient_id}/progress
     Response: [{
       task_id, task_name, task_type,
       current_level: { level_name, difficulty_score },
       consecutive_passes, consecutive_fails,
       overall_accuracy, clinician_alert, progress_delta,
       last_attempted_at
     }]

GET  /clinician/alerts
     Query: therapist_id
     Response: [{
       patient_id, patient_name,
       task_id, task_name,
       progress_delta, overall_accuracy,
       last_attempted_at
     }]
     Purpose: Dashboard feed for clinician review panel

PATCH /progress/{progress_id}/dismiss-alert
     Body: { therapist_id, resolution_note? }
     Response: { progress_id, clinician_alert: false }
```

---

## Part 6 — AI Pipeline: Complete `analysis_service.py` Specification

### 6.1 The 6 Task-Mode Scoring Formulas

```python
SCORING_WEIGHTS = {
    "word_drill": {
        "phoneme":   0.90,
        "behavioral": 0.10,
        "nlp":        0.00,
        "fluency":    0.00,
    },
    "sentence_read": {
        "phoneme":   0.70,
        "fluency":   0.20,
        "behavioral": 0.10,
        "nlp":        0.00,
    },
    "paragraph_read": {
        "phoneme":   0.50,
        "fluency":   0.35,
        "behavioral": 0.15,
        "nlp":        0.00,
    },
    "free_speech": {
        "phoneme":   0.30,
        "fluency":   0.25,
        "nlp":       0.30,
        "behavioral": 0.15,
    },
    "roleplay": {
        "nlp":       0.40,
        "phoneme":   0.25,
        "fluency":   0.20,
        "behavioral": 0.15,
    },
    "stuttering": {
        "fluency":   0.60,
        "behavioral": 0.25,
        "phoneme":   0.15,
        "nlp":        0.00,
    },
}
```

### 6.2 Adaptive Decision Logic (reads from DB)

```python
async def compute_adaptive_action(
    accuracy_score: float,
    threshold: AdaptiveThreshold,      # from DB: advance_to_next_level, drop_to_easier_level,
                                       #          consecutive_to_advance, consecutive_to_drop
    progress: PatientTaskProgress,     # from DB: consecutive_passes, consecutive_fails,
                                       #          overall_accuracy, clinician_alert
    emotion_behavioral_score: float,   # from SpeechBrain SER
) -> AdaptiveAction:

    # Frustration spike overrides threshold logic
    if emotion_behavioral_score < 0.60:   # frustration proxy
        if progress.consecutive_fails >= 2:
            return AdaptiveAction.DROP

    # Standard threshold logic (reads adaptive_threshold from DB)
    if accuracy_score >= threshold.advance_to_next_level:
        new_passes = progress.consecutive_passes + 1
        new_fails  = 0
        if new_passes >= threshold.consecutive_to_advance:
            return AdaptiveAction.ADVANCE
        return AdaptiveAction.STAY

    elif accuracy_score < threshold.drop_to_easier_level:
        new_fails  = progress.consecutive_fails + 1
        new_passes = 0
        if new_fails >= threshold.consecutive_to_drop:
            return AdaptiveAction.DROP
        return AdaptiveAction.STAY

    else:  # in stay range
        return AdaptiveAction.STAY


async def check_clinician_alert(
    patient_id: UUID,
    task_id: str,
    new_accuracy: float,
    db: AsyncSession,
) -> tuple[bool, float]:
    """
    Compare current accuracy against baseline (first recorded overall_accuracy).
    Flag clinician_alert=True if regression > 15 points.
    Freeze all ADVANCE actions while alert is active.
    """
    baseline_accuracy = await get_baseline_accuracy(patient_id, task_id, db)
    if baseline_accuracy is None:
        return False, 0.0
    delta = baseline_accuracy - new_accuracy
    if delta > 15.0:
        return True, delta
    return False, delta
```

### 6.3 Parallel Pipeline Execution

```python
async def run_pipeline(
    audio_path: str,
    prompt: PromptWithTargets,     # prompt + speech_target + evaluation_target
    latency_sec: int,
) -> PipelineResult:

    # Run all 4 components in parallel
    asr_task     = asyncio.create_task(run_whisper_asr(audio_path, prompt.task_mode))
    phoneme_task = asyncio.create_task(run_hubert_ctc(audio_path, prompt.evaluation_target))
    emotion_task = asyncio.create_task(run_speechbrain_ser(audio_path, latency_sec))

    asr_result, phoneme_result, emotion_result = await asyncio.gather(
        asr_task, phoneme_task, emotion_task
    )

    # NLP only runs for free_speech / roleplay
    nlp_result = None
    if prompt.task_mode in ("free_speech", "roleplay"):
        nlp_result = await run_spacy_nlp(
            transcript=asr_result.transcript,
            speech_target=prompt.speech_target.raw_speech_target,  # JSONB
        )

    # Fuse scores using task_mode formula
    final_score = fuse_scores(
        task_mode=prompt.task_mode,
        phoneme_score=phoneme_result.accuracy,
        fluency_score=asr_result.fluency_score,
        behavioral_score=emotion_result.behavioral_score,
        nlp_score=nlp_result.composite_score if nlp_result else 0.0,
    )

    return PipelineResult(
        accuracy_score=final_score,
        asr=asr_result,
        phoneme=phoneme_result,
        emotion=emotion_result,
        nlp=nlp_result,
    )
```

---

## Part 7 — Frontend: Complete Page & Component Map

### 7.1 Route Structure

```
/                               → LandingPage (role selector: Therapist / Patient)

── Therapist Portal (/therapist)
   /therapist/dashboard         → TherapistDashboard (alerts panel + recent sessions)
   /therapist/patients          → PatientList
   /therapist/patients/new      → PatientIntake (create patient + run baseline)
   /therapist/patients/:id      → PatientProfile (defect profile + progress charts)
   /therapist/patients/:id/baseline → BaselineRunner (section → item scorer)
   /therapist/patients/:id/plan → PlanBuilder (task picker + approval gate)
   /therapist/alerts            → ClinicalAlertsDashboard

── Patient Portal (/patient)
   /patient/dashboard           → PatientDashboard (today's session + progress)
   /patient/session/:id         → SessionRunner (prompt queue + audio capture)
   /patient/session/:id/result  → SessionResult (score breakdown + feedback)
   /patient/progress            → ProgressView (charts per task)
```

### 7.2 Key Component Specifications

#### `BaselineRunner` — The most complex new component

```
State machine: SELECTING_INSTRUMENT → RUNNING_SECTIONS → RUNNING_ITEMS → REVIEWING → COMPLETE

Props: patientId, therapistId

Flow:
1. Fetch GET /baselines → show instrument cards
2. On select → POST /baseline-results → get result_id
3. Fetch GET /baselines/{id}/sections → build section queue
4. For each section: show section_name + instructions header
5. For each item in section:
   - Display stimulus_content (picture name / passage text / question)
   - Show response_type-specific input:
     * picture_naming → clinician marks correct/error with phoneme error dropdown
     * read_aloud → audio recorder (patient reads, clinician scores)
     * clinician_rated → 0-3 or 0-5 scale slider (GRBAS/CAPE-V)
     * self_report → 1-5 Likert scale (OASES, ICS)
     * diadochokinesis → timer + regularity rating
   - POST /item-results for each scored item
6. POST /baseline-results/{id}/complete → receive defect_profile
7. Show DefectProfileSummary with radar chart
```

#### `SessionRunner` — Core therapy loop

```
State: LOADING → WARMUP → EXERCISE → FEEDBACK → ADVANCING → COMPLETE

Flow:
1. GET /sessions/{id}/queue → load prompt queue
2. For each prompt:
   a. Show scenario_context banner
   b. Show instruction text
   c. Render display_content (word pair / sentence / paragraph / roleplay scenario)
   d. Audio recorder: countdown → record → stop
   e. POST /sessions/{id}/submit-attempt with audio blob
   f. Show loading state (AI pipeline running, ~3-8s)
   g. On response: show FeedbackPanel
      - accuracy_score as animated gauge
      - result badge (PASS/PARTIAL/FAIL)
      - feedback_message from feedback_rule
      - breakdown accordion: ASR / Phoneme / Emotion / NLP tabs
      - adaptive_action indicator: "Level Up!" / "Try Again" / "Stepping Back"
3. On session complete → navigate to /session/{id}/result
```

#### `PlanBuilder` — Therapist approval workflow

```
Sections:
1. DefectSummary panel (radar chart of patient's defect profile)
2. RecommendedTasks panel
   - Fetches GET /defects/{id}/recommended-tasks for each active defect
   - Groups tasks by: primary recommendations / secondary / other
   - Each task card shows: name, type badge, defect match, levels available
   - "Add to Plan" button → POST /plans/{id}/assignments
3. PlanQueue panel (right sidebar)
   - Lists added tasks with status (pending / approved)
   - "Approve" button → PATCH /assignments/{id}/approve
   - Clinical rationale input field
   - "Start Session" button (only enabled if ≥1 approved assignment)
```

#### `TherapistDashboard` — Alert-first design

```
Layout:
┌─────────────────────────────────────────────────────┐
│  Active Alerts (red banner if any)                  │
│  Patient / Task / Regression delta / Last session   │
│  [Review Patient] [Dismiss Alert] buttons           │
├─────────────────────────────────────────────────────┤
│  Recent Sessions (last 7 days)                      │
│  Patient name / Task / Score / Adaptive action      │
├────────────────────┬────────────────────────────────┤
│  Top Struggling    │  Top Improving                 │
│  Patients          │  Patients                      │
│  (lowest overall   │  (highest delta positive)      │
│   accuracy)        │                                │
└────────────────────┴────────────────────────────────┘
```

---

## Part 8 — Complete Modification Prompt

> **Instructions**: Copy the entire section below into your AI coding agent (Cursor, GitHub Copilot, Gemini Code Assist, etc.) as the system/context prompt. It references the exact table names and column names from the 22-table schema.

---

```
SYSTEM: You are building a full-stack AI-Assisted Speech Therapy Platform.
Stack: Python 3 + FastAPI + SQLAlchemy (async) + PostgreSQL (Neon) | React 19 + Vite + Tailwind CSS v4.

══════════════════════════════════════════════════════════
DATABASE CONTEXT
══════════════════════════════════════════════════════════

The PostgreSQL database has 22 tables across 4 domains plus 3 new columns:

DOMAIN 1 — Clinical Reference (seeded, read-only at runtime):
  defect(defect_id TEXT PK, code, name, category, description)
  baseline_assessment(baseline_id TEXT PK, code, name, domain, description, administration_method)
  baseline_defect_mapping(mapping_id, baseline_id FK, defect_id FK, relevance_level, clinical_notes)
  baseline_section(section_id TEXT PK, baseline_id FK, section_name, instructions, target_defect_id FK→defect, order_index)
  baseline_item(item_id TEXT PK, section_id FK, item_label, stimulus_content, target_phoneme, position, response_type, scoring_method, max_score, order_index)

DOMAIN 2 — Task Library (seeded, read-only at runtime):
  task(task_id TEXT PK, source_id INT UNIQUE, name, type ENUM[articulation|fluency|cognition], description)
  task_level(level_id TEXT PK, task_id FK, level_name ENUM[easy|medium|advanced], difficulty_score INT)
  prompt(prompt_id TEXT PK, level_id FK, source_prompt_id INT UNIQUE, prompt_type ENUM[warmup|exercise],
         scenario_context, instruction, display_content, target_response, evaluation_criteria, accuracy_check, task_mode ENUM[word_drill|sentence_read|paragraph_read|free_speech|roleplay|stuttering])
  speech_target(speech_target_id TEXT PK, prompt_id FK UNIQUE, raw_speech_target JSONB)
  evaluation_target(eval_target_id TEXT PK, prompt_id FK UNIQUE, scope, target_phonemes JSONB,
                    check_on_words JSONB, substitution_errors JSONB, pass_rule, fail_rule, partial_pass)
  prompt_scoring(scoring_id TEXT PK, prompt_id FK UNIQUE, active BOOL,
                 note, response_latency_max_sec, minimum_speech_detected, task_completion_min_percent,
                 layer1_what, layer1_method, layer1_pass,
                 layer2_what, layer2_method, layer2_target_pairs JSONB, layer2_pass_threshold, layer2_fail_condition)
  adaptive_threshold(threshold_id TEXT PK, scoring_id FK UNIQUE,
                     advance_to_next_level INT, stay_at_current_level TEXT, drop_to_easier_level INT,
                     consecutive_to_advance INT, consecutive_to_drop INT)
  feedback_rule(feedback_id TEXT PK, prompt_id FK UNIQUE,
                pass_message, partial_message, fail_message, retry_message)  ← retry_message is new column
  task_defect_mapping(mapping_id TEXT PK, task_id FK, defect_id FK, relevance_level, clinical_notes)

DOMAIN 3 — Clinical Workflow (runtime, written at application runtime):
  therapist(therapist_id UUID PK, full_name, license_number UNIQUE, specialization, email UNIQUE)
  patient(patient_id UUID PK, full_name, date_of_birth, gender, primary_diagnosis, assigned_therapist_id FK→therapist)
  patient_baseline_result(result_id UUID PK, patient_id FK, baseline_id FK→baseline_assessment,
                          therapist_id FK, assessed_on, raw_score, percentile, severity_rating, notes)
  baseline_item_result(item_result_id UUID PK, result_id FK→patient_baseline_result,
                       item_id FK→baseline_item, score_given, error_noted, clinician_note)
  therapy_plan(plan_id UUID PK, patient_id FK, therapist_id FK, plan_name,
               start_date, end_date, status ENUM[draft|active|completed|paused|cancelled], goals)
  plan_task_assignment(assignment_id UUID PK, plan_id FK, task_id FK→task,
                       therapist_id FK, status ENUM[pending|approved|active|completed],
                       clinical_rationale, assigned_on)

DOMAIN 4 — Session & Progress (runtime, highest-volume):
  session(session_id UUID PK, plan_id FK, patient_id FK, therapist_id FK,
          session_date TIMESTAMPTZ, duration_minutes, session_type, session_notes)
  session_prompt_attempt(attempt_id UUID PK, session_id FK, prompt_id FK→prompt,
                         attempt_number, result ENUM[pass|partial|fail|skipped],
                         accuracy_score NUMERIC(5,2), response_latency_sec,
                         speech_detected, asr_transcript, therapist_override_note, attempted_at,
                         audio_file_ref, emotion_label, behavioral_score,    ← new columns
                         wpm, disfluency_count, phoneme_accuracy, nlp_score) ← new columns
  patient_task_progress(progress_id UUID PK, patient_id FK, task_id FK→task,
                        current_level_id FK→task_level, consecutive_passes, consecutive_fails,
                        overall_accuracy, last_attempted_at,
                        clinician_alert BOOL DEFAULT FALSE,  ← new column
                        progress_delta NUMERIC(5,2))         ← new column

══════════════════════════════════════════════════════════
BACKEND IMPLEMENTATION REQUIREMENTS
══════════════════════════════════════════════════════════

1. MODELS (SQLAlchemy async, in models/ directory):
   - Map every table above to a SQLAlchemy model class
   - Use TEXT PKs for all seed tables (defect, baseline_*, task, task_level, prompt, speech_target,
     evaluation_target, prompt_scoring, adaptive_threshold, feedback_rule, task_defect_mapping)
   - Use UUID PKs with server_default=text("gen_random_uuid()") for all runtime tables
   - JSONB columns use sa.JSON type with postgresql_using='jsonb'

2. ROUTERS — implement these exact endpoints:

   GET  /api/v1/baselines
   GET  /api/v1/baselines/{baseline_id}/sections          ← includes items nested
   POST /api/v1/baseline-results                          ← open assessment session
   POST /api/v1/item-results                              ← record one item score
   POST /api/v1/baseline-results/{result_id}/complete     ← finalize + compute defect profile

   GET  /api/v1/defects
   GET  /api/v1/defects/{defect_id}/recommended-tasks     ← query task_defect_mapping

   POST /api/v1/plans
   GET  /api/v1/plans/{plan_id}
   POST /api/v1/plans/{plan_id}/assignments
   PATCH /api/v1/assignments/{assignment_id}/approve
   DELETE /api/v1/assignments/{assignment_id}

   POST /api/v1/sessions
   GET  /api/v1/sessions/{session_id}/queue               ← full prompt payload
   POST /api/v1/sessions/{session_id}/submit-attempt      ← multipart with audio

   GET  /api/v1/patients/{patient_id}/progress
   GET  /api/v1/clinician/alerts?therapist_id=...
   PATCH /api/v1/progress/{progress_id}/dismiss-alert

3. AI PIPELINE (services/ directory):

   audio_service.py:
   - accept_webm_upload(file) → save to uploads/temp_{uuid}.webm
   - convert_to_wav(webm_path) → wav_path  (use ffmpeg subprocess)
   - cleanup(path) → delete temp file

   asr_service.py:
   - run_whisper(wav_path, task_mode) → { transcript, wpm, disfluency_count,
                                          fillers, fluency_score, token_confidences }
   - Model: openai/whisper-small
   - WPM ideal ranges by task_mode: word_drill(80-120), sentence_read(100-140),
     paragraph_read(110-150), free_speech(100-160), roleplay(90-150), stuttering(60-120)
   - disfluency detection: count tokens matching ["um","uh","uh-uh","er","like","you know"]
     plus adjacent word repetitions

   phoneme_service.py:
   - run_hubert_ctc(wav_path, evaluation_target_json) → {
       accuracy: float,
       per_word: [{ word, status: correct|substitution|distortion,
                    expected_phoneme, produced_phoneme, confidence }]
     }
   - Model: facebook/hubert-base-ls960
   - Fallback: wav2vec2-base-960h if HuBERT fails
   - evaluation_target_json.target_phonemes and .substitution_errors (JSONB) are
     the alignment targets

   nlp_service.py:  (only called for free_speech and roleplay task_mode)
   - run_spacy(transcript, speech_target_json) → {
       topic_score, who_score, outcome_score, composite_score
     }
   - speech_target_json is raw_speech_target JSONB from speech_target table
   - Model: en_core_web_md
   - topic_score: dep parse match vs speech_target required topics
   - who_score: NER match vs speech_target required entities
   - outcome_score: presence of required outcome phrases

   emotion_service.py:
   - run_ser(wav_path, latency_sec, audio_duration_sec) → {
       emotion_label, raw_emotion_scores,
       behavioral_score,   ← engagement/frustration composite
       frustration_score   ← 0.0-1.0, alert threshold > 0.40
     }
   - Model: speechbrain/emotion-recognition-wav2vec2-IEMOCAP
   - behavioral_score formula:
     engagement = min(audio_duration_sec / max(latency_sec, 1), 1.0)
     frustration = raw_emotion_scores.get("ang", 0) + raw_emotion_scores.get("fru", 0)
     behavioral_score = (engagement * 0.6) + ((1 - frustration) * 0.4)

   analysis_service.py:
   - SCORING_WEIGHTS dict for all 6 task_modes (see Part 6.1 above)
   - fuse_scores(task_mode, phoneme_score, fluency_score, behavioral_score, nlp_score) → float
   - compute_adaptive_action(accuracy_score, threshold_db_row, progress_db_row,
                              frustration_score) → "advance"|"stay"|"drop"|"clinician_alert"
     Rules:
       frustration_score > 0.40 AND consecutive_fails >= 2 → DROP immediately
       accuracy >= threshold.advance_to_next_level:
         consecutive_passes+1 >= threshold.consecutive_to_advance → ADVANCE
         else → STAY
       accuracy < threshold.drop_to_easier_level:
         consecutive_fails+1 >= threshold.consecutive_to_drop → DROP
         else → STAY
       else → STAY
   - update_patient_task_progress(db, patient_id, task_id, action, accuracy_score):
       reads current progress row
       updates consecutive_passes, consecutive_fails, overall_accuracy, current_level_id
       computes progress_delta vs first recorded accuracy
       sets clinician_alert=True if progress_delta > 15 AND action != "clinician_alert" already
   - select_feedback_message(feedback_rule_row, result, action) → str
       pass → feedback_rule.pass_message
       partial → feedback_rule.partial_message
       fail + action==stay → feedback_rule.retry_message
       fail + action==drop → feedback_rule.fail_message

4. SESSION SUBMIT ENDPOINT (full flow):
   POST /api/v1/sessions/{session_id}/submit-attempt
   a. Save audio → convert to WAV
   b. Load prompt + evaluation_target + speech_target + adaptive_threshold + feedback_rule from DB
   c. Run pipeline: asyncio.gather(whisper, hubert, speechbrain)  ← parallel
   d. If task_mode in (free_speech, roleplay): also await spacy
   e. fuse_scores() → accuracy_score
   f. Determine result: accuracy >= advance_threshold → pass; >= drop_threshold → partial; else fail
   g. compute_adaptive_action()
   h. Insert session_prompt_attempt row (all raw signal columns)
   i. update_patient_task_progress()
   j. select_feedback_message()
   k. DELETE temp audio file
   l. Return full response JSON (see route spec above)

══════════════════════════════════════════════════════════
FRONTEND IMPLEMENTATION REQUIREMENTS
══════════════════════════════════════════════════════════

Tech: React 19, Vite, React Router DOM v6, Tailwind CSS v4, Axios, React Hot Toast,
      Lucide React, Chart.js + react-chartjs-2, Geist Font

Design system: Neo-brutalist dark mode
  - Background: #0a0a0a
  - Surface: #111111
  - Border: 1px solid #2a2a2a (brutal sharp corners, no border-radius except pills)
  - Accent: #e8ff47 (electric yellow-green)
  - Danger: #ff4747
  - Success: #47ff8a
  - Warning: #ff9f47
  - Text primary: #f0f0f0
  - Text muted: #666666
  - Font: Geist (headings) + Geist Mono (scores, codes, phonemes)
  - No gradients except accent glow: box-shadow: 0 0 20px rgba(232,255,71,0.15)

Pages to build (in /src/pages/):

1. LandingPage.jsx
   - Role selector: two large brutal cards "I am a Therapist" / "I am a Patient"
   - Each navigates to respective portal

2. TherapistDashboard.jsx (/therapist/dashboard)
   - AlertsBanner component: red top bar if clinician_alert patients exist
     GET /api/v1/clinician/alerts?therapist_id={id}
   - RecentSessionsList: last 7 days activity
   - PatientProgressGrid: 2-col, Struggling / Improving

3. PatientIntake.jsx (/therapist/patients/new)
   - Multi-step form: Patient details → Select baseline instrument → Launch BaselineRunner
   - POST /api/v1/patients then POST /api/v1/baseline-results

4. BaselineRunner.jsx (/therapist/patients/:id/baseline)
   - Progress bar showing section X of Y, item X of N
   - SectionHeader: section_name + instructions card
   - ItemScorer: renders different input based on response_type:
     * picture_naming: correct/error toggle + phoneme error dropdown
     * clinician_rated: labeled scale (0-3 or 0-5) with dimension label
     * self_report: Likert 1-5 with anchors
     * read_aloud: start recording button + clinician scores after
     * diadochokinesis: stopwatch UI + regularity rating
   - Auto-advances on score, "Previous" button available
   - On completion: POST complete → shows DefectProfileCard (radar chart)

5. PlanBuilder.jsx (/therapist/patients/:id/plan)
   - Left panel: DefectList with radar chart (recharts)
   - Center panel: RecommendedTaskCards (from GET /defects/{id}/recommended-tasks)
     Each card: task name, type badge, matched defects, available levels, [Add] button
   - Right panel: PlanQueue
     Lists added tasks, approval toggle, clinical rationale textarea
     [Approve All] and individual [Approve] buttons
     [Launch Session] button (disabled until ≥1 approved)

6. SessionRunner.jsx (/patient/session/:id)
   STATE MACHINE: loading → warmup → exercise → recording → processing → feedback → next|complete

   - PromptHeader: scenario_context in italic card
   - InstructionBanner: instruction text with task_mode icon
   - DisplayContent: large display area
     * word_drill: large centered word pair with separator
     * sentence_read: sentence with target phonemes highlighted (using target_phonemes JSONB)
     * paragraph_read: flowing text
     * free_speech: speech bubble prompt area
     * roleplay: two-column roleplay scenario card
     * stuttering: paced text with beat markers
   - AudioRecorder:
     * 3-second countdown animation
     * Waveform visualizer (Web Audio API AnalyserNode)
     * Stop button with elapsed timer
     * POST multipart to submit-attempt
   - FeedbackPanel (shown after response):
     * Accuracy gauge (animated arc, 0-100)
     * Result badge: PASS (green) / PARTIAL (yellow) / FAIL (red)
     * feedback_message text (from feedback_rule)
     * AdaptiveActionBadge:
         advance → "⬆ Level Up!" (accent yellow)
         stay    → "↺ Try Again" (muted)
         drop    → "⬇ Stepping Back" (orange)
         clinician_alert → "⚑ Clinician Review Flagged" (red)
     * BreakdownAccordion with 4 tabs:
         ASR: transcript + WPM gauge + disfluency count
         Phoneme: per-word table (word | expected | produced | status)
         Emotion: emotion label + behavioral score arc
         NLP: topic/who/outcome scores (only for free_speech/roleplay)

7. PatientDashboard.jsx (/patient/dashboard)
   - TodayCard: current session summary, tasks due
   - ProgressCharts: per-task line chart (accuracy over time, Chart.js)
   - LevelBadges: current level per task (easy/medium/advanced pills)
   - StreakIndicators: consecutive passes counter per task

8. ClinicalAlertsDashboard.jsx (/therapist/alerts)
   - Table: patient name | task | delta | last attempt | action
   - [Review] navigates to patient profile
   - [Dismiss] calls PATCH /progress/{id}/dismiss-alert

══════════════════════════════════════════════════════════
IMPLEMENTATION ORDER
══════════════════════════════════════════════════════════

Phase 1 — Foundation (do this first, test before proceeding):
  1. Run alter_v2.sql to add new columns
  2. models/ — all 22 SQLAlchemy models
  3. database.py — async engine, session factory, dependency
  4. routers/baseline.py — GET routes only (read seeded data)
  5. routers/tasks.py — GET routes only
  Verify: all GET routes return correct data from seeded JSON migration

Phase 2 — Workflow layer:
  6. routers/patients.py — CRUD
  7. routers/plans.py — plan + assignment + approval
  8. routers/sessions.py — POST session, GET queue
  Verify: create patient → run baseline → build plan → open session → queue returns prompts

Phase 3 — AI Pipeline (one service at a time):
  9. audio_service.py — webm → wav conversion
  10. asr_service.py — Whisper integration, test with sample audio
  11. phoneme_service.py — HuBERT CTC integration
  12. emotion_service.py — SpeechBrain SER integration
  13. nlp_service.py — spaCy integration
  14. analysis_service.py — fusion + adaptive logic
  15. routers/sessions.py submit-attempt route — full pipeline integration
  Verify: POST audio → receive full breakdown JSON

Phase 4 — Progress & Alerts:
  16. progress update logic inside analysis_service.py
  17. routers/progress.py — all 3 routes
  Verify: 3 consecutive fails → DROP action; accuracy regression → clinician_alert=True

Phase 5 — Frontend:
  18. App.jsx routing + AuthContext (role-based: therapist / patient)
  19. LandingPage + shared components (Button, Card, Badge, Modal)
  20. BaselineRunner — most complex, build and test with mock API first
  21. PlanBuilder
  22. SessionRunner — AudioRecorder + FeedbackPanel
  23. TherapistDashboard + ClinicalAlertsDashboard
  24. PatientDashboard + ProgressView

══════════════════════════════════════════════════════════
CRITICAL RULES
══════════════════════════════════════════════════════════

1. TEXT vs UUID PKs: Seed tables use TEXT PKs (they come from JSON migration with deterministic UUIDs
   stored as strings). Runtime tables use UUID type with gen_random_uuid(). NEVER mix these up —
   FK columns pointing to seed tables must be TEXT; FK columns pointing to runtime tables must be UUID.

2. JSONB fields: raw_speech_target, target_phonemes, check_on_words, substitution_errors,
   layer2_target_pairs — always deserialize with json.loads() before passing to AI services.
   In SQLAlchemy models use: sa.Column(sa.JSON, server_default='{}')

3. Prompt queue filtering: GET /sessions/{id}/queue must return ONLY prompts at the patient's
   current_level_id for each task in the plan. Query:
   JOIN patient_task_progress ON task_id → get current_level_id
   JOIN task_level, prompt ON level_id = current_level_id
   If no progress row exists for a task, default to the easy level.

4. Warmup vs Exercise: warmup prompts (prompt_type='warmup') have no adaptive_threshold row
   and scoring.active=False. They are scored by behavioral_check only (latency + speech detected).
   Never run full AI pipeline on warmup prompts. Never update patient_task_progress on warmup.

5. Clinician alert freeze: when patient_task_progress.clinician_alert=True, compute_adaptive_action
   must never return ADVANCE. It can still return STAY or DROP. The freeze is lifted only by
   PATCH /progress/{id}/dismiss-alert called by a therapist.

6. Audio cleanup: always delete temp audio files in a finally block regardless of pipeline success
   or failure. Files live at uploads/temp_{uuid}.webm and uploads/temp_{uuid}.wav.

7. IPA characters: evaluation_target.target_phonemes contains IPA strings like /θ/, /ð/, /r/.
   Ensure all DB connections use client_encoding=UTF8. All API responses must be UTF-8 encoded.

8. task_defect_mapping is the ONLY bridge between tasks and defects.
   Do NOT query tasks directly by defect category. Always JOIN through task_defect_mapping
   filtering by defect_id to get recommendations.
```

---

## Part 9 — Environment Configuration

```bash
# .env (backend)
DATABASE_URL=postgresql+asyncpg://user:password@host/speech_therapy
SYNC_DATABASE_URL=postgresql://user:password@host/speech_therapy
WHISPER_MODEL=openai/whisper-small
HUBERT_MODEL=facebook/hubert-base-ls960
HUBERT_FALLBACK_MODEL=facebook/wav2vec2-base-960h
SPACY_MODEL=en_core_web_md
SER_MODEL=speechbrain/emotion-recognition-wav2vec2-IEMOCAP
UPLOAD_DIR=./uploads
MAX_AUDIO_SIZE_MB=50
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

```bash
# .env (frontend)
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_MAX_RECORDING_SEC=120
```

```bash
# requirements.txt (backend)
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
sqlalchemy[asyncio]>=2.0.0
asyncpg>=0.29.0
psycopg2-binary>=2.9.9
pydantic>=2.7.0
python-multipart>=0.0.9
aiofiles>=23.2.1
torch>=2.3.0
transformers>=4.41.0
openai-whisper>=20231117
speechbrain>=1.0.0
spacy>=3.7.0
ffmpeg-python>=0.2.0
python-dotenv>=1.0.0
```

---

## Part 10 — Testing Checklist

After full implementation, verify each of these end-to-end flows:

```
✓ Flow 1 — Intake
  Create patient → select SSI-4 → run 37 items (section by section) →
  complete baseline → defect profile shows FLU-001 (Stuttering) detected

✓ Flow 2 — Plan creation
  View patient defect profile → recommended tasks for FLU-001 →
  add "Stuttering Management Technique" (task 18) → approve assignment →
  plan status = active

✓ Flow 3 — Session with adaptive advance
  Create session → GET queue returns easy-level prompts for task 18 →
  submit audio for warmup (behavioral check only, no pipeline) →
  submit audio for exercise → accuracy 82% → STAY (1 of 2 needed) →
  submit again → accuracy 78% → ADVANCE →
  patient_task_progress.current_level_id = medium level

✓ Flow 4 — Session with DROP + clinician alert
  3 consecutive exercise fails (accuracy < 55%) →
  DROP to easy level (or already easy → stay + clinician_alert=True) →
  GET /clinician/alerts returns this patient →
  therapist dismisses alert → clinician_alert=False

✓ Flow 5 — Regression alert
  Patient's overall_accuracy drops from 75 to 58 (delta=17 > 15) →
  clinician_alert=True, progress_delta=17.0 →
  ADVANCE action blocked → therapist reviews → dismisses

✓ Flow 6 — Full roleplay pipeline
  submit audio for roleplay prompt →
  Whisper transcribes + WPM → HuBERT phonemes → SpeechBrain emotion →
  spaCy NLP (WHO + TOPIC + OUTCOME) all run →
  fuse with roleplay weights (nlp 40%, phoneme 25%, fluency 20%, behavioral 15%) →
  breakdown JSON contains all 4 component results
```
