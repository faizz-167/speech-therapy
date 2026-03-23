import asyncio
from sqlalchemy import text
from database import engine

async def run():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT COUNT(*) FROM baseline_assessment;"))
        print("baseline_assessment count:", res.scalar())

asyncio.run(run())
