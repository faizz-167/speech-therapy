-- 1. Header comment block
-- Speech Therapy Platform Complete Database Schema v2.0
-- Generated dynamically based on system_prompt_v2.md

-- 2. CREATE EXTENSION
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 3. DROP TYPE IF EXISTS + CREATE TYPE (all enums)
DROP TYPE IF EXISTS defect_category_enum CASCADE;
DROP TYPE IF EXISTS baseline_domain_enum CASCADE;
DROP TYPE IF EXISTS admin_method_enum CASCADE;
DROP TYPE IF EXISTS relevance_enum CASCADE;
DROP TYPE IF EXISTS item_position_enum CASCADE;
DROP TYPE IF EXISTS response_type_enum CASCADE;
DROP TYPE IF EXISTS formula_mode_enum CASCADE;
DROP TYPE IF EXISTS scope_enum CASCADE;
DROP TYPE IF EXISTS task_type_enum CASCADE;
DROP TYPE IF EXISTS level_name_enum CASCADE;
DROP TYPE IF EXISTS prompt_type_enum CASCADE;
DROP TYPE IF EXISTS task_mode_enum CASCADE;
DROP TYPE IF EXISTS eval_criteria_enum CASCADE;
DROP TYPE IF EXISTS severity_enum CASCADE;
DROP TYPE IF EXISTS plan_status_enum CASCADE;
DROP TYPE IF EXISTS assignment_status_enum CASCADE;
DROP TYPE IF EXISTS session_type_enum CASCADE;
DROP TYPE IF EXISTS attempt_result_enum CASCADE;

CREATE TYPE defect_category_enum      AS ENUM ('articulation','fluency','cognition');
CREATE TYPE baseline_domain_enum      AS ENUM ('articulation','fluency','cognition','voice');
CREATE TYPE admin_method_enum         AS ENUM ('clinician-administered','clinician-rated','self-report','software-assisted');
CREATE TYPE relevance_enum            AS ENUM ('primary','secondary');
CREATE TYPE item_position_enum        AS ENUM ('initial','medial','final');
CREATE TYPE response_type_enum        AS ENUM ('picture_naming','word_repetition','minimal_pairs','syllable_repetition','sentence_reading','paragraph_reading','sequence_recitation','free_description');
CREATE TYPE formula_mode_enum         AS ENUM ('word_drill','sentence_read','paragraph_read','free_speech');
CREATE TYPE scope_enum                AS ENUM ('word_onset','full_word','full_sentence','rate_only','distribution');
CREATE TYPE task_type_enum            AS ENUM ('articulation','fluency','cognition');
CREATE TYPE level_name_enum           AS ENUM ('easy','medium','advanced');
CREATE TYPE prompt_type_enum          AS ENUM ('warmup','exercise');
CREATE TYPE task_mode_enum            AS ENUM ('word_drill','sentence_read','paragraph_read','free_speech','roleplay','stuttering');
CREATE TYPE eval_criteria_enum        AS ENUM ('pronunciation','fluency','accuracy','memory');
CREATE TYPE severity_enum             AS ENUM ('mild','moderate','severe','profound');
CREATE TYPE plan_status_enum          AS ENUM ('draft','active','completed','paused','cancelled');
CREATE TYPE assignment_status_enum    AS ENUM ('pending','approved','active','completed');
CREATE TYPE session_type_enum         AS ENUM ('initial_assessment','therapy','review','discharge');
CREATE TYPE attempt_result_enum       AS ENUM ('pass','partial','fail','skipped');

