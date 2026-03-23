# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-assisted speech therapy platform with role-based access for therapists and patients. Therapists manage patients, run baseline assessments, and build therapy plans; patients complete audio-based exercises with real-time AI scoring.

## Commands

### Client (React + Vite)
```bash
cd client
npm install        # Install dependencies
npm run dev        # Dev server at http://localhost:5173
npm run build      # Production build
npm run lint       # ESLint
npm run preview    # Preview production build
```

### Server (FastAPI)
```bash
cd server
pip install -r requirements.txt   # Install dependencies
uvicorn main:app --reload         # Dev server at http://localhost:8000
```

The server pre-loads Whisper and Wav2Vec2 ML models at startup — expect a delay on first run.

### Database
Schema is defined in `server/schema.sql`. The project connects to a Neon PostgreSQL cloud database via `DATABASE_URL` in `server/.env`. Migration scripts are in `server/migrations/` and `server/migrate_v4.py`.

## Architecture

### Client (`client/src/`)

**Role-based routing** in `App.jsx`:
- Public: `/`, `/login`, `/register`
- Therapist: `/therapist/*`, `/intake`, `/plan/:patientId`
- Patient: `/patient/:patientId`, `/baseline/:resultId`, `/session/:sessionId`

Routes are protected by `ProtectedRoute` using `AuthContext` which stores JWT token and role.

**API layer** (`api/`): Axios instance in `api/axios.js` auto-attaches JWT and targets `/api/v1`. Separate modules per domain: `patients.js`, `baselines.js`, `plans.js`, `sessions.js`, `therapists.js`.

**Key custom hooks**:
- `useAudioRecorder.js` — MediaRecorder wrapper for capturing audio during exercises
- `useSessionQueue.js` — Manages ordered prompt queue during a therapy session
- `useApi.js` — Fetch-based wrapper with auth headers

**Styling**: Tailwind CSS v4 with custom design tokens in `index.css`. Dark/light theme via `ThemeContext`.

### Server (`server/`)

**Dual API schema**: The server has legacy routers (mounted at root `/`) and v3 routers mounted at `/api/v1`. All active client code targets `/api/v1`.

**V3 Routers** (`routers/` — new schema):
| Router | Prefix | Purpose |
|--------|--------|---------|
| `patients.py` | `/api/v1/patients` | Register (therapist code), PIN login, emotion trends, streaks |
| `baselines.py` | `/api/v1/baselines` | List baseline batteries, complete assessment → compute defect profile |
| `plans.py` | `/api/v1/plans` | Create/retrieve therapy plans, approve task assignments |
| `sessions.py` | `/api/v1/sessions` | Create session, get prompt queue, submit audio attempts, complete session |
| `progress.py` | `/api/v1/progress` | Patient progress summary, clinician regression alerts |
| `therapists.py` | `/api/v1/therapists` | Therapist profile, patient list, alerts |

**Database models** (`models/workflow.py` is primary):
- `Therapist` → `Patient` (1:many via therapist_code)
- `Patient` → `PatientBaselineResult` → `BaselineItemResult`
- `TherapyPlan` → `PlanTaskAssignment` → `Task`/`TaskLevel`
- `Session` → `SessionPromptAttempt`
- `Session` → `SessionEmotionSummary`

**AI Pipeline** (executed per audio attempt in `sessions.py`):
1. **Whisper ASR** (`services/asr_service.py`) — Transcription, WPM, Fluency Score, Speech Rate Score, Confidence Score
2. **Wav2Vec2 SER** (`services/ser_service.py`) — Emotion, engagement, frustration detection
3. **Phoneme Service** (`services/phoneme_service.py`) — Phoneme accuracy via g2p-en + Levenshtein distance
4. **NLP Service** (`services/nlp_service.py`) — Semantic accuracy for free-form tasks
5. **Rule Engine** (`services/analysis_service.py`) — Task-mode-specific weighted scoring → Final Score + Advance/Stay/Drop decision + clinician alerts

Task modes and their weight formulas:
- `word_drill`: phoneme_accuracy (0.65) + word_accuracy (0.25) + confidence (0.10)
- `sentence_read`, `paragraph_read`, `free_speech`, `stuttering`, `roleplay` each have distinct weights

## Key Patterns

**Authentication**: Therapists use email+password (JWT). Patients use therapist code at registration + PIN-based login. Tokens stored in `AuthContext`, attached via axios interceptor.

**Baseline → Plan → Session flow**:
1. Therapist runs baseline assessment → defect profile computed
2. Therapist creates therapy plan with task assignments (status: draft → pending → active)
3. Patient launches sessions from active plan → gets ordered prompt queue
4. Patient submits audio per prompt → AI pipeline scores → adaptive advancement decisions

**Schema migration**: Multiple migration scripts exist (`migrate_v4.py`, `db_add_cols.py`, `db_drop_not_null.py`). When modifying the database schema, update `schema.sql` and add a migration script rather than editing existing ones.

**Async throughout**: SQLAlchemy uses async engine (`asyncpg`), all DB calls use `async/await`. Session factory configured with `no_statement_cache_size=0` to avoid prepared statement conflicts.
