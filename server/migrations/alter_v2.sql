-- 3.1 Add two columns to patient_task_progress
ALTER TABLE patient_task_progress
  ADD COLUMN IF NOT EXISTS clinician_alert  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS progress_delta   NUMERIC(5,2);

CREATE INDEX IF NOT EXISTS idx_progress_alert ON patient_task_progress(patient_id)
  WHERE clinician_alert = TRUE;

-- 3.2 Add retry_message to feedback_rule
ALTER TABLE feedback_rule
  ADD COLUMN IF NOT EXISTS retry_message TEXT;

-- 3.3 Add audio_file_ref to session_prompt_attempt
ALTER TABLE session_prompt_attempt
  ADD COLUMN IF NOT EXISTS audio_file_ref TEXT,
  ADD COLUMN IF NOT EXISTS emotion_label  TEXT,
  ADD COLUMN IF NOT EXISTS behavioral_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS wpm             NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS disfluency_count INTEGER,
  ADD COLUMN IF NOT EXISTS phoneme_accuracy NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS nlp_score       NUMERIC(5,2);

-- 3.4 Index additions for new query patterns
CREATE INDEX IF NOT EXISTS idx_ptp_alert    ON patient_task_progress(patient_id) WHERE clinician_alert = TRUE;
CREATE INDEX IF NOT EXISTS idx_bir_item     ON baseline_item_result(item_id);
CREATE INDEX IF NOT EXISTS idx_pta_status   ON plan_task_assignment(status);