-- 4. DROP TABLE IF EXISTS in reverse FK order (for clean re-runs)
DROP TABLE IF EXISTS patient_task_progress CASCADE;
DROP TABLE IF EXISTS session_prompt_attempt CASCADE;
DROP TABLE IF EXISTS session CASCADE;
DROP TABLE IF EXISTS plan_task_assignment CASCADE;
DROP TABLE IF EXISTS therapy_plan CASCADE;
DROP TABLE IF EXISTS baseline_item_result CASCADE;
DROP TABLE IF EXISTS patient_baseline_result CASCADE;
DROP TABLE IF EXISTS patient CASCADE;
DROP TABLE IF EXISTS therapist CASCADE;
DROP TABLE IF EXISTS task_defect_mapping CASCADE;
DROP TABLE IF EXISTS feedback_rule CASCADE;
DROP TABLE IF EXISTS adaptive_threshold CASCADE;
DROP TABLE IF EXISTS prompt_scoring CASCADE;
DROP TABLE IF EXISTS evaluation_target CASCADE;
DROP TABLE IF EXISTS speech_target CASCADE;
DROP TABLE IF EXISTS prompt CASCADE;
DROP TABLE IF EXISTS task_level CASCADE;
DROP TABLE IF EXISTS task CASCADE;
DROP TABLE IF EXISTS baseline_item CASCADE;
DROP TABLE IF EXISTS baseline_section CASCADE;
DROP TABLE IF EXISTS baseline_defect_mapping CASCADE;
DROP TABLE IF EXISTS baseline_assessment CASCADE;
DROP TABLE IF EXISTS defect CASCADE;

-- 5. CREATE TABLE statements (22 tables, in FK dependency order)

CREATE TABLE defect (
    defect_id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category defect_category_enum NOT NULL,
    description TEXT
);

