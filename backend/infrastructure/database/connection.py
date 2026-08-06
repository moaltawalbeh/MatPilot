from __future__ import annotations

import os
import ssl
from typing import AsyncGenerator

from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from backend.infrastructure.database.models import Base

# Ensure .env is loaded before reading DATABASE_URL at import time.
load_dotenv()

def _normalize_database_url(url: str) -> tuple[str, dict]:
    """Normalize a Postgres URL for asyncpg and return ``(url, connect_args)``.

    - Converts ``postgres://`` and ``postgresql://`` schemes to asyncpg.
    - Strips Neon's ``sslmode=require`` / ``channel_binding=require`` query
      params and configures a TLS context, so asyncpg does not receive
      unsupported keyword arguments.
    """
    connect_args = {}
    url = (url or "").strip()
    if not url:
        return url, connect_args

    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    if "sslmode=require" in url or "channel_binding=require" in url:
        url = url.replace("?sslmode=require", "")
        url = url.replace("&sslmode=require", "")
        url = url.replace("?channel_binding=require", "")
        url = url.replace("&channel_binding=require", "")
        url = url.rstrip("?&")

        connect_args["ssl"] = ssl.create_default_context()
    return url, connect_args


DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

engine = None
AsyncSessionLocal = None

if DATABASE_URL:
    clean_url, connect_args = _normalize_database_url(DATABASE_URL)

    engine = create_async_engine(
        clean_url,
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
    await _seed_system_user()


_SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000"


async def _seed_system_user() -> None:
    """Ensure the anonymous owner referenced by default project rows exists."""
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                INSERT INTO users (id, username, email, full_name, hashed_password,
                                   is_verified, token_version, role, status,
                                   created_at, updated_at)
                VALUES (:id, 'system', 'system@matpilot.site', 'MatPilot System', '',
                        FALSE, 0, 'SYSTEM', 'ACTIVE', now(), now())
                ON CONFLICT (id) DO NOTHING
                """
            ),
            {"id": _SYSTEM_USER_ID},
        )


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
        await _sync_model_columns(conn)


def _model_column_ddl() -> dict[str, list[tuple[str, str]]]:
    """Map each model table to ``(column_name, ddl)`` pairs using Postgres DDL."""
    dialect = postgresql.dialect()
    result: dict[str, list[tuple[str, str]]] = {}
    for table in Base.metadata.tables.values():
        ddl = []
        for column in table.columns:
            type_sql = column.type.compile(dialect=dialect)
            ddl.append((column.name, f"{column.name} {type_sql} NULL"))
        result[table.name] = ddl
    return result


async def _sync_model_columns(conn) -> None:
    """Add any model columns missing from existing tables (models win)."""
    for table_name, columns in _model_column_ddl().items():
        exists = await conn.scalar(
            text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = :t)"),
            {"t": table_name},
        )
        if not exists:
            continue
        existing_rows = await conn.execute(
            text("SELECT column_name FROM information_schema.columns WHERE table_name = :t"),
            {"t": table_name},
        )
        existing = {row[0] for row in existing_rows}
        for name, ddl in columns:
            if name not in existing:
                await conn.execute(
                    text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {ddl}")
                )


async def close_db() -> None:
    if engine is not None:
        await engine.dispose()