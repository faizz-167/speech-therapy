# Speech Therapy Platform: Complete Project Context

## 1. Overview and Purpose
This project is an **AI-Assisted Adaptive Speech Therapy Platform** designed to help adult (and pediatric) patients improve speech and fluency. It replaces rigid pass/fail speech assessments with a comprehensive, nuanced, multimodal AI feedback loop that measures phonetic accuracy, emotional engagement, and structural content in real time. The platform continuously adapts the difficulty of exercises in response to the patient's performance.

## 2. Methodology & Architecture
* **Agentic Driven Development:** The project heavily leverages standard prompt protocols & skill pipelines defined in `.agent/` and `GEMINI.md` to dictate code guidelines (e.g., Socratic gates, clean code rules, no-UI-cliché templates).
* **Clinical Data-Driven DB Architecture:** A comprehensive, heavily relational 22-table PostgreSQL schema orchestrates everything from static defect catalogues and baseline tests to dynamic patient task queues and AI prompt configurations. It is populated via complex, scripted, and idempotent JSON migrations (`migrate.py`).
* **Multimodal AI Feedback Loop:** Replaces traditional scoring with a layered evaluation matrix measuring word/phoneme accuracy (ASR+CTC), emotional engagement (SER), and semantic structure (NLP) to provide localized feedback.
* **Adaptive Learning Rule Engine:** Automatically shifts patients up or down difficulty tiers (or flags for clinician review) based on compounding pass/fail attempt streaks, continuous evaluation heuristics, and frustration detection.

## 3. Tech Stack

### Backend
* **Language & Framework:** Python 3, FastAPI, Uvicorn
* **Database & ORM:** PostgreSQL (Neon Serverless Postgres), SQLAlchemy (Async), asyncpg, psycopg2
* **Storage/State:** Relational records handled in Postgres, Audio stored as temp files during processing (`uploads/temp_...`)

### AI / ML Pipeline (5-Component Workflow)
* **Whisper ASR (`openai/whisper-small`):** Transcription, disfluency detection (fillers and repetitions), task-mode WPM evaluation, token-level confidence extraction.
* **HuBERT CTC (`facebook/hubert-base-ls960`):** Phoneme extraction and forced alignment for phonemic accuracy scoring, with `wav2vec2-base-960h` fallback. Includes per-word scoring (correct, substitution, distortion).
* **spaCy NLP (`en_core_web_md`):** Named Entity Recognition (WHO) and dependency parsing (TOPIC) for semantic content scoring, specifically during free-speech and roleplay scenarios.
* **SpeechBrain SER (`speechbrain/emotion-recognition-wav2vec2-IEMOCAP`):** Emotion recognition and behavioral scoring (latency, engagement, and frustration detection contextually weighted).
* **Rule Engine (`analysis_service.py`):** Fuses the results from the various ML components, utilizing 6 different task-mode scoring formulas to execute adaptive difficulty logic.

### Frontend
* **Core:** React 19, Vite, React Router DOM
* **Styling & UI:** Tailwind CSS v4, Vanilla CSS overhauls (`index.css`), Base UI (`@base-ui/react`), Neo-brutalist custom Dark Mode
* **Data Visualization:** Chart.js, React-Chartjs-2
* **Icons & Assets:** Lucide React, React Icons, Geist Font
* **Tools:** Axios (HTTP client), React Hot Toast (notifications)

## 4. Complete Clinical & AI Workflow Structure

The physical therapy process from intake to adaptive completion occurs in four synchronized phases:

### Phase 1: Intake & Baseline Setup
1. **Clinical Assessment:** The patient takes standardized instruments (`baseline_assessment` like GFTA-3 or SSI-4).
2. **Defect Mapping:** The system scores these tests (`baseline_item_result`) and maps them to clinical speech disorders (`defect`) via `baseline_defect_mapping`.
3. **Plan Generation:** The therapist builds a targeted `therapy_plan` selecting specific `task`s that address the unique cognitive, articulation, or fluency defects of the patient.

### Phase 2: Session Execution & Audio Capture
1. **Patient Queue:** The patient begins their daily assigned `session` containing targeted `prompt` iterations (e.g., word drills, paragraph reads, free speech).
2. **Capture:** The React frontend displays the `display_content` and records `.webm` audio using the Web Audio API.
3. **Submission (`submit_task` route):** Audio and attempt metadata (latency, prior attempts, etc.) are posted to the backend FastAPI service.

### Phase 3: AI Multimodal Evaluation (Parallel Processing)
The backend routes the audio to the 5-Component AI Pipeline:
1. **Whisper ASR:** Transcribes audio, counts disfluencies (um, uh, repetitions), and determines structural Speech Rate (WPM) vs task-mode ideal ranges.
2. **HuBERT CTC:** Simultaneously force-aligns the audio against JSON `target_phonemes`. Calculates per-word correct/substitution/distortion rates.
3. **SpeechBrain SER:** Estimates emotion and generates a Behavioral Score based on connection latency vs audio length (frustration/engagement scaling).
4. **spaCy NLP:** (Only in *free_speech/roleplay*) Parses the transcript for syntactic structure (TOPIC), Named Entities (WHO), and structural outcomes (OUTCOME) vs the predefined JSON `speech_target` requirements.

### Phase 4: Adaptive Logic & Rule Engine (analysis_service.py)
1. **Fusion Weighting:** The Rule Engine scales the metrics using 1 of 6 task-mode formulas (e.g., `word_drill` prioritizes phonemes 90/10 over emotion, while `roleplay` blends NLP content 40% with SpeechBrain/ASR fluency 60%).
2. **Feedback & Decision Thresholds:** Compares the final multi-modal score against the JSON `adaptive_threshold` mapped rules.
3. **State Updates:** Determines clinical state per patient-task progress (`patient_task_progress`):
    * **Stay:** Re-run current prompt difficulty. Send nuanced `retry_message` from JSON feedback banks.
    * **Drop:** Triggered by 3 consecutive fails or a hard frustration detection spike (>0.40). Lowers task level (`task_level`) for next attempts.
    * **Advance:** Triggered by 2 consecutive high-pass scores. Upgrades to next difficulty `task_level`.
    * **Clinician Alert:** Flags session for manual review if there's a > 15-point baseline regression (`progress_delta`), freezing adaptive upgrades locally.
