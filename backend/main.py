
"""MatPilot FastAPI Application.

Entry point for the backend API server.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routers import upload, analysis, providers, report, health, jobs, config, system, projects, experiments
from backend.api.middleware.error_handler import register_exception_handlers
from backend.infrastructure.config.settings import load_config
from backend.infrastructure.di.container import DIContainer


def create_app() -> FastAPI:
    cfg = load_config()

    app = FastAPI(
        title="MatPilot API",
        version=cfg.version,
        description="Cloud platform for Materials Characterization",
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

    # Initialize DI Container
    container = DIContainer()
    app.state.container = container

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
