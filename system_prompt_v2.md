# Architecture Audit Prompt — AI-Assisted Speech Therapy Platform
## Purpose: Verify correct implementation of task metrics and formula analysis system

---

You are a senior AI systems auditor reviewing a speech therapy platform built with
FastAPI + PostgreSQL + React 19. Your job is to verify whether the implementation
matches the defined clinical scoring architecture exactly.

Work through every checkpoint below. For each one:
- READ the relevant file or function
- STATE what you found
- VERDICT: PASS / FAIL / PARTIAL
- If FAIL or PARTIAL: state exactly what is wrong and what the fix is

---

## SECTION 1 — Database Schema Verification

**1.1** Open your database schema (schema.sql or models/).
Verify these 22 tables exist:
defect, baseline_assessment, baseline_defect_mapping, baseline_section,
baseline_item, task, task_level, prompt, speech_target, evaluation_target,
prompt_scoring, adaptive_threshold, feedback_rule, task_defect_mapping,
therapist, patient, patient_baseline_result, baseline_item_result,
therapy_plan, plan_task_assignment, session, session_prompt_attempt,
patient_task_progress
EXPECTED: 22 tables. Missing any = FAIL.

**1.2** Open the patient_task_progress model/table.
Verify these columns exist:
consecutive_passes, consecutive_fails, overall_accuracy, current_level_id,
clinician_alert (BOOLEAN DEFAULT FALSE), progress_delta (NUMERIC 5,2)
EXPECTED: All 6 columns present. Missing clinician_alert or progress_delta = FAIL.
These are required by the adaptive logic and regression detection.

**1.3** Open the feedback_rule model/table.
Verify column retry_message TEXT exists alongside pass_message, partial_message, fail_message.
EXPECTED: 4 message columns. Missing retry_message = FAIL.
retry_message is used for the STAY adaptive action (not the same as fail_message).

**1.4** Open the session_prompt_attempt model/table.
Verify these raw signal columns exist:
audio_file_ref, emotion_label, behavioral_score, wpm, disfluency_count,
phoneme_accuracy, nlp_score
EXPECTED: All 7 columns present. These store per-component AI output alongside
the final accuracy_score. Missing = PARTIAL.

**1.5** Check the prompt table.
Verify prompt_type column accepts exactly: warmup | exercise
Verify task_mode column accepts exactly:
word_drill | sentence_read | paragraph_read | free_speech | roleplay | stuttering
EXPECTED: Both enums correct. Wrong values or missing enum = FAIL.

---

## SECTION 2 — Data Migration Verification

**2.1** Run this SQL and verify row counts exactly:
```sql
SELECT
  (SELECT COUNT(*) FROM defect)                  AS defect,           -- expected 23
  (SELECT COUNT(*) FROM baseline_assessment)     AS baseline_assess,  -- expected 12
  (SELECT COUNT(*) FROM baseline_defect_mapping) AS bdmap,            -- expected 34
  (SELECT COUNT(*) FROM baseline_section)        AS b_section,        -- expected 37
  (SELECT COUNT(*) FROM baseline_item)           AS b_item,           -- expected 149
  (SELECT COUNT(*) FROM task)                    AS task,             -- expected 30
  (SELECT COUNT(*) FROM task_level)              AS task_level,       -- expected 90
  (SELECT COUNT(*) FROM prompt)                  AS prompt,           -- expected 180
  (SELECT COUNT(*) FROM speech_target)           AS speech_target,    -- expected 180
  (SELECT COUNT(*) FROM evaluation_target)       AS eval_target,      -- expected 180
  (SELECT COUNT(*) FROM prompt_scoring)          AS scoring,          -- expected 180
  (SELECT COUNT(*) FROM adaptive_threshold)      AS adaptive,         -- expected 90
  (SELECT COUNT(*) FROM feedback_rule)           AS feedback,         -- expected 180
  (SELECT COUNT(*) FROM task_defect_mapping)     AS tdmap;            -- expected 64
```
Any mismatch = FAIL for that table.

**2.2** Run this SQL to verify warmup vs exercise split:
```sql
SELECT prompt_type, COUNT(*) FROM prompt GROUP BY prompt_type;
-- expected: warmup=90, exercise=90
```

