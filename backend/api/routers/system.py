"""System status API endpoints."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Dict, Any

from backend.api.dependencies import get_container

router = APIRouter(prefix="/system", tags=["System"])


class SystemHealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    timestamp: str
    components: Dict[str, Any]


@router.get("/status")
async def system_status(container=Depends(get_container)):
    """Get complete system status."""
    return container.analysis_orchestrator.get_system_status()


@router.get("/health", response_model=SystemHealthResponse)
async def system_health(container=Depends(get_container)):
    """Extended health check with component status."""
    status = container.analysis_orchestrator.get_system_status()
    return SystemHealthResponse(
        status="healthy",
        version=status["version"],
        environment=status["environment"],
        timestamp=status["timestamp"],
        components={
            "storage": status["storage"]["provider"],
            "pipeline": len(status["pipeline"]["enabled_steps"]) > 0,
            "jobs": status["jobs"]["total"],
        },
    )
