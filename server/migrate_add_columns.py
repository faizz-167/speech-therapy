"""
Migration script to add missing columns to baseline_results and task_logs tables.
Run once to sync DB schema with SQLAlchemy models.
"""
import asyncio
from sqlalchemy import text
from database import engine

MIGRATIONS = [
    # baseline_results - new scoring columns
    "ALTER TABLE baseline_results ADD COLUMN IF NOT EXISTS phoneme_accuracy FLOAT DEFAULT 0",
    "ALTER TABLE baseline_results ADD COLUMN IF NOT EXISTS speech_rate FLOAT DEFAULT 0",
    "ALTER TABLE baseline_results ADD COLUMN IF NOT EXISTS engagement_score FLOAT DEFAULT 0",
    "ALTER TABLE baseline_results ADD COLUMN IF NOT EXISTS speech_score FLOAT DEFAULT 0",

    # task_logs - new multimodal scoring columns
    "ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS word_accuracy FLOAT DEFAULT 0",
    "ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS phoneme_accuracy FLOAT DEFAULT 0",
    "ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS speech_rate_score FLOAT DEFAULT 0",
    "ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS confidence_score FLOAT DEFAULT 0",
    "ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS engagement_score FLOAT DEFAULT 0",
    "ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS articulation_score FLOAT DEFAULT 0",
    "ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS speech_score FLOAT DEFAULT 0",
    "ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS final_score FLOAT DEFAULT 0",
    "ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS performance_level VARCHAR DEFAULT ''",
]

async def run_migrations():
    async with engine.begin() as conn:
        for sql in MIGRATIONS:
            try:
                await conn.execute(text(sql))
                col = sql.split("ADD COLUMN IF NOT EXISTS ")[1].split(" ")[0]
                tbl = sql.split("ALTER TABLE ")[1].split(" ")[0]
                print(f"  ✓ {tbl}.{col}")
            except Exception as e:
                print(f"  ⚠ Skipped: {e}")
    print("\nMigration complete!")

if __name__ == "__main__":
    asyncio.run(run_migrations())
