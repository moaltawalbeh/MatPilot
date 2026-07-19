"""Health check API endpoint."""

from fastapi import APIRouter

from backend.infrastructure.config.settings import load_config

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    cfg = load_config()
    return {
        "status": "healthy",
        "version": cfg.version,
    }
