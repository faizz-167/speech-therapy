# System Restructure

## Goal
Rebuild the authentication system, routing architecture, and all UI pages of the VocalSync speech therapy platform to support a dual-role JWT flow, new therapist/patient portal architectures, and AI-driven weekly plan generation, without altering the core clinical analysis algorithms.

## Tasks
- [ ] Task 1: Update Database schema → Verify: Alembic migration runs, `password_hash`, `role`, `years_of_experience`, `day_index` columns present.
- [ ] Task 2: Implement Backend Auth Endpoints → Verify: `POST /api/v1/auth/therapist/register`, `/login`, `POST /api/v1/auth/patient/register`, `/login` return valid JWTs with role.
- [ ] Task 3: Update Plan/Week Endpoints → Verify: `POST /api/v1/plans` with `generate=true` creates week assignment.
- [ ] Task 4: Context & Routing Update → Verify: AuthContext handles JWT for both roles, App.jsx uses standard React Router setup with new public/protected paths.
- [ ] Task 5: Build Public Pages → Verify: Landing, Therapist/Patient Register & Login components render correctly and perform auth.
- [ ] Task 6: Build Therapist Portal (Dashboard, PatientsList, Profile) → Verify: Dashboard loads counts/alerts, PatientsList allows new patient registration without password.
- [ ] Task 7: Build Therapist PatientPage & Plan Builder → Verify: Patient profile displays Baseline, Plan, Progress tabs. Plan week builder functions.
- [ ] Task 8: Build Patient Portal (Home, Tasks, Progress, Profile) → Verify: Bottom nav loads, only current day's tasks visible, baseline banner correctly prompted.

## Done When
- [ ] Database migrations applied and active.
- [ ] Backend auth and endpoints functioning correctly via API tests.
- [ ] Therapist can register, generate a code, and manage patients.
- [ ] Patient can register using the code, take baseline, and view tasks.
- [ ] Strict isolation maintained between roles.
- [ ] Clinically validated components (ASR, SER, CTC analysis) remain fully intact and operational.
