from __future__ import annotations

import os
import ssl
from typing import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from backend.infrastructure.database.models import Base

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

connect_args = {}

engine = None
AsyncSessionLocal = None

if DATABASE_URL:
    # Convert postgres:// or postgresql:// to asyncpg
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace(
            "postgres://",
            "postgresql+asyncpg://",
            1,
        )
    elif DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace(
            "postgresql://",
            "postgresql+asyncpg://",
            1,
        )

    # Neon SSL support
    if "sslmode=require" in DATABASE_URL or "channel_binding=require" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("?sslmode=require", "")
        DATABASE_URL = DATABASE_URL.replace("&sslmode=require", "")
        DATABASE_URL = DATABASE_URL.replace("?channel_binding=require", "")
        DATABASE_URL = DATABASE_URL.replace("&channel_binding=require", "")
        DATABASE_URL = DATABASE_URL.rstrip("?&")

        ssl_context = ssl.create_default_context()
        connect_args["ssl"] = ssl_context

    engine = create_async_engine(
        DATABASE_URL,
        connect_args=connect_args,
        poolclass=NullPool,
        echo=False,
    )

    AsyncSessionLocal = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    if AsyncSessionLocal is None:
        raise RuntimeError("DATABASE_URL is not configured")
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
    if engine is None:
        raise RuntimeError("DATABASE_URL is not configured")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _sync_missing_columns()


# Columns added to existing tables over time. ``create_all`` creates missing
# tables but never alters existing ones, so idempotent ``ADD COLUMN IF NOT
# EXISTS`` statements keep pre-existing databases in sync with the models.
# (This is the in-app fallback; fresh installs use the Alembic migrations.)
_MISSING_COLUMNS: dict[str, list[str]] = {
    "users": [
        "is_verified BOOLEAN NOT NULL DEFAULT FALSE",
        "email_verification_token VARCHAR(255) NULL",
        "email_verification_code VARCHAR(10) NULL",
        "email_verification_expires_at TIMESTAMP NULL",
        "password_reset_token VARCHAR(255) NULL",
        "password_reset_expires_at TIMESTAMP NULL",
        "token_version INTEGER NOT NULL DEFAULT 0",
        "role VARCHAR(50) NOT NULL DEFAULT 'RESEARCHER'",
        "status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'",
        "organization_id UUID NULL",
        "default_wavelength FLOAT NULL",
        "preferred_providers JSON NULL",
        "language VARCHAR(10) NULL",
        "timezone VARCHAR(50) NULL",
        "avatar_url VARCHAR(500) NULL",
        "last_login_at TIMESTAMP NULL",
        "login_count INTEGER NULL DEFAULT 0",
    ],
    "projects": [
        "owner_id UUID NULL",
        "status VARCHAR(50) NULL DEFAULT 'Active'",
        "tags JSON NULL",
    ],
}


async def _sync_missing_columns() -> None:
    """Idempotently add model columns that may be absent from existing tables."""
    async with engine.begin() as conn:
        for table, columns in _MISSING_COLUMNS.items():
            for ddl in columns:
                await conn.execute(
                    text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {ddl}")
                )


async def close_db() -> None:
    if engine is not None:
        await engine.dispose()