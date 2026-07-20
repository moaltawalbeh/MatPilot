from __future__ import annotations

import os
import ssl
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from backend.infrastructure.database.models import Base

DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/matpilot",
)

# Neon requires SSL — asyncpg uses ssl parameter, not sslmode
_connect_args = {}
if "sslmode=require" in DATABASE_URL or "channel_binding=require" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("&sslmode=require", "").replace("?sslmode=require", "")
    DATABASE_URL = DATABASE_URL.replace("&channel_binding=require", "").replace("?channel_binding=require", "")
    # Clean up any leftover ? or & at the end
    DATABASE_URL = DATABASE_URL.rstrip("?&")
    _ssl_ctx = ssl.create_default_context()
    _ssl_ctx.check_hostname = False
    _ssl_ctx.verify_mode = ssl.CERT_NONE
    _connect_args["ssl"] = _ssl_ctx

engine = create_async_engine(
    DATABASE_URL,
    poolclass=NullPool,
    connect_args=_connect_args,
    echo=False,
)

AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Create all database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Dispose the database engine."""
    await engine.dispose()