**2.3** Run this SQL to verify adaptive_threshold only covers exercise prompts:
```sql
SELECT COUNT(*) FROM adaptive_threshold at
JOIN prompt_scoring ps ON at.scoring_id = ps.scoring_id
WHERE ps.active = false;
-- expected: 0 rows. Any warmup with adaptive_threshold = FAIL.
```

**2.4** Run this SQL to verify baseline_item formula fields are populated:
```sql
SELECT
  COUNT(*) FILTER (WHERE formula_weights IS NULL) AS missing_fw,   -- expected 0
  COUNT(*) FILTER (WHERE wpm_range IS NULL)       AS missing_wpm,  -- expected 0
  COUNT(*) FILTER (WHERE fusion_weights IS NULL)  AS missing_fus,  -- expected 0
  COUNT(*) FILTER (WHERE formula_mode IS NULL)    AS missing_mode  -- expected 0
FROM baseline_item;
```

**2.5** Run this SQL to verify task_mode distribution:
```sql
SELECT task_mode, COUNT(*) FROM prompt GROUP BY task_mode ORDER BY COUNT(*) DESC;
-- expected: sentence_read=71, free_speech=51, roleplay=20,
--           word_drill=19, paragraph_read=13, stuttering=6
```

---

## SECTION 3 — Backend: Formula Config Lookup

**3.1** Open services/analysis_service.py.
Verify a FORMULA_CONFIG dict exists at module level (not inside a function).
Verify it has exactly 6 keys: word_drill, sentence_read, paragraph_read,
free_speech, stuttering, roleplay.
EXPECTED: All 6 present. Missing any = FAIL.

**3.2** For each task_mode, verify these exact values:

word_drill:
  formula_weights: {phoneme_accuracy:0.65, word_accuracy:0.25, confidence_score:0.10, fluency_score:0.00, speech_rate:0.00}
  wpm_range: {min:60, max:90, tolerance:15}
  fusion_weights: {speech:0.95, engagement:0.05}

sentence_read:
  formula_weights: {phoneme_accuracy:0.45, word_accuracy:0.25, fluency_score:0.20, speech_rate:0.10, confidence_score:0.00}
  wpm_range: {min:80, max:100, tolerance:15}
  fusion_weights: {speech:0.90, engagement:0.10}

paragraph_read:
  formula_weights: {phoneme_accuracy:0.35, word_accuracy:0.25, fluency_score:0.25, speech_rate:0.15, confidence_score:0.00}
  wpm_range: {min:130, max:150, tolerance:20}
  fusion_weights: {speech:0.85, engagement:0.15}

free_speech:
  formula_weights: {phoneme_accuracy:0.40, fluency_score:0.35, speech_rate:0.15, confidence_score:0.10, word_accuracy:0.00}
  wpm_range: {min:130, max:160, tolerance:25}
  fusion_weights: {speech:0.75, engagement:0.25}

stuttering:
  formula_weights: {fluency_score:0.55, phoneme_accuracy:0.25, speech_rate:0.20, word_accuracy:0.00, confidence_score:0.00}
  wpm_range: {min:80, max:120, tolerance:20}
  fusion_weights: {speech:0.60, engagement:0.40}

roleplay:
  formula_weights: {phoneme_accuracy:0.25, fluency_score:0.35, speech_rate:0.15, nlp_score:0.25, word_accuracy:0.00}
  wpm_range: {min:110, max:150, tolerance:25}
  fusion_weights: {speech:0.70, engagement:0.30}

Any wrong value = FAIL. All weights in formula_weights must sum to 1.0.

**3.3** Verify get_formula_config(task_mode) raises ValueError for unknown task_mode.
Test by calling get_formula_config("unknown_mode") — should raise, not return None.
Returning None = FAIL. Silent failure would use wrong weights.

**3.4** Verify the lookup is called ONLY for adult task exercise prompts.
For baseline items, the code must read formula_weights, wpm_range, fusion_weights
directly from the database row — NOT from FORMULA_CONFIG.
Check score_attempt() or equivalent function: it must branch on source type.
If baseline items use the lookup table instead of the DB row = FAIL.

