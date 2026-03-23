# VocalSync — Complete System Restructure Prompt

You are a senior developer restructuring the VocalSync speech therapy platform. Your job is to rebuild the authentication system, routing architecture, and all UI pages to match the new flow described below.

## NON-NEGOTIABLE: What you must NOT change

The following backend components are clinically validated. Do not touch them under any circumstances:

- `services/analysis_service.py` — FORMULA_CONFIG, fusion weights, adaptive decision engine, frustration override, smart DROP routing, clinician alert logic
- `services/phoneme_service.py` — HuBERT CTC forced alignment against target_phonemes
- `services/asr_service.py` — Fluency Score DR+PS formula, disfluency detection, WPM calculation
- `services/emotion_service.py` — SpeechBrain SER scoring, behavioral score calculation
- All database tables: `prompt`, `speech_target`, `evaluation_target`, `prompt_scoring`, `adaptive_threshold`, `feedback_rule`, `baseline_item`, `baseline_section`, `task`, `task_level`, `task_defect_mapping`, `defect`
- `session_prompt_attempt` telemetry columns: audio_file_ref, emotion_label, behavioral_score, wpm, disfluency_count, phoneme_accuracy, nlp_score
- `POST /api/v1/session/{id}/attempt` — the core scoring endpoint
- `GET /api/v1/session/{sessionId}/queue` — the prompt queue endpoint

---

## PART 1 — Authentication Overhaul

### 1A — Database changes

The `patient` table currently uses PIN-based auth. Add these columns:
- `password_hash VARCHAR NOT NULL` — bcrypt hash of patient's email+password credentials
- `role VARCHAR NOT NULL DEFAULT 'patient'` — used in JWT payload

The `therapist` table already uses email+password. Add:
- `role VARCHAR NOT NULL DEFAULT 'therapist'` — used in JWT payload
- `years_of_experience INT NULLABLE`

### 1B — Backend auth changes

**File:** `server/routers/auth.py` (create if it does not exist) or update existing auth logic in `routers/patients.py` and `routers/therapists.py`.

Replace the PIN-based patient login with standard JWT auth. Both therapists and patients now use the same JWT mechanism. The JWT payload must include `{ sub: uuid, role: 'therapist' | 'patient' }`.

New endpoints needed:

`POST /api/v1/auth/therapist/register`
Body: `{ name, email, password, years_of_experience }`
Creates therapist, returns JWT.

`POST /api/v1/auth/therapist/login`
Body: `{ email, password }`
Returns JWT with `role: 'therapist'`.

`POST /api/v1/auth/patient/register`
Body: `{ name, age, gender, email, password, therapist_code }`
Validates therapist_code → links patient to therapist → creates patient → returns JWT with `role: 'patient'`.

`POST /api/v1/auth/patient/login`
Body: `{ email, password }`
Returns JWT with `role: 'patient'`.

Remove the old PIN generation and bcrypt PIN verification logic from patient creation. Keep bcrypt — use it for email+password hashing instead.

### 1C — Frontend auth changes

**File:** `client/src/context/AuthContext.jsx`

Update `AuthContext` to store and decode the JWT for both roles. The context must expose:
- `user` — decoded JWT payload: `{ id, role, name }`
- `token` — the raw JWT string
- `login(token)` — stores token in `localStorage('token')`, decodes and sets user
- `logout()` — clears localStorage, resets state
- `isTherapist()` — returns `user?.role === 'therapist'`
- `isPatient()` — returns `user?.role === 'patient'`

Remove `localStorage('patient_user')` entirely. Remove `<PatientRoute>`. Both roles now use `<ProtectedRoute>` — role-based redirects happen inside the route components.

**File:** `client/src/components/ProtectedRoute.jsx`

Update to accept an optional `requiredRole` prop:
- If not authenticated → redirect to `/`
- If `requiredRole === 'therapist'` and `user.role !== 'therapist'` → redirect to `/patient/home`
- If `requiredRole === 'patient'` and `user.role !== 'patient'` → redirect to `/therapist/dashboard`

---

