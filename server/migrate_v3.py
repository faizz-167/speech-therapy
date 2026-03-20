"""
Migration script for v3 AI Workflow scoring columns.
Adds new columns to: daily_tasks, task_logs, baseline_results.

Usage:
  python migrate_v3.py

Connects to the DATABASE_URL from .env and runs ALTER TABLE statements.
Safe to run multiple times — uses IF NOT EXISTS column check.
"""

import asyncio
import os
import sys

# Add server directory to path
sys.path.insert(0, os.path.dirname(__file__))

from database import engine


MIGRATIONS = [
    # --- daily_tasks ---
    "ALTER TABLE daily_tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR DEFAULT '';",
    "ALTER TABLE daily_tasks ADD COLUMN IF NOT EXISTS prompts JSONB DEFAULT '[]'::jsonb;",

    # --- baseline_results ---
    "ALTER TABLE baseline_results ADD COLUMN IF NOT EXISTS final_score FLOAT DEFAULT 0;",
    "ALTER TABLE baseline_results ADD COLUMN IF NOT EXISTS confidence_score FLOAT DEFAULT 0;",

    # --- task_logs: v3 / ai_workflow columns ---
    "ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS task_mode VARCHAR DEFAULT '';",
    "ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS prompt_id INTEGER;",
    "ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS prompt_type VARCHAR DEFAULT 'exercise';",
    "ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS adaptive_decision VARCHAR DEFAULT '';",
    "ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS target_phoneme_results JSONB DEFAULT '{}'::jsonb;",
    "ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS content_score FLOAT DEFAULT 0;",
    "ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS disfluency_data JSONB DEFAULT '{}'::jsonb;",
    "ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS feedback_text TEXT DEFAULT '';",
    "ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS low_confidence_flag BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS review_recommended BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS progress_delta FLOAT DEFAULT 0;",
    "ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS consecutive_pass_count INTEGER DEFAULT 0;",
    "ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS consecutive_fail_count INTEGER DEFAULT 0;",
    "ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS frustration_flag BOOLEAN DEFAULT FALSE;",
]


async def run_migration():
    from sqlalchemy import text

    async with engine.begin() as conn:
        print("Running v3 AI Workflow migration...")
        print(f"Database: {str(engine.url).split('@')[-1]}\n")

        success = 0
        for sql in MIGRATIONS:
            try:
                await conn.execute(text(sql))
                col_name = sql.split("ADD COLUMN IF NOT EXISTS ")[1].split(" ")[0]
                table_name = sql.split("ALTER TABLE ")[1].split(" ")[0]
                print(f"  ✅  {table_name}.{col_name}")
                success += 1
            except Exception as e:
                print(f"  ❌  {sql[:60]}... → {e}")

        print(f"\n{'='*50}")
        print(f"Done: {success}/{len(MIGRATIONS)} columns applied.")


if __name__ == "__main__":
    asyncio.run(run_migration())