---

## SECTION 4 — Backend: Warmup Gate

**4.1** Open the submit-attempt endpoint or score_attempt() function.
Verify the FIRST check reads prompt_scoring.active.
If active == False → warmup path runs, full AI pipeline is skipped entirely.
If active == True → exercise path runs full pipeline.
EXPECTED: active check is first. If it is checked after any AI model runs = FAIL.

**4.2** Verify the warmup path checks exactly 3 behavioural signals:
  response_latency_sec <= prompt_scoring.response_latency_max_sec (10 seconds)
  speech_detected == True (minimum speech above noise floor)
  completion_percent >= prompt_scoring.task_completion_min_percent (50%)
EXPECTED: All 3 checked. Missing any = PARTIAL.

**4.3** Verify warmup result is NOT stored in session_prompt_attempt with a scored
accuracy_score. The result column should be "skipped" or attempt is stored with
accuracy_score = NULL and no adaptive decision made.
If warmup sets accuracy_score to a number = FAIL. It would corrupt progress tracking.

**4.4** Verify patient_task_progress is NOT updated after a warmup attempt.
consecutive_passes, consecutive_fails must not change on warmup.
EXPECTED: No write to patient_task_progress after warmup = PASS.

---

## SECTION 5 — Backend: AI Pipeline Components

**5.1** Open services/asr_service.py (or equivalent).
Verify Whisper returns ALL of these values per attempt:
  transcript (string), wpm (float), disfluency_count (int),
  token_confidence_scores (list of floats), fluency_score (float 0-100)
EXPECTED: All 5 outputs. Missing wpm or disfluency_count = FAIL.

**5.2** Verify disfluency detection counts these exact categories:
  repetitions ("I I want"), revisions ("I mean"), interjections (um, uh, er, like, you know)
EXPECTED: All 3 categories. Only counting "um/uh" = PARTIAL.

**5.3** Verify Fluency Score uses this exact formula:
  DR = (repetitions + revisions + interjections) / total_words × 100
  PS = 100 − sum(pause_penalties) where penalties are:
       mid-phrase <0.5s = -2, mid-phrase 0.5-1s = -4, mid-phrase >1s = -8
       at punctuation boundary any duration = 0 penalty
  FS = 0.60 × (100 − DR×3) + 0.40 × PS   floor=0 ceiling=100
EXPECTED: Exact formula. Using only pause penalties without disfluency rate = FAIL (v1 bug).

**5.4** Open services/phoneme_service.py (or equivalent).
Verify HuBERT CTC aligns against the TARGET PHONEME SEQUENCE from the DB,
NOT against the Whisper transcript.
This is the critical v1 fix: alignment must be against evaluation_target.target_phonemes
from the database, bypassing Whisper's auto-correction.
If aligning against transcript = FAIL. This is the most common v1 error.

**5.5** Verify per-phoneme scoring uses:
  correct production = 1.0
  distortion (right phoneme, wrong quality) = 0.5
  substitution (wrong phoneme) = 0.0
  omission = 0.0
EXPECTED: All 4 values. Binary correct/wrong only = PARTIAL.

**5.6** Verify Speech Rate Score uses:
  WPM = (word_count / duration_seconds) × 60
  midpoint = (wpm_range.min + wpm_range.max) / 2
  deviation = |WPM − midpoint| − wpm_range.tolerance
  SRS = 100 − max(0, deviation × 1.5)   floor=0 ceiling=100
EXPECTED: Exact formula with per-task wpm_range. Fixed ideal WPM for all tasks = FAIL (v1 bug).

**5.7** Open services/emotion_service.py (or equivalent).
Verify SpeechBrain SER returns: emotion_label, raw_emotion_scores dict,
behavioral_score (0-100), frustration_score (0.0-1.0).
EXPECTED: All 4 outputs. Missing frustration_score = FAIL.
frustration_score > 0.40 triggers DROP override regardless of accuracy_score.

