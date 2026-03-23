import asyncio
from sqlalchemy import text
from database import engine

MIGRATIONS = [
    "ALTER TABLE therapist ADD COLUMN IF NOT EXISTS password_hash TEXT;",
    "ALTER TABLE therapist ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'therapist' NOT NULL;",
    "ALTER TABLE therapist ADD COLUMN IF NOT EXISTS years_of_experience INTEGER;",
    "ALTER TABLE patient ADD COLUMN IF NOT EXISTS password_hash TEXT;",
    "ALTER TABLE patient ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'patient' NOT NULL;",
    "ALTER TABLE patient ADD COLUMN IF NOT EXISTS clinical_notes TEXT;",
    "ALTER TABLE plan_task_assignment ADD COLUMN IF NOT EXISTS day_index INTEGER DEFAULT 1 NOT NULL;",
]

async def run():
    for sql in MIGRATIONS:
        try:
            async with engine.begin() as conn:
                await conn.execute(text(sql))
            col = sql.split("ADD COLUMN IF NOT EXISTS ")[1].split(" ")[0]
            tbl = sql.split("ALTER TABLE ")[1].split(" ")[0]
            print(f"  ✔ {tbl}.{col}")
        except Exception as e:
            print(f"  ✘ {sql[:60]}... → {e}")
    print("Done.")

if __name__ == "__main__":
    asyncio.run(run())