## PART 2 — Route Architecture

**File:** `client/src/App.jsx`

Replace all current routes with this exact structure:

```
PUBLIC (no auth required):
  /                         → LandingPage (role selector)
  /therapist/register       → TherapistRegister
  /therapist/login          → TherapistLogin
  /patient/register         → PatientRegister
  /patient/login            → PatientLogin

THERAPIST (ProtectedRoute requiredRole="therapist"):
  /therapist/dashboard      → TherapistDashboard
  /therapist/patients       → PatientsList
  /therapist/patients/:patientId            → PatientPage (tabs inside)
  /therapist/profile        → TherapistProfile

PATIENT (ProtectedRoute requiredRole="patient"):
  /patient/home             → PatientHome
  /patient/tasks            → PatientTasks
  /patient/progress         → PatientProgress
  /patient/profile          → PatientProfile
  /baseline/:resultId       → BaselineRunner   (keep existing — do not change internals)
  /session/:sessionId       → SessionRunner    (keep existing — do not change internals)
```

Delete these routes entirely: `/intake`, `/plan/:patientId`, `/therapist` (old single-page), `/patient/:patientId` (old patient dashboard), `/login`, `/register`.

---

## PART 3 — Public Pages

### LandingPage (`/`)

Two options: "I am a Therapist" and "I am a Patient". Each has two sub-options: Login and Register. Clicking any navigates to the corresponding route:
- Therapist → Register: `/therapist/register`
- Therapist → Login: `/therapist/login`
- Patient → Register: `/patient/register`
- Patient → Login: `/patient/login`

---

### TherapistRegister (`/therapist/register`)

Four fields:
- Name — text, required
- Email — email, required
- Password — password, required, min 8 characters
- Years of Experience — number, optional, min 0 max 50

Submit → `POST /api/v1/auth/therapist/register`. On success: store JWT, redirect to `/therapist/dashboard`.

Link at bottom: "Already have an account? Log in" → `/therapist/login`.

---

### TherapistLogin (`/therapist/login`)

Two fields: Email, Password. Submit → `POST /api/v1/auth/therapist/login`. On success: store JWT, redirect to `/therapist/dashboard`.

---

### PatientRegister (`/patient/register`)

Six fields:
- Name — text, required
- Age — number, required, min 5 max 99
- Gender — select, required: Male / Female / Non-binary / Prefer not to say
- Email — email, required
- Password — password, required, min 8 characters
- Therapist Code — text, required, 6 characters uppercase

Submit → `POST /api/v1/auth/patient/register`. On success: store JWT, redirect to `/patient/home`.

If therapist code is invalid: show inline error "Therapist code not recognised. Please check with your therapist."

Link at bottom: "Already registered? Log in" → `/patient/login`.

---

### PatientLogin (`/patient/login`)

Two fields: Email, Password. Submit → `POST /api/v1/auth/patient/login`. On success: store JWT, redirect to `/patient/home`.

---

## PART 4 — Therapist Portal Pages

All therapist pages share a persistent top navigation bar with three tabs: Dashboard | Patients | Profile. Active tab matches current route. Right side shows therapist name and a logout button.

---

### TherapistDashboard (`/therapist/dashboard`)

**Data to fetch:**
- `GET /api/v1/therapists/patients` → patient count and list
- `GET /api/v1/progress/clinician/alerts` → alerts needing clinical review
- `GET /api/v1/plans?summary=true` → active plan count (if this param is not supported, derive from patient list)

**Three metric cards:**
1. Total Patients — count
2. Action Alerts — count. If > 0 this card shows an urgent state
3. Active Plans — count

**Alerts section:**
List from `GET /api/v1/progress/clinician/alerts`. Per alert: patient name, alert type, task name, "View Patient" button → navigates to `/therapist/patients/{patient_id}`. If no alerts: "No alerts — all patients progressing normally."

**Recent patients table:**
Last 5 patients by creation date. Columns: Name, Defects, Plan Status, Last Session, Accuracy. "View" button per row → `/therapist/patients/{patient_id}`.

---

### PatientsList (`/therapist/patients`)

