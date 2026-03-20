"""One-shot script to clear users, therapists, patients, and all dependent data."""
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

url = os.getenv("DATABASE_URL")
# Convert asyncpg URL to psycopg2 format and fix SSL
sync_url = url.replace("postgresql+asyncpg://", "postgresql://").replace("?ssl=require", "?sslmode=require")

conn = psycopg2.connect(sync_url)
conn.autocommit = True
cur = conn.cursor()

tables_to_clear = [
    "audio_records",
    "task_logs",
    "daily_tasks",
    "therapy_plans",
    "therapy_notes",
    "session_prompt_attempts",
    "patient_task_progress",
    "sessions",
    "patient_baseline_results",
    "baseline_results",
    "patients",
    "therapists",
    "users",
]

for table in tables_to_clear:
    try:
        cur.execute(f"DELETE FROM {table};")
        print(f"  Cleared {table}")
    except Exception as e:
        print(f"  Skipped {table}: {e}")
        conn.rollback()
        conn.autocommit = True

cur.close()
conn.close()
print("\nDone! Database cleared for a fresh start.")