CREATE TABLE baseline_assessment (
    baseline_id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    domain baseline_domain_enum NOT NULL,
    description TEXT,
    administration_method admin_method_enum NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE baseline_defect_mapping (
    mapping_id TEXT PRIMARY KEY,
    baseline_id TEXT REFERENCES baseline_assessment(baseline_id) ON DELETE CASCADE,
    defect_id TEXT REFERENCES defect(defect_id) ON DELETE CASCADE,
    relevance_level relevance_enum,
    clinical_notes TEXT
);

CREATE TABLE baseline_section (
    section_id TEXT PRIMARY KEY,
    baseline_id TEXT REFERENCES baseline_assessment(baseline_id) ON DELETE CASCADE,
    section_name TEXT NOT NULL,
    instructions TEXT,
    target_defect_id TEXT REFERENCES defect(defect_id),
    order_index INTEGER NOT NULL
);

CREATE TABLE baseline_item (
    item_id TEXT PRIMARY KEY,
    section_id TEXT NOT NULL REFERENCES baseline_section(section_id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    task_name TEXT NOT NULL,
    instruction TEXT NOT NULL,
    display_content TEXT NOT NULL,
    response_type response_type_enum NOT NULL,
    expected_output TEXT NOT NULL,
    target_phoneme TEXT,
    image_keyword TEXT,
    scoring_method TEXT NOT NULL,
    max_score INTEGER NOT NULL,
    scope scope_enum NOT NULL,
    formula_mode formula_mode_enum NOT NULL,
    reference_text JSONB,
    wpm_range JSONB NOT NULL,
    formula_weights JSONB NOT NULL,
    fusion_weights JSONB NOT NULL,
    defect_codes JSONB NOT NULL,
    defect_phoneme_focus JSONB,
    CONSTRAINT chk_max_score CHECK (max_score > 0),
    CONSTRAINT chk_order_index CHECK (order_index > 0)
);

CREATE TABLE task (
    task_id TEXT PRIMARY KEY,
    source_id INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type task_type_enum NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_level (
    level_id TEXT PRIMARY KEY,
    task_id TEXT REFERENCES task(task_id) ON DELETE CASCADE,
    source_level_id INTEGER,
    level_name level_name_enum NOT NULL,
    difficulty_score INTEGER NOT NULL
);

CREATE TABLE prompt (
    prompt_id TEXT PRIMARY KEY,
    level_id TEXT REFERENCES task_level(level_id) ON DELETE CASCADE,
    source_prompt_id INTEGER UNIQUE NOT NULL,
    prompt_type prompt_type_enum NOT NULL,
    scenario_context TEXT,
    instruction TEXT,
    display_content TEXT,
    target_response TEXT,
    evaluation_criteria eval_criteria_enum,
    accuracy_check TEXT,
    task_mode task_mode_enum
);

CREATE TABLE speech_target (
    speech_target_id TEXT PRIMARY KEY,
    prompt_id TEXT REFERENCES prompt(prompt_id) ON DELETE CASCADE,
    raw_speech_target JSONB NOT NULL
);

CREATE TABLE evaluation_target (
    eval_target_id TEXT PRIMARY KEY,
    prompt_id TEXT REFERENCES prompt(prompt_id) ON DELETE CASCADE,
    scope TEXT,
    target_phonemes JSONB,
    check_on_words JSONB,
    substitution_errors JSONB,
    pass_rule TEXT,
    fail_rule TEXT,
    partial_pass TEXT
);

CREATE TABLE prompt_scoring (
    scoring_id TEXT PRIMARY KEY,
    prompt_id TEXT REFERENCES prompt(prompt_id) ON DELETE CASCADE,
    active BOOLEAN NOT NULL DEFAULT FALSE,
    note TEXT,
    response_latency_max_sec INTEGER,
    minimum_speech_detected BOOLEAN,
    task_completion_min_percent INTEGER,
    layer1_what TEXT,
    layer1_method TEXT,
    layer1_pass TEXT,
    layer2_what TEXT,
    layer2_method TEXT,
    layer2_target_pairs JSONB,
    layer2_pass_threshold TEXT,
    layer2_fail_condition TEXT
);

CREATE TABLE adaptive_threshold (
    threshold_id TEXT PRIMARY KEY,
    scoring_id TEXT REFERENCES prompt_scoring(scoring_id) ON DELETE CASCADE,
    advance_to_next_level INTEGER NOT NULL,
    stay_at_current_level TEXT NOT NULL,
    drop_to_easier_level INTEGER NOT NULL,
    consecutive_to_advance INTEGER NOT NULL,
    consecutive_to_drop INTEGER NOT NULL
);

CREATE TABLE feedback_rule (
    feedback_id TEXT PRIMARY KEY,
    prompt_id TEXT REFERENCES prompt(prompt_id) ON DELETE CASCADE,
    pass_message TEXT,
    partial_message TEXT,
    fail_message TEXT
);

CREATE TABLE task_defect_mapping (
    mapping_id TEXT PRIMARY KEY,
    task_id TEXT REFERENCES task(task_id) ON DELETE CASCADE,
    defect_id TEXT REFERENCES defect(defect_id) ON DELETE CASCADE,
    relevance_level relevance_enum,
    clinical_notes TEXT
);

CREATE TABLE therapist (
    therapist_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    license_number TEXT UNIQUE NOT NULL,
    specialization TEXT,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE patient (
    patient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT,
    primary_diagnosis TEXT,
    assigned_therapist_id UUID REFERENCES therapist(therapist_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE patient_baseline_result (
    result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patient(patient_id) ON DELETE RESTRICT,
    baseline_id TEXT REFERENCES baseline_assessment(baseline_id) ON DELETE RESTRICT,
    therapist_id UUID REFERENCES therapist(therapist_id) ON DELETE RESTRICT,
    assessed_on DATE NOT NULL,
    raw_score INTEGER,
    percentile NUMERIC(5,2),
    severity_rating severity_enum,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE baseline_item_result (
    item_result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id UUID REFERENCES patient_baseline_result(result_id) ON DELETE CASCADE,
    item_id TEXT REFERENCES baseline_item(item_id) ON DELETE RESTRICT,
    score_given INTEGER,
    error_noted TEXT,
    clinician_note TEXT
);

CREATE TABLE therapy_plan (
    plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patient(patient_id) ON DELETE RESTRICT,
    therapist_id UUID REFERENCES therapist(therapist_id) ON DELETE RESTRICT,
    plan_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status plan_status_enum,
    goals TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE plan_task_assignment (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES therapy_plan(plan_id) ON DELETE CASCADE,
    task_id TEXT REFERENCES task(task_id) ON DELETE RESTRICT,
    therapist_id UUID REFERENCES therapist(therapist_id) ON DELETE RESTRICT,
    status assignment_status_enum,
    clinical_rationale TEXT,
    assigned_on DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE session (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES therapy_plan(plan_id) ON DELETE RESTRICT,
    patient_id UUID REFERENCES patient(patient_id) ON DELETE RESTRICT,
    therapist_id UUID REFERENCES therapist(therapist_id) ON DELETE SET NULL,
    session_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER,
    session_type session_type_enum,
    session_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE session_prompt_attempt (
    attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES session(session_id) ON DELETE CASCADE,
    prompt_id TEXT REFERENCES prompt(prompt_id) ON DELETE RESTRICT,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    result attempt_result_enum,
    accuracy_score NUMERIC(5,2),
    response_latency_sec INTEGER,
    speech_detected BOOLEAN,
    asr_transcript TEXT,
    therapist_override_note TEXT,
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE patient_task_progress (
    progress_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patient(patient_id) ON DELETE CASCADE,
    task_id TEXT REFERENCES task(task_id) ON DELETE RESTRICT,
    current_level_id TEXT REFERENCES task_level(level_id) ON DELETE RESTRICT,
    consecutive_passes INTEGER NOT NULL DEFAULT 0,
    consecutive_fails INTEGER NOT NULL DEFAULT 0,
    overall_accuracy NUMERIC(5,2),
    last_attempted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. All index DDL
-- Domain 1
CREATE INDEX ON baseline_section(baseline_id);
CREATE INDEX ON baseline_section(target_defect_id);
CREATE INDEX ON baseline_item(section_id);
CREATE INDEX ON baseline_item(response_type);
CREATE INDEX ON baseline_item(formula_mode);
CREATE INDEX ON baseline_item USING gin(defect_codes);
CREATE INDEX ON baseline_defect_mapping(defect_id);
CREATE INDEX ON baseline_defect_mapping(baseline_id);

-- Domain 2
CREATE INDEX ON task(type);
CREATE INDEX ON task_level(task_id);
CREATE INDEX ON prompt(level_id);
CREATE INDEX ON prompt(prompt_type);
CREATE INDEX ON task_defect_mapping(defect_id);
CREATE INDEX ON task_defect_mapping(task_id);

-- Domain 3
CREATE INDEX ON patient(assigned_therapist_id);
CREATE INDEX ON patient_baseline_result(patient_id);
CREATE INDEX ON patient_baseline_result(baseline_id);
CREATE INDEX ON baseline_item_result(result_id);
CREATE INDEX ON therapy_plan(patient_id, status);
CREATE INDEX ON plan_task_assignment(plan_id);
CREATE INDEX ON plan_task_assignment(task_id);

-- Domain 4 (high-volume)
CREATE INDEX ON session(plan_id);
CREATE INDEX ON session(patient_id);
CREATE INDEX ON session(session_date DESC);
CREATE INDEX ON session_prompt_attempt(session_id);
CREATE INDEX ON session_prompt_attempt(prompt_id);
CREATE INDEX ON session_prompt_attempt(result);
CREATE INDEX ON session_prompt_attempt(attempted_at DESC);
CREATE INDEX ON patient_task_progress(patient_id);
CREATE INDEX ON patient_task_progress(last_attempted_at DESC);

-- 7. All unique constraint DDL
ALTER TABLE patient_task_progress ADD CONSTRAINT uq_patient_task UNIQUE (patient_id, task_id);
ALTER TABLE plan_task_assignment  ADD CONSTRAINT uq_plan_task    UNIQUE (plan_id, task_id);

-- 8. All check constraint DDL
ALTER TABLE therapy_plan ADD CONSTRAINT chk_plan_dates CHECK (end_date IS NULL OR end_date > start_date);
ALTER TABLE patient ADD CONSTRAINT chk_dob CHECK (date_of_birth < CURRENT_DATE);
ALTER TABLE adaptive_threshold ADD CONSTRAINT chk_thresholds CHECK (advance_to_next_level > drop_to_easier_level);
ALTER TABLE session_prompt_attempt ADD CONSTRAINT chk_accuracy CHECK (accuracy_score IS NULL OR accuracy_score BETWEEN 0 AND 100);
ALTER TABLE patient_task_progress ADD CONSTRAINT chk_consec CHECK (consecutive_passes >= 0 AND consecutive_fails >= 0);
