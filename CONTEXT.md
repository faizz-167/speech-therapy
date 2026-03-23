# VocalSync - System Context & Architecture

This document serves as the primary context map for **VocalSync**, a full-stack Web Application designed for Speech Therapy. It bridges the gap between Therapist management and Patient practice through a specialized Dual-Portal architecture.

## 1. Core Architecture & Tech Stack
**Frontend:** React, Vite, TailwindCSS (v4), React Router, **Neo-Brutalism Design System**.
**Backend:** FastAPI, Python 3.12, PostgreSQL (AsyncPG), SQLAlchemy, Uvicorn.
**AI / Analytics Pipelines:**
- `openai/whisper-small` for Automatic Speech Recognition (ASR).
- `ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition` for Speech Emotion Recognition (SER).
- **Multimodal Speech Scoring:** Weighted fusion of phoneme accuracy (CTC forced alignment), word accuracy, fluency, speech rate, confidence, and engagement/emotion.

---

## 2. Directory Structure & Methodology

### 2.1 Backend (`/server`)
The backend is structured around domain-driven `routers/` and `models/`.
- **`main.py`**: The FastAPI entry point. Mounts CORS, static files (for audio blob storage), and all API routers.
- **`database.py`**: Exports `AsyncSessionLocal` and manages engine configuration for async database queries.
- **`models/`**: SQLAlchemy models governing the relational database structure.
  - `workflow.py` (Therapist, Patient, Authentication mappings)
  - `tasks.py` (TherapyPlan, PlanAssignments, Exercise mapping)
  - `session.py` (PatientTaskProgress, Session History)
  - `clinical.py` (ClinicalNotes, Alert thresholds)
- **`routers/`**: FastAPI routers mapping HTTP endpoints to services.
  - `auth` (Handled mostly in `/patients` and root auth logic)
  - `/api/v1/therapists/`: Therapist code generation, profile configuration, and patient lists.
  - `/api/v1/patients/`: Patient creation, login (PIN-based via bcrypt hash verification), streak tracking, and emotion analytics.
  - `/api/v1/plans/`: Therapy Plan orchestration and V3 schema task assignments.
  - `/api/v1/baselines/`: Core assessment routes handling item retrieval and V3 result submissions.
  - `/api/v1/session/`: Submitting audio blobs, processing multimodal scoring algorithms, and recording progress.
  - `/api/v1/progress/`: Fetching time-series arrays for patient charts and active streaks.

### 2.2 Frontend (`/client/src`)
The UI strictly isolates Therapist logic from Patient logic via Role-Based Routing.

**Important Methodology:** The Frontend utilizes two distinct authentication strategies:
- **Therapists:** Use strict JSON Web Tokens (JWT) kept in `AuthContext` state and LocalStorage (`'token'`).
- **Patients:** Use JSON object storage (`'patient_user'`) over custom `<ProtectedRoute requiredRole="patient">`. Kiosk patterns are heavily secured with validated DB checks, robust session states, strict RLS, and input validation to prevent tampering.

**Routing (`App.jsx`):**
- **Public:** `/`, `/login`, `/register`, `/patient/login`, `/patient/register`
- **Therapist (JWT Protected):**
  - `/therapist/dashboard`: Main data-driven Practitioner Dashboard (Stats, Action Alerts, Recent Patients).
  - `/therapist/patients`: List of supervised patients.
  - `/therapist/patients/:patientId`: Detailed view (Notes, Baselines, Assignments).
  - `/therapist/patients/:patientId/plan`: Plan Builder interface to assign exercises.
  - `/intake`: Patient Intake Form with step-indicators and defect selection.
- **Patient (Object Storage Protected):**
  - `/patient/home`: Gamified active task dashboard, charts, and CTA.
  - `/patient/baseline/:resultId`: Pre-assessment sandbox for calibrating difficulty (redesigned with mic recording and immediate accuracy feedback).
  - `/patient/session/:sessionId`: The core practice loop.

---

## 3. Workflows & State Lifecycle

### 3.1 Patient Onboarding Workflow
1. **Therapist Intake:** Therapist visits `/intake` and creates a patient profile, passing along any Known Clinical Defects.
2. **Access Grant:** The system generates a randomly assigned 4-digit PIN for the patient.
3. **Patient Registration:** Patient visits the Root URL, types in their therapist's "Code" and their PIN.
4. **Backend Sync:** `routers/patients.py` explicitly verifies the password hash via `bcrypt` against the database row.
5. **Dashboard Drop:** The UUID is stored in local storage and the patient is pushed to `<PatientHome>`, bypassing the Therapist JWT check.

### 3.2 Clinical Practice Loop (The Session)
1. **Task Selection:** Patient clicks "Start Session" which pulls the highest priority `PlanAssignment` created by the therapist.
2. **Recording:** Patient reads the `stimulus_content` and records audio via `MediaRecorder` API.
3. **Submission:** Audio blob is sent to `POST /api/v1/session/{id}/attempt`.
4. **Scoring Engine (`services/analysis_service.py`):**
   - Transcribes audio via Whisper.
   - Computes Phoneme Accuracy via CTC forced alignment.
   - Extracts Emotion mapping (Happy, Sad, Frustrated) via Wav2Vec.
   - Fuses metrics (Fluency, Engagement, Accuracy, Precision) into a multimodal response via adaptive algorithms and baseline targets.
5. **Result & Advancement:** The backend updates `PatientTaskProgress` and generates real-time clinical notes. `AdaptiveAction` flags dictate level up, retry, or step down logic.

---

## 4. Crucial Guidelines & Recent Updates for Agent Continuity

- **Design System Overhaul (Neo-Brutalism):** We have entirely replaced the previous Swiss Minimalist design with a vibrant Neo-Brutalism aesthetic. This mandates Space Grotesk typography, heavy 4px black borders (`border-neo-border`), offset hard shadows (`shadow-[8px_8px_0px_0px_#000]`), intentional misalignments/rotations (`-rotate-1`), high-saturation colors (`#FFD93D`, `#CCFF00`, `#FF6B6B`), and textured backgrounds (`bg-grid`, `bg-halftone`).
- **Massive UI Refactors:** 
  - All public pages (`TherapistLogin`, `PatientLogin`, `TherapistRegister`, `PatientRegister`) use a split-screen layout with vibrant branded side panels.
  - `TherapistDashboard` was transformed from a simple navigation menu into a data-rich viewport.
  - `LandingPage` and `PatientIntake` were polished to fix text-stroke properties, subtitle contrast, header padding bugs, and text-bleed (`leading-none`).
- **Bug Fixes:**
  - `index.css` Tailwind errors (e.g. `bh-panel`, `bh-button`) were stripped, and CSS custom property inconsistencies were resolved by using explicit hex codes for backgrounds where needed.
  - Infinite polling loops in tasks were resolved.
  - API endpoint mappings in frontend services (`patients.js`, `plans.js`, `baselines.js`) were aligned to V3 schema.
- **Database Architecture:** The V3 schema migration is strict. The DB was recently wiped to resolve ghost data issues. Code must strictly adhere to the defined SQLAlchemy models (e.g., `baseline_items`, `baseline_results`).
- **Security:** Security audits require strict enforcement of RLS policies, input validation, and secure kiosk logic to prevent any tampering.

*Save/Refer to this context map for immediate boot-ups or to inject history into new chat windows.*