**5.8** Verify Behavioral Score formula:
  RL_score: 0-1s=100, 1-2.5s=80, 2.5-5s=60, 5-10s=30, >10s=0
  TC = (words_spoken / words_required) × 100
  AQ = 100 if topic relevance >= 0.60, else 50 if partial, else 0
  BehavioralScore = 0.40×RL_score + 0.35×TC + 0.25×AQ
EXPECTED: Exact formula. Missing RL_score banding = PARTIAL.

**5.9** Verify Engagement Score formula:
  EngagementScore = 0.65×EmotionScore + 0.35×BehavioralScore
  NOT 0.70/0.30 — this was the v1 value. The correct v2 value is 0.65/0.35.
EXPECTED: 0.65/0.35 split. Using 0.70/0.30 = FAIL (v1 bug).

**5.10** Verify NLP service runs ONLY for free_speech and roleplay task_modes.
It must NOT run for word_drill, sentence_read, paragraph_read, or stuttering.
If NLP runs on all modes = FAIL (unnecessary computation + wrong scoring).

---

## SECTION 6 — Backend: Score Fusion and Rule Engine

**6.1** Open analysis_service.py.
Verify SpeechScore is calculated as:
  SpeechScore = sum(formula_weights[component] × component_score for each component)
  All weights must be read from formula_weights dict (from DB row for baseline,
  from FORMULA_CONFIG lookup for adult tasks).
EXPECTED: Dynamic weights, not hardcoded per-component values. Hardcoded = FAIL.

**6.2** Verify FinalScore fusion:
  FinalScore = fusion_weights["speech"] × SpeechScore
             + fusion_weights["engagement"] × EngagementScore
  Weights must come from fusion_weights (DB row or FORMULA_CONFIG).
  Fixed 0.75/0.25 split for all modes = FAIL (v1 bug).

**6.3** Verify Rule-Based Adjustments are applied AFTER fusion:
  Rule 1: FinalEngagement < 35 → FinalScore -= 5
  Rule 2: FinalEngagement > 85 → FinalScore += 5
  Rule 3: PhonemeAccuracy < 35 → FinalScore = min(FinalScore, 45)
  Rule 4: ConfidenceScore < 50 → flag as "low confidence, review recommended",
           do NOT use this score for adaptive difficulty decision
  Rule 5: warmup prompt → skip rules entirely, only behavioural check
EXPECTED: All 5 rules applied in order. Missing Rule 4 = FAIL.
Rule 4 is the confidence gate — low-confidence attempts must not drive level changes.

**6.4** Verify Adaptive Decision logic reads from adaptive_threshold DB row:
  score >= advance_to_next_level → consecutive_passes += 1, consecutive_fails = 0
    if consecutive_passes >= consecutive_to_advance → action = ADVANCE
    else → action = STAY
  score < drop_to_easier_level → consecutive_fails += 1, consecutive_passes = 0
    if consecutive_fails >= consecutive_to_drop → action = DROP
    else → action = STAY
  else (in stay range) → action = STAY
EXPECTED: Reads from DB row. Hardcoded 75/55 thresholds = FAIL.
Different tasks have different thresholds (advance ranges from 68 to 75 in your data).

**6.5** Verify frustration override:
  IF frustration_score > 0.40 AND consecutive_fails >= 2 → action = DROP immediately
  This override runs BEFORE the threshold comparison above.
EXPECTED: Frustration check before threshold check. Missing entirely = FAIL.

**6.6** Verify clinician alert logic:
  After every exercise attempt:
    baseline_accuracy = first recorded overall_accuracy for this patient+task
    progress_delta = baseline_accuracy − new_overall_accuracy
    IF progress_delta > 15.0 → clinician_alert = True, progress_delta stored
    IF clinician_alert == True → action cannot be ADVANCE (freeze upgrades)
EXPECTED: Alert computed and written to patient_task_progress.
Missing clinician_alert column or logic = FAIL.

**6.7** Verify feedback message selection:
  result == "pass"    → feedback_rule.pass_message
  result == "partial" → feedback_rule.partial_message
  result == "fail" AND action == STAY → feedback_rule.retry_message
  result == "fail" AND action == DROP → feedback_rule.fail_message
