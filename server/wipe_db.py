import asyncio
from sqlalchemy import text
from database import engine

async def run():
    async with engine.begin() as conn:
        try:
            # We use CASCADE to ensure child tables are also truncated
            # and to bypass foreign key constraint errors during truncation.
            await conn.execute(text("TRUNCATE TABLE therapist, patient, therapy_plan, plan_task_assignment, session, patient_task_progress, session_emotion_summary, session_prompt_attempt CASCADE;"))
            print("Successfully wiped all therapist, patient, and session data!")
        except Exception as e:
            print("Error wiping data:", e)

if __name__ == "__main__":
    asyncio.run(run())
