
"""MatPilot FastAPI Application.

Entry point for the backend API server.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routers import (
    upload, analysis, providers, report, health, jobs, config, system,
    projects, experiments, samples, measurements, structures, collections,
    downloads, notifications, search_configs, activities, dashboard, admin,
    teams, organizations, search, manual_refinement, auth, chat,
)
from backend.api.middleware.error_handler import register_exception_handlers
from backend.api.middleware.activity_recorder import ActivityRecorderMiddleware
from backend.infrastructure.config.settings import load_config
from backend.infrastructure.di.container import DIContainer
from backend.infrastructure.database.connection import init_db, close_db, AsyncSessionLocal
from backend.infrastructure.database.async_uow import AsyncUnitOfWork


async def get_db_uow():
    """FastAPI dependency that provides an async Unit of Work backed by Neon PostgreSQL."""
    async with AsyncSessionLocal() as session:
        uow = AsyncUnitOfWork(session)
        try:
            yield uow
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: init DB on startup, close on shutdown."""
    await init_db()
    yield
    await close_db()


def create_app() -> FastAPI:
    cfg = load_config()

    app = FastAPI(
        title="MatPilot API",
        version=cfg.version,
        description="Cloud platform for Materials Characterization",
        lifespan=lifespan,
    )

    # Register exception handlers (must be before routes)
    register_exception_handlers(app)

    # CORS — read from config (env-backed MATPILOT_CORS_ORIGINS)
    origins = cfg.api.cors_origins
    allow_credentials = origins != ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Activity Recorder — after CORS, before routes
    app.add_middleware(ActivityRecorderMiddleware)

    # Initialize DI Container (in-memory UoW for existing routers)
    container = DIContainer()
    app.state.container = container
    app.state.db_session_factory = AsyncSessionLocal

    # Register routers
    app.include_router(health.router)
    app.include_router(upload.router)
    app.include_router(analysis.router)
    app.include_router(providers.router)
    app.include_router(report.router)
    app.include_router(jobs.router)
    app.include_router(config.router)
    app.include_router(system.router)
    app.include_router(projects.router)
    app.include_router(experiments.router)
    app.include_router(samples.router)
    app.include_router(measurements.router)
    app.include_router(structures.router)
    app.include_router(collections.router)
    app.include_router(downloads.router)
    app.include_router(notifications.router)
    app.include_router(search_configs.router)
    app.include_router(activities.router)
    app.include_router(dashboard.router)
    app.include_router(admin.router)
    app.include_router(teams.router)
    app.include_router(organizations.router)
    app.include_router(search.router)
    app.include_router(auth.router)
    app.include_router(manual_refinement.router)
    app.include_router(chat.router)

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    cfg = load_config()
    uvicorn.run(
        "backend.main:app",
        host=cfg.api.host,
        port=cfg.api.port,
        reload=(cfg.environment == "development"),
    )
