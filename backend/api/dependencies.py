
"""FastAPI dependency injection helpers."""

from fastapi import Request


def get_container(request: Request):
    """Get the DI container from app state."""
    return request.app.state.container


def get_orchestrator(request: Request):
    """Get the analysis orchestrator."""
    return request.app.state.container.analysis_orchestrator


def get_job_manager(request: Request):
    """Get the job manager."""
    return request.app.state.container.job_manager


def get_upload_service(request: Request):
    """Get the upload service."""
    return request.app.state.container.upload_service
