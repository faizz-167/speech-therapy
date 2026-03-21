import asyncio
from sqlalchemy import text
from database import engine

async def audit():
    async with engine.connect() as conn:
        print("--- SECTION 1 ---")
        tables = [
            "defect", "baseline_assessment", "baseline_defect_mapping", "baseline_section",
            "baseline_item", "task", "task_level", "prompt", "speech_target", "evaluation_target",
            "prompt_scoring", "adaptive_threshold", "feedback_rule", "task_defect_mapping",
            "therapist", "patient", "patient_baseline_result", "baseline_item_result",
            "therapy_plan", "plan_task_assignment", "session", "session_prompt_attempt",
            "patient_task_progress"
        ]
        
        # 1.1 Tables
        res = await conn.execute(text("""
            SELECT table_name FROM information_schema.tables WHERE table_schema='public'
        """))
        existing_tables = set(row[0] for row in res)
        missing_tables = [t for t in tables if t not in existing_tables]
        print(f"1.1 Missing tables: {missing_tables}")

        # 1.2 column check patient_task_progress
        if "patient_task_progress" in existing_tables:
            res = await conn.execute(text("SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='patient_task_progress'"))
            cols = {row[0]: (row[1], row[2]) for row in res}
            required = ["consecutive_passes", "consecutive_fails", "overall_accuracy", "current_level_id", "clinician_alert", "progress_delta"]
            missing_cols = [c for c in required if c not in cols]
            print(f"1.2 patient_task_progress missing cols: {missing_cols}")
        
        # 1.3 feedback_rule columns
        if "feedback_rule" in existing_tables:
            res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='feedback_rule'"))
            cols = {row[0] for row in res}
            required = ["pass_message", "partial_message", "fail_message", "retry_message"]
            missing_cols = [c for c in required if c not in cols]
            print(f"1.3 feedback_rule missing cols: {missing_cols}")

        # 1.4 session_prompt_attempt columns
        if "session_prompt_attempt" in existing_tables:
            res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='session_prompt_attempt'"))
            cols = {row[0] for row in res}
            required = ["audio_file_ref", "emotion_label", "behavioral_score", "wpm", "disfluency_count", "phoneme_accuracy", "nlp_score"]
            missing_cols = [c for c in required if c not in cols]
            print(f"1.4 session_prompt_attempt missing cols: {missing_cols}")

        # 1.5 prompt enums
        if "prompt" in existing_tables:
            res = await conn.execute(text("SELECT DISTINCT prompt_type FROM prompt"))
            types = {row[0] for row in res}
            print(f"1.5 prompt_type enum values: {types}")
            res = await conn.execute(text("SELECT DISTINCT task_mode FROM prompt"))
            modes = {row[0] for row in res}
            print(f"1.5 task_mode enum values: {modes}")

        print("--- SECTION 2 ---")
        try:
            counts_sql = """
            SELECT
              (SELECT COUNT(*) FROM defect)                  AS defect,
              (SELECT COUNT(*) FROM baseline_assessment)     AS baseline_assess,
              (SELECT COUNT(*) FROM baseline_defect_mapping) AS bdmap,
              (SELECT COUNT(*) FROM baseline_section)        AS b_section,
              (SELECT COUNT(*) FROM baseline_item)           AS b_item,
              (SELECT COUNT(*) FROM task)                    AS task,
              (SELECT COUNT(*) FROM task_level)              AS task_level,
              (SELECT COUNT(*) FROM prompt)                  AS prompt,
              (SELECT COUNT(*) FROM speech_target)           AS speech_target,
              (SELECT COUNT(*) FROM evaluation_target)       AS eval_target,
              (SELECT COUNT(*) FROM prompt_scoring)          AS scoring,
              (SELECT COUNT(*) FROM adaptive_threshold)      AS adaptive,
              (SELECT COUNT(*) FROM feedback_rule)           AS feedback,
              (SELECT COUNT(*) FROM task_defect_mapping)     AS tdmap;
            """
            res = await conn.execute(text(counts_sql))
            counts = dict(res.mappings().fetchone())
            print(f"2.1 Counts: {counts}")
        except Exception as e:
            print(f"2.1 Counts error: {e}")

        try:
            res = await conn.execute(text("SELECT prompt_type, COUNT(*) FROM prompt GROUP BY prompt_type"))
            split = {row[0]: row[1] for row in res}
            print(f"2.2 Warmup/Exercise split: {split}")
        except Exception as e:
            pass

        try:
            res = await conn.execute(text("SELECT COUNT(*) FROM adaptive_threshold at JOIN prompt_scoring ps ON at.scoring_id = ps.scoring_id WHERE ps.active = false"))
            print(f"2.3 Warmup adaptive_threshold count: {res.scalar()}")
        except Exception as e:
            pass

        try:
            res = await conn.execute(text("""
                SELECT
                  COUNT(*) FILTER (WHERE formula_weights IS NULL) AS missing_fw,
                  COUNT(*) FILTER (WHERE wpm_range IS NULL)       AS missing_wpm,
                  COUNT(*) FILTER (WHERE fusion_weights IS NULL)  AS missing_fus,
                  COUNT(*) FILTER (WHERE formula_mode IS NULL)    AS missing_mode
                FROM baseline_item;
            """))
            print(f"2.4 baseline_item nulls: {dict(res.mappings().fetchone())}")
        except Exception as e:
            pass

        try:
            res = await conn.execute(text("SELECT task_mode, COUNT(*) FROM prompt GROUP BY task_mode ORDER BY COUNT(*) DESC"))
            dist = {row[0]: row[1] for row in res}
            print(f"2.5 task_mode dist: {dist}")
        except Exception as e:
            pass

if __name__ == "__main__":
    asyncio.run(audit())
