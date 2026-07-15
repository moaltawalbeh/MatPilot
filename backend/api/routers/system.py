
"""System status API endpoints."""

from fastapi import APIRouter
from backend.api.dependencies import get_container
from fastapi import Depends

router = APIRouter(prefix="/system", tags=["System"])


@router.get("/status")
async def system_status(container = Depends(get_container)):
    """Get complete system status."""
    return container.analysis_orchestrator.get_system_status()


@router.get("/health")
async def system_health(container = Depends(get_container)):
    """Extended health check with component status."""
    status = container.analysis_orchestrator.get_system_status()
    return {
        "status": "healthy",
        "version": status["version"],
        "environment": status["environment"],
        "timestamp": status["timestamp"],
        "components": {
            "storage": status["storage"]["provider"],
            "pipeline": len(status["pipeline"]["enabled_steps"]) > 0,
            "jobs": status["jobs"]["total"]
        }
    }
