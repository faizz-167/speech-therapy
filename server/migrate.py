import json, os, psycopg2
from psycopg2.extras import execute_values, Json
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL").replace("+asyncpg", "").replace("ssl=require", "sslmode=require")

DATA_DIR = os.getenv("DATA_DIR", "./data")

def load(filename):
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return []
    with open(path, encoding='utf-8') as f:
        return json.load(f).get("data", [])

def migrate(conn):
    cur = conn.cursor()

    # 1. defect
    rows = load("defect.json")
    if rows:
        execute_values(cur,
            """
            INSERT INTO defect (defect_id, code, name, category, description)
            VALUES %s
            ON CONFLICT (defect_id) DO NOTHING
            """,
            [(r["defect_id"], r["code"], r["name"], r["category"], r.get("description")) for r in rows]
        )
        print(f"  defect: {len(rows)} rows processed.")

    # 2. baseline_assessment
    rows = load("baseline_assessment.json")
    if rows:
        execute_values(cur,
            """
            INSERT INTO baseline_assessment (baseline_id, code, name, domain, description, administration_method, created_at)
            VALUES %s
            ON CONFLICT (baseline_id) DO NOTHING
            """,
            [(r["baseline_id"], r["code"], r["name"], r["domain"], r.get("description"), r["administration_method"], r.get("created_at")) for r in rows]
        )
        print(f"  baseline_assessment: {len(rows)} rows processed.")

    # 3. baseline_defect_mapping
    rows = load("baseline_defect_mapping.json")
    if rows:
        execute_values(cur,
            """
            INSERT INTO baseline_defect_mapping (mapping_id, baseline_id, defect_id, relevance_level, clinical_notes)
            VALUES %s
            ON CONFLICT (mapping_id) DO NOTHING
            """,
            [(r["mapping_id"], r["baseline_id"], r["defect_id"], r.get("relevance_level"), r.get("clinical_notes")) for r in rows]
        )
        print(f"  baseline_defect_mapping: {len(rows)} rows processed.")

    # 4. baseline_section
    rows = load("baseline_section.json")
    if rows:
        execute_values(cur,
            """
            INSERT INTO baseline_section (section_id, baseline_id, section_name, instructions, target_defect_id, order_index)
            VALUES %s
            ON CONFLICT (section_id) DO NOTHING
            """,
            [(r["section_id"], r["baseline_id"], r["section_name"], r.get("instructions"), r.get("target_defect_id"), r["order_index"]) for r in rows]
        )
        print(f"  baseline_section: {len(rows)} rows processed.")

    # 5. baseline_item (v2.1 — 19 columns, skip legacy fields)
    rows = load("baseline_item_v2.1.json")
    if rows:
        values = []
        for r in rows:
            ref = r.get("reference_text")
            dpf = r.get("defect_phoneme_focus")
            values.append((
                r["item_id"],
                r["section_id"],
                r["order_index"],
                r["task_name"],
                r["instruction"],
                r["display_content"],
                r["response_type"],
                r["expected_output"],
                r.get("target_phoneme"),
                r.get("image_keyword"),
                r["scoring_method"],
                r["max_score"],
                r["scope"],
                r["formula_mode"],
                Json(ref) if ref is not None else None,
                Json(r["wpm_range"]),
                Json(r["formula_weights"]),
                Json(r["fusion_weights"]),
                Json(r["defect_codes"]),
                Json(dpf) if dpf is not None else None,
            ))
        execute_values(cur,
            """
            INSERT INTO baseline_item (
                item_id, section_id, order_index, task_name, instruction,
                display_content, response_type, expected_output, target_phoneme,
                image_keyword, scoring_method, max_score, scope, formula_mode,
                reference_text, wpm_range, formula_weights, fusion_weights,
                defect_codes, defect_phoneme_focus
            ) VALUES %s
            ON CONFLICT (item_id) DO NOTHING
            """,
            values
        )
        print(f"  baseline_item: {len(rows)} rows processed.")

    # 6. task
    rows = load("task.json")
    if rows:
        execute_values(cur,
            """
            INSERT INTO task (task_id, source_id, name, type, description, created_at)
            VALUES %s
            ON CONFLICT (task_id) DO NOTHING
            """,
            [(r["task_id"], r["source_id"], r["name"], r["type"], r.get("description"), r.get("created_at")) for r in rows]
        )
        print(f"  task: {len(rows)} rows processed.")

    # 7. task_level
    rows = load("task_level.json")
    if rows:
        execute_values(cur,
            """
            INSERT INTO task_level (level_id, task_id, source_level_id, level_name, difficulty_score)
            VALUES %s
            ON CONFLICT (level_id) DO NOTHING
            """,
            [(r["level_id"], r["task_id"], r.get("source_level_id"), r["level_name"], r["difficulty_score"]) for r in rows]
        )
        print(f"  task_level: {len(rows)} rows processed.")

    # 8. prompt
    rows = load("prompt.json")
    if rows:
        execute_values(cur,
            """
            INSERT INTO prompt (prompt_id, level_id, source_prompt_id, prompt_type, scenario_context, instruction, display_content, target_response, evaluation_criteria, accuracy_check, task_mode)
            VALUES %s
            ON CONFLICT (prompt_id) DO NOTHING
            """,
            [(r["prompt_id"], r["level_id"], r["source_prompt_id"], r["prompt_type"], r.get("scenario_context"), r.get("instruction"), r.get("display_content"), r.get("target_response"), r.get("evaluation_criteria"), r.get("accuracy_check"), r.get("task_mode")) for r in rows]
        )
        print(f"  prompt: {len(rows)} rows processed.")

    # 9. speech_target
    rows = load("speech_target.json")
    if rows:
        execute_values(cur,
            """
            INSERT INTO speech_target (speech_target_id, prompt_id, raw_speech_target)
            VALUES %s
            ON CONFLICT (speech_target_id) DO NOTHING
            """,
            [(r["speech_target_id"], r["prompt_id"], Json(r["raw_speech_target"])) for r in rows]
        )
        print(f"  speech_target: {len(rows)} rows processed.")

    # 10. evaluation_target
    rows = load("evaluation_target.json")
    if rows:
        execute_values(cur,
            """
            INSERT INTO evaluation_target (eval_target_id, prompt_id, scope, target_phonemes, check_on_words, substitution_errors, pass_rule, fail_rule, partial_pass)
            VALUES %s
            ON CONFLICT (eval_target_id) DO NOTHING
            """,
            [(r["eval_target_id"], r["prompt_id"], r.get("scope"), Json(r["target_phonemes"]) if r.get("target_phonemes") is not None else None, Json(r["check_on_words"]) if r.get("check_on_words") is not None else None, Json(r["substitution_errors"]) if r.get("substitution_errors") is not None else None, r.get("pass_rule"), r.get("fail_rule"), r.get("partial_pass")) for r in rows]
        )
        print(f"  evaluation_target: {len(rows)} rows processed.")

    # 11. prompt_scoring
    rows = load("prompt_scoring.json")
    if rows:
        execute_values(cur,
            """
            INSERT INTO prompt_scoring (scoring_id, prompt_id, active, note, response_latency_max_sec, minimum_speech_detected, task_completion_min_percent, layer1_what, layer1_method, layer1_pass, layer2_what, layer2_method, layer2_target_pairs, layer2_pass_threshold, layer2_fail_condition)
            VALUES %s
            ON CONFLICT (scoring_id) DO NOTHING
            """,
            [(r["scoring_id"], r["prompt_id"], r.get("active", False), r.get("note"), r.get("response_latency_max_sec"), r.get("minimum_speech_detected"), r.get("task_completion_min_percent"), r.get("layer1_what"), r.get("layer1_method"), r.get("layer1_pass"), r.get("layer2_what"), r.get("layer2_method"), Json(r["layer2_target_pairs"]) if r.get("layer2_target_pairs") is not None else None, r.get("layer2_pass_threshold"), r.get("layer2_fail_condition")) for r in rows]
        )
        print(f"  prompt_scoring: {len(rows)} rows processed.")

    # 12. adaptive_threshold
    rows = load("adaptive_threshold.json")
    if rows:
        execute_values(cur,
            """
            INSERT INTO adaptive_threshold (threshold_id, scoring_id, advance_to_next_level, stay_at_current_level, drop_to_easier_level, consecutive_to_advance, consecutive_to_drop)
            VALUES %s
            ON CONFLICT (threshold_id) DO NOTHING
            """,
            [(r["threshold_id"], r["scoring_id"], r["advance_to_next_level"], r["stay_at_current_level"], r["drop_to_easier_level"], r["consecutive_to_advance"], r["consecutive_to_drop"]) for r in rows]
        )
        print(f"  adaptive_threshold: {len(rows)} rows processed.")

    # 13. feedback_rule
    rows = load("feedback_rule.json")
    if rows:
        execute_values(cur,
            """
            INSERT INTO feedback_rule (feedback_id, prompt_id, pass_message, partial_message, fail_message)
            VALUES %s
            ON CONFLICT (feedback_id) DO NOTHING
            """,
            [(r["feedback_id"], r["prompt_id"], r.get("pass_message"), r.get("partial_message"), r.get("fail_message")) for r in rows]
        )
        print(f"  feedback_rule: {len(rows)} rows processed.")

    # 14. task_defect_mapping
    rows = load("task_defect_mapping.json")
    if rows:
        execute_values(cur,
            """
            INSERT INTO task_defect_mapping (mapping_id, task_id, defect_id, relevance_level, clinical_notes)
            VALUES %s
            ON CONFLICT (mapping_id) DO NOTHING
            """,
            [(r["mapping_id"], r["task_id"], r["defect_id"], r.get("relevance_level"), r.get("clinical_notes")) for r in rows]
        )
        print(f"  task_defect_mapping: {len(rows)} rows processed.")

    print("\nNote: Tables 15-22 (therapist to patient_task_progress) are runtime tables and are created empty.\n")

    print("Verifying inserted row counts:")
    tables = [
        "defect", "baseline_assessment", "baseline_defect_mapping",
        "baseline_section", "baseline_item", "task", "task_level",
        "prompt", "speech_target", "evaluation_target", "prompt_scoring",
        "adaptive_threshold", "feedback_rule", "task_defect_mapping"
    ]
    for t in tables:
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        count = cur.fetchone()[0]
        print(f"  {t:35s}: {count:>5} rows")

    cur.close()

if __name__ == "__main__":
    conn = psycopg2.connect(db_url)
    try:
        with conn:          # context manager: commits on success, rolls back on exception
            conn.set_client_encoding('UTF8')
            migrate(conn)
        print("Migration complete.")
    except Exception as e:
        print(f"Migration failed — rolled back. Error: {e}")
        raise
    finally:
        conn.close()