**Header:** "Patients" title + "Register New Patient" button → opens the patient registration modal or navigates to a sub-route.

**Patient registration (inline modal or drawer — not a separate page):**

Two steps inside the modal:

Step 1 — Patient details:
- Name, Age, Gender, Email — same validation as PatientRegister public page
- No password field here — the therapist is registering the patient. The patient sets their own password via the PatientRegister page using the therapist code.

Wait — reading the requirement again: the therapist registers patients with their details AND defects. The patient then creates their own account using the therapist code. So the therapist-side registration captures clinical profile only. The patient-side registration captures credentials.

**Revised therapist registration (Step 1):** Name, Age, Gender, Email (so therapist has their contact), and defect selection (Step 2 below).

Submit → `POST /api/v1/patients/register` (existing non-auth endpoint that creates a patient profile without credentials, or update to create a pending patient record). The patient activates their account at `/patient/register` using the therapist code.

Step 2 — Defect selection:
Multi-select cards grouped into three categories. All 23 defects must be present:

**Articulation (10):**
ART-001 Rhotacism | ART-002 Lambdacism | ART-003 Sigmatism | ART-004 Voicing contrast errors | ART-005 Interdental fricative error | ART-006 Labiodental confusion | ART-007 Weak syllable deletion | ART-008 Stress pattern errors | ART-009 Reduced intelligibility | ART-010 Consonant cluster reduction

**Fluency (8):**
FLU-001 Stuttering | FLU-002 Cluttering | FLU-003 Dysprosody | FLU-004 Dysphonia | FLU-005 Impaired breath support | FLU-006 Abnormal speech rate | FLU-007 Impaired pausing control | FLU-008 Flat intonation

**Cognition (5):**
COG-001 Word retrieval difficulty | COG-002 Reduced discourse coherence | COG-003 Pragmatic communication deficit | COG-004 Reduced working memory for speech | COG-005 Impaired self-monitoring

"Skip" and "Register Patient" buttons. On success: close modal, show new patient card in the list.

**Patient card grid:**
Each registered patient is shown as a card. Card displays: Name, Age, Defect codes as pills, Plan status badge, Last session date. Clicking a card navigates to `/therapist/patients/{patient_id}`.

**Search bar:** Client-side filter by name above the card grid.

---

### PatientPage (`/therapist/patients/:patientId`)

Header: Patient name, age, gender, defect pills. Back arrow → `/therapist/patients`.

Three internal tabs: Baseline | Plan | Progress

Secondary tab navigation bar below the header.

---

#### Tab — Baseline

**Data:** `GET /api/v1/patients/{patientId}/baseline-results`

**If no baseline:**
Show "Baseline assessment has not been completed yet."
Show "Initiate Baseline" button → calls `POST /api/v1/patients/{patientId}/baseline-results` with selected instrument → navigates to `/baseline/{result_id}`.
Before navigating: show a brief instrument picker loaded from `GET /api/v1/baselines` (12 instruments).

**If baseline complete:**
Show defect profile cards. Each card: defect code, defect name, severity score (0–100), severity label.
Severity label mapping: score < 40 → Severe | 40–59 → Moderate | 60–79 → Mild | ≥ 80 → Within Normal Limits.

---

#### Tab — Plan

This is the core clinical planning interface. It has two sub-states: before plan generation and after plan generation.

**Before plan generation:**
Show "Generate AI Plan" button. This button is only enabled after baseline is completed. If baseline is not done: show "Complete baseline assessment first" as disabled button explanation.

On "Generate AI Plan" click:
1. Call `POST /api/v1/plans` with `{ patient_id: patientId, generate: true }`
2. Backend generates a 7-day schedule using this logic:
   - Gets patient's defect codes
   - Gets baseline severity scores per defect
   - Maps severity to starting level: Severe (< 40%) → easy | Moderate (40–59%) → easy | Mild (60–79%) → medium | Within Normal Limits (≥ 80%) → advanced
   - For each defect, selects 1–2 tasks from task_defect_mapping
   - Distributes tasks across 7 days (day 1 = registration date, day 7 = registration date + 6)
   - Returns a week_plan array: `[{ day: 1, date: "YYYY-MM-DD", tasks: [{ assignment_id, task_id, task_name, level, defect_code }] }]`