EXPECTED: 4 distinct cases. Using only pass/fail (2 messages) = PARTIAL.
retry_message must be distinct from fail_message.

---

## SECTION 7 — Backend: Baseline Item Scoring

**7.1** Verify baseline item scoring reads formula_weights directly from the
baseline_item DB row (NOT from FORMULA_CONFIG lookup table).
The baseline_item table has formula_weights, wpm_range, fusion_weights stored per row.
EXPECTED: DB read. Using FORMULA_CONFIG for baseline = FAIL.

**7.2** Verify baseline item scoring result is written to baseline_item_result:
  result_id (FK to patient_baseline_result), item_id (FK to baseline_item),
  score_given, error_noted, clinician_note
EXPECTED: All fields written. Missing error_noted = PARTIAL.
error_noted stores the specific substitution error (e.g. "/w/ substitution on /r/ onset").

**7.3** Verify that after all baseline items are scored, the system aggregates
scores by defect_codes and writes to patient_baseline_result with severity_rating.
EXPECTED: Aggregation query runs. No aggregation = FAIL.
Without this, defect profile cannot be built and therapy plan cannot be generated.

**7.4** Verify baseline scoring does NOT trigger adaptive_threshold logic.
Baseline items have no adaptive_threshold rows. The scoring function must not
attempt to read or use adaptive thresholds for baseline items.
EXPECTED: No adaptive logic on baseline path. Using task adaptive thresholds
for baseline = FAIL (wrong clinical behavior).

---

## SECTION 8 — Backend: API Routes

**8.1** Verify these routes exist and return correct HTTP methods:
  GET  /api/v1/baselines/{baseline_id}/sections    → nested sections + items
  POST /api/v1/baseline-results                    → opens assessment session
  POST /api/v1/item-results                        → records one item score
  POST /api/v1/baseline-results/{id}/complete      → finalises + returns defect_profile
  GET  /api/v1/defects/{id}/recommended-tasks      → queries task_defect_mapping
  POST /api/v1/plans/{id}/assignments              → adds task to plan
  PATCH /api/v1/assignments/{id}/approve           → therapist approval gate
  GET  /api/v1/sessions/{id}/queue                 → full prompt payload for session
  POST /api/v1/sessions/{id}/submit-attempt        → multipart audio + metadata
  GET  /api/v1/patients/{id}/progress              → progress per task
  GET  /api/v1/clinician/alerts                    → lists clinician_alert patients
  PATCH /api/v1/progress/{id}/dismiss-alert        → clears clinician_alert flag
EXPECTED: All 12 routes present. Missing submit-attempt = CRITICAL FAIL.

**8.2** Verify submit-attempt accepts multipart/form-data with:
  audio (File, .webm), prompt_id (string), attempt_number (int),
  response_latency_sec (int)
EXPECTED: All 4 fields. Missing response_latency_sec = FAIL.
Latency is required for Behavioral Score RL_score calculation.

**8.3** Verify submit-attempt response includes:
  attempt_id, result (pass/partial/fail), accuracy_score, feedback_message,
  adaptive_action (advance/stay/drop/clinician_alert),
  breakdown: { asr: {transcript, wpm, disfluency_count},
               phoneme: {accuracy, per_word: [{word, status, expected_phoneme}]},
               emotion: {label, behavioral_score},
               nlp: {topic_score, who_score, outcome_score} or null }
EXPECTED: Full breakdown in response. Missing per_word phoneme breakdown = PARTIAL.

---

## SECTION 9 — Frontend Verification

**9.1** Open the SessionRunner component (or equivalent).
Verify it reads prompt_type from the prompt queue response.
For warmup prompts: display instruction + content, record audio, submit.
For exercise prompts: same, but additionally show FeedbackPanel with score breakdown.
EXPECTED: prompt_type drives UI behavior. Same UI for both = FAIL.

**9.2** Verify the AudioRecorder component:
  Records start time when mic activates (not when button clicked)
  Records end time when stop triggered
  Computes response_latency_sec = time_from_mic_activation_to_first_speech
  Sends latency_sec with the multipart form submission
EXPECTED: Latency measured from mic activation. Missing or wrong = FAIL.
Latency is used for RL_score in BehavioralScore.

