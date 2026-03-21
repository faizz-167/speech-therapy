import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    # Disable asyncpg server-side prepared statement cache.
    # Without this, schema migrations (DROP/CREATE TABLE) cause
    # InvalidCachedStatementError on the next request within the same pool.
    connect_args={"server_settings": {"jit": "off"}, "statement_cache_size": 0},
)
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