3. Display the generated week plan immediately (see below)

**After plan generation — Weekly Plan View:**

Show a 7-column grid, one column per day (Day 1 through Day 7 with the actual date). Each column shows the assigned tasks for that day as draggable cards.

Per task card inside a day column:
- Task name
- Level badge (easy / medium / advanced)
- Defect code it targets
- Edit button — opens inline edit for level change
- Delete button — removes this task from this day

**Add Task button** at the bottom of each day column:
Opens an inline form with two fields:
- Task Name — dropdown, options filtered by patient's defect codes using the task-defect mapping below. Only show tasks relevant to the patient's defects.
- Level — dropdown: easy | medium | advanced

The task name dropdown must show only tasks mapped to the patient's defect codes. The mapping is:

ART-001: Minimal Pairs Contrast, Phoneme Drills in Words
ART-002: Phoneme Drills in Words
ART-003: Phoneme Drills in Words, Word List Reading
ART-004: Minimal Pairs Contrast, Sentence Articulation Drill
ART-005: Phoneme Drills in Words, Contrast Sentence Reading
ART-006: Phoneme Drills in Words, Contrast Sentence Reading
ART-007: Weak Syllable Stress Correction, Stress Pattern Correction
ART-008: Sentence Reading for Clarity, Weak Syllable Stress Correction, Stress Pattern Correction
ART-009: Sentence Reading for Clarity, Word List Reading, Sentence Articulation Drill, Paragraph Reading Aloud
ART-010: (no mapped tasks — show all articulation tasks as fallback)
FLU-001: Breath Management, Pausing Control, Stuttering Management Technique
FLU-002: Pacing Control, Speech Rate Training
FLU-003: Paragraph Reading Aloud, Intonation Training, Reading with Emotion, Rhythmic Phrase Practice, Prosody and Naturalness Scoring
FLU-004: Sustained Voice in Real Speech
FLU-005: Sustained Voice in Real Speech, Breath Management, Stuttering Management Technique, Breath-Group Phrasing
FLU-006: Pacing Control, Speech Rate Training, Prosody and Naturalness Scoring
FLU-007: Pausing Control, Rhythmic Phrase Practice, Breath-Group Phrasing
FLU-008: Intonation Training, Reading with Emotion
COG-001: Roleplay: Ordering Food and Drink, Emergency Phrase Practice, Telephone Task, Rephrasing Task, Daily Talking Diary
COG-002: Self-Introduction Practice, Short Presentation, Problem-Solving Speech, Debate Task, Daily Talking Diary
COG-003: Self-Introduction Practice, Roleplay: Ordering Food and Drink, Emergency Phrase Practice, Telephone Task, Asking for Help, Daily Talking Diary
COG-004: Short Presentation, Problem-Solving Speech
COG-005: Asking for Help, Rephrasing Task, Debate Task

"Add" confirms → `POST /api/v1/plans/{planId}/assignments` with `{ task_id, level, day_index }`.

**Drag to reorder within a day:** Task cards within a day column can be reordered via drag and drop. On drop: `PATCH /api/v1/plans/assignments/{id}` with `{ priority_order }`.

**Drag to move between days:** A task card can be dragged from one day column to another. On cross-day drop: `PATCH /api/v1/plans/assignments/{id}` with `{ day_index: newDayIndex }`.

**Approve Plan button:** Shown at the top of the weekly view. "Approve & Publish Plan" → calls `PATCH /api/v1/plans/{planId}` with `{ status: 'approved' }` and bulk-approves all assignments via `PATCH /api/v1/plans/assignments/{id}/approve` for each assignment. After approval: the tasks appear in the patient's portal. Before approval: patient sees "Your therapy plan is being prepared by your therapist."

**Modify after approval:** The weekly view remains editable after approval. Any add/edit/delete/move to an approved plan calls the same endpoints and updates the patient's view immediately.