**9.3** Verify FeedbackPanel displays:
  accuracy_score as animated gauge (0-100)
  result badge: PASS (green) / PARTIAL (yellow) / FAIL (red)
  feedback_message text from backend response
  adaptive_action indicator: advance / stay / drop / clinician_alert
  breakdown accordion with ASR, Phoneme, Emotion, NLP tabs
EXPECTED: All 5 elements. Missing adaptive_action indicator = PARTIAL.

**9.4** Verify BaselineRunner component:
  Renders different input UI per response_type:
    picture_naming → shows image from /images/{image_keyword}.png, no word label visible
    sentence_reading → shows full sentence text
    word_repetition → shows word + speaker button triggering speechSynthesis.speak()
    minimal_pairs → shows two words side by side with separator
    syllable_repetition → shows syllable in large monospace + repeat count instruction
  EXPECTED: response_type-specific rendering. Hardcoded "STIMULUS 1/1" = FAIL.

**9.5** Verify picture_naming items do NOT show the word alongside the image.
The word is in display_content but must NOT be rendered when image loads successfully.
It should only appear as a fallback when image fails to load (onError handler).
EXPECTED: Word hidden when image visible. Word visible alongside image = FAIL (ruins task validity).

---

## SECTION 10 — Integration Test

Run this end-to-end scenario manually and verify each step:

**Step 1:** Create patient → run GFTA-3 baseline (section: initial consonants)
  → score "rabbit" item (patient says "wabbit") → score_given should be ~28
  → complete baseline → defect_profile should include ART-001 (Rhotacism)

**Step 2:** Create therapy plan → recommended-tasks for ART-001 should include
  task "Minimal Pairs Contrast" (source_id=1) → approve assignment

**Step 3:** Create session → GET queue → first prompt should be warmup
  (prompt_type=warmup, scoring.active=false) for the easy level

**Step 4:** Submit warmup audio → response should NOT include accuracy_score number
  → patient_task_progress should NOT change

**Step 5:** Submit exercise audio (patient says "ban" for "pan") →
  Layer 1 should detect "pan" missing → Layer 2 should flag /b/ on "pan" onset →
  result = "partial" or "fail" → adaptive_action = "stay" (first fail) →
  feedback_message = retry_message text → consecutive_fails = 1

**Step 6:** Submit exercise audio again (fails again) → consecutive_fails = 2

**Step 7:** Submit exercise audio again (fails again) → consecutive_fails = 3
  → adaptive_action = "drop" → current_level_id unchanged (already easy)
  → clinician_alert = True if at easy level with 3 fails

**Step 8:** GET /clinician/alerts → patient should appear in list

EXPECTED: All 8 steps produce correct outputs.
Any step failing reveals an integration gap between DB, scoring, and API layers.

---

## AUDIT SCORING

After completing all checkpoints, score your implementation:

| Section | Checkpoints | Status |
|---|---|---|
| 1. DB Schema | 1.1–1.5 | |
| 2. Data Migration | 2.1–2.5 | |
| 3. Formula Config | 3.1–3.4 | |
| 4. Warmup Gate | 4.1–4.4 | |
| 5. AI Pipeline | 5.1–5.10 | |
| 6. Score Fusion | 6.1–6.7 | |
| 7. Baseline Scoring | 7.1–7.4 | |
| 8. API Routes | 8.1–8.3 | |
| 9. Frontend | 9.1–9.5 | |
| 10. Integration | Steps 1–8 | |

CRITICAL FAILs (any of these = system cannot produce valid clinical scores):
- 1.2 missing clinician_alert / progress_delta columns
- 3.1 FORMULA_CONFIG missing from analysis_service.py
- 4.1 warmup gate not first check in scoring function
- 5.4 HuBERT aligning against Whisper transcript instead of target_phonemes
- 5.9 EngagementScore using 0.70/0.30 instead of 0.65/0.35
- 6.4 adaptive thresholds hardcoded instead of read from DB
- 6.5 frustration override missing
- 8.1 submit-attempt route missing
- 9.4 BaselineRunner showing hardcoded stimulus placeholder