---

#### Tab — Progress

**Data:**
- `GET /api/v1/progress/patients/{patientId}` — task accuracy and level
- `GET /api/v1/patients/{patientId}/emotion-trends?days=30` — emotion history
- `GET /api/v1/patients/{patientId}/streak` — streak data

**Overall accuracy chart:** Chart.js line chart. X: dates. Y: 0–100. One line per task.

**Task rows:** Name, current level badge, accuracy %, consecutive passes dots (up to 3), clinician_alert warning icon if flagged.

**Alert banner:** If any task has `clinician_alert === true`: show dismissible banner. "Dismiss" → `PATCH /api/v1/progress/{progressId}/dismiss-alert`.

**Emotion trend:** Table of last 30 days. Date, dominant emotion, avg frustration, drop count. If `chronic_frustration_flag === true`: show warning banner.

**Therapist action note:** If metrics are down (overall_accuracy trending below 50% for a task), show a prompt: "Consider modifying this task's level. View in Plan tab." — clicking switches to the Plan tab.

---

### TherapistProfile (`/therapist/profile`)

**Data:** `GET /api/v1/therapists/me` and `GET /api/v1/therapists/code`

**Profile details:** Name, Email, Years of Experience. Edit button → makes fields editable. Save → `PATCH /api/v1/therapists/me`.

**Therapist Code:** Displayed prominently in a large box. Copy to clipboard button. "Regenerate" button with confirmation → `POST /api/v1/therapists/code/regenerate`.

Instructions below the code: "Share this 6-character code with your patients. They enter it when creating their account on the patient registration page."

**Stats:** Total patients, sessions completed this month, active plans.

---

## PART 5 — Patient Portal Pages

All patient pages share a persistent bottom navigation bar (mobile-first) with four tabs: Home | Tasks | Progress | Profile. Active tab matches current route.

---

### PatientHome (`/patient/home`)

**Data:**
- `GET /api/v1/patients/{patientId}` — patient details (patientId from decoded JWT)
- `GET /api/v1/session/today?patient_id={patientId}` — today's active session, or create one
- `GET /api/v1/patients/{patientId}/streak` — streak data

**Baseline assessment banner (shown if baseline not completed):**
If patient has no completed baseline: show a prominent banner: "Start your baseline assessment — this helps us build your personalised therapy plan." Button: "Begin Assessment" → calls `POST /api/v1/patients/{patientId}/baseline-results` with the recommended instrument based on patient's registered defects → navigates to `/baseline/{result_id}`.

**Plan pending banner (shown if baseline done but plan not approved):**
If baseline is complete but therapist has not approved a plan yet: show "Your therapist is reviewing your assessment and preparing your plan. Check back soon."

**Today's tasks section (shown when plan is approved):**
Load today's tasks from the session queue. Show each task as a card: task name, level badge, status (Pending / In Progress / Completed). "Start" button on pending tasks → navigates to `/session/{sessionId}`.

**Streak display:** Current streak with a visual indicator. "You're on a {N}-day streak!"

**Quick stats row:** Tasks completed today / total today's tasks. Overall accuracy.

---

### PatientTasks (`/patient/tasks`)

**Important:** This page shows TODAY's tasks only. Never show the full 7-day plan to the patient.

**Data:** `GET /api/v1/session/today?patient_id={patientId}` — returns today's assigned tasks with their status.

**Three sections:**

Completed tasks — tasks where `status === 'completed'`. Show task name, level badge, accuracy score achieved, pass/fail badge.

In Progress — tasks where `status === 'in_progress'`. Show task name, level badge, "Continue" button → `/session/{sessionId}`.

Pending — tasks where `status === 'pending'`. Show task name, level badge, "Start" button → creates/resumes session → `/session/{sessionId}`.

**Empty state for the day:** If all tasks are completed: "Great work today! Come back tomorrow for your next session."

**Date display:** Show today's date prominently at the top. Do not show other days or a calendar.

---

### PatientProgress (`/patient/progress`)

**Data:**
- `GET /api/v1/progress/patients/{patientId}`
- `GET /api/v1/patients/{patientId}/emotion-trends?days=30`
- `GET /api/v1/patients/{patientId}/streak`

**Accuracy over time chart:** Line chart, one line per task, 30-day window.

**Per-defect breakdown:** For each of the patient's defects, show an accuracy bar. Label the bar with the defect name (not the code). Colour: below 55% = red, 55–74% = amber, ≥ 75% = green.

**"Focus areas" section:** Automatically highlight the 1–2 defects with the lowest accuracy scores. Label: "Your therapist and the AI system are focusing extra practice here."

**Streak card:** Current streak, longest streak.

**Session history table:** Last 10 sessions. Date, tasks attempted, average accuracy, dominant emotion for the session.

---

### PatientProfile (`/patient/profile`)

**Data:** `GET /api/v1/patients/{patientId}` (patientId from decoded JWT)

Display: Name, Age, Gender, Email, Registered date, Therapist name.

**Change password section:** Current password, New password, Confirm. Submit → `PATCH /api/v1/auth/patient/password`.

No edits to name, age, gender, or email from the patient side — these are managed by the therapist.

---

## PART 6 — Backend Additions Required

These are the only backend changes needed to support the new flow. Do not touch any existing scoring or adaptive logic.

### 6A — Plan week structure

The `plan_task_assignment` table needs a `day_index INT NOT NULL DEFAULT 1` column (1–7, representing which day of the week the task is assigned to). Add this column via migration.

The plan generation endpoint `POST /api/v1/plans` with `{ generate: true }` must:
1. Load patient defects and baseline severity scores
2. Assign starting level per defect based on severity (Severe/Moderate → easy, Mild → medium, WNL → advanced)
3. Distribute tasks across 7 days (2–3 tasks per day, balanced by defect category)
4. Create `plan_task_assignment` rows with `day_index` set
5. Return the full week structure

`GET /api/v1/plans/{planId}/week` — returns the 7-day structure as an array of day objects for the therapist weekly view.

`GET /api/v1/session/today?patient_id={patientId}` — returns assignments where `day_index` matches the number of days since plan creation (day 1 = plan creation date, day 7 = plan creation date + 6). If today is beyond day 7, return empty with a flag `{ week_complete: true }`.

### 6B — Patient registration split

Because the therapist registers the clinical profile and the patient registers their own credentials, the patient registration flow is:

**Therapist side:** `POST /api/v1/patients/` (existing) — creates a patient record with name, age, gender, email, defect codes. Stores `therapist_id`. Does NOT set a password.

**Patient side:** `POST /api/v1/auth/patient/register` (new) — receives name, email, password, therapist_code. Looks up existing patient record by email AND therapist_code match. Sets `password_hash`. Returns JWT. If no matching record: creates a new patient record and sets credentials in one step.

This means if the therapist pre-registers the patient, the patient's registration simply activates their account. If the patient registers directly (therapist gave them the code and told them to self-register), it creates the full record.

### 6C — Notes endpoint

If not already implemented: `GET /api/v1/patients/{id}/notes` and `PATCH /api/v1/patients/{id}/notes`. Add `clinical_notes TEXT NULLABLE` column to patient table.

---

## PART 7 — File Checklist

### New files to create:
```
client/src/pages/
  LandingPage.jsx
  TherapistRegister.jsx
  TherapistLogin.jsx
  PatientRegister.jsx
  PatientLogin.jsx
  TherapistDashboard.jsx       (replaces old /therapist)
  PatientsList.jsx             (replaces old /therapist/patients)
  PatientPage.jsx              (replaces old /therapist/patients/:id)
  TherapistProfile.jsx         (replaces old /therapist/profile)
  PatientHome.jsx              (replaces old /patient/:patientId)
  PatientTasks.jsx             (new)
  PatientProgress.jsx          (new)
  PatientProfile.jsx           (new)

client/src/components/
  WeeklyPlanGrid.jsx           (drag-and-drop weekly task grid)
  TaskAssignmentCard.jsx       (draggable task card inside plan grid)
  DefectSelector.jsx           (reusable 23-defect multi-select)
  PatientCard.jsx              (patient card in PatientsList grid)
```

### Files to update:
```
client/src/context/AuthContext.jsx   — unified JWT auth for both roles
client/src/components/ProtectedRoute.jsx  — add requiredRole prop
client/src/App.jsx                   — new route structure
client/src/api/auth.js               — new auth endpoints
client/src/api/patients.js           — updated endpoints
client/src/api/plans.js              — add week structure endpoints
server/routers/auth.py               — new auth endpoints
server/models/workflow.py            — add years_of_experience, role, password_hash
server/alembic/versions/             — migration for new columns
```

### Files to DELETE (remove entirely):
```
client/src/pages/PatientIntake.jsx   (replaced by therapist modal in PatientsList)
client/src/components/PatientRoute.jsx
```

### Files to keep unchanged:
```
client/src/pages/BaselineRunner.jsx
client/src/pages/SessionRunner.jsx
client/src/components/FeedbackPanel.jsx
client/src/components/StimulusCard.jsx
client/src/components/PromptCard.jsx
client/src/components/AudioRecorder.jsx
client/src/components/ScoreGauge.jsx
server/services/analysis_service.py
server/services/phoneme_service.py
server/services/asr_service.py
server/services/emotion_service.py
```

---

## PART 8 — Verification Checklist

### Auth
- [ ] Therapist can register at `/therapist/register` with name, email, password, years_of_experience
- [ ] Therapist can log in at `/therapist/login` → JWT stored → redirected to `/therapist/dashboard`
- [ ] Patient can register at `/patient/register` with therapist_code → JWT stored → redirected to `/patient/home`
- [ ] Patient can log in at `/patient/login` → JWT stored → redirected to `/patient/home`
- [ ] Invalid therapist_code at patient registration → inline error, no navigation
- [ ] Both roles use JWT in localStorage('token') — no localStorage('patient_user') anywhere
- [ ] `/therapist/*` routes redirect to `/patient/home` if logged in as patient
- [ ] `/patient/*` routes redirect to `/therapist/dashboard` if logged in as therapist

### Therapist portal
- [ ] Dashboard shows patient count, alert count, active plan count
- [ ] PatientsList shows cards, not a table — clicking a card navigates to patient page
- [ ] Patient registration modal shows 23 defects in 3 groups (10 / 8 / 5)
- [ ] Defect multi-select works — any number selectable
- [ ] PatientPage has 3 tabs: Baseline, Plan, Progress
- [ ] "Generate AI Plan" disabled until baseline is complete
- [ ] Weekly plan shows 7 columns (Day 1–7 with dates)
- [ ] Add task dropdown is filtered by patient's defect codes — only relevant tasks shown
- [ ] Tasks can be dragged within a day (reorder) and between days (move)
- [ ] "Approve & Publish" approves the plan and makes it visible to patient
- [ ] Plan is still editable after approval
- [ ] Profile page shows therapist code with copy button

### Patient portal
- [ ] Home shows baseline banner if no baseline completed
- [ ] Home shows "plan being prepared" if baseline done but plan not approved
- [ ] Home shows today's tasks when plan is approved
- [ ] Tasks page shows ONLY today's tasks, never the full week
- [ ] Tasks page has three sections: Completed, In Progress, Pending
- [ ] Progress page shows per-defect accuracy bars with colour coding
- [ ] Progress page shows "Focus areas" section with lowest-accuracy defects
- [ ] Profile page shows therapist name and patient details (read-only except password)

### Core functionality (must not break)
- [ ] `/session/:sessionId` loads and runs correctly — SessionRunner unchanged
- [ ] `/baseline/:resultId` loads and runs correctly — BaselineRunner unchanged
- [ ] Audio submission to `POST /api/v1/session/{id}/attempt` returns full breakdown
- [ ] Adaptive engine still fires: frustration → immediate drop, 3 fails → drop, 2 passes → advance
- [ ] FeedbackPanel renders score gauge, result badge, adaptive action, breakdown tabs