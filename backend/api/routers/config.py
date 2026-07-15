
"""Configuration API endpoints."""

from fastapi import APIRouter
from backend.api.dependencies import get_container
from fastapi import Depends

router = APIRouter(prefix="/config", tags=["Configuration"])


@router.get("")
async def get_config(container = Depends(get_container)):
    """Get current system configuration."""
    cfg = container.config
    return {
        "app_name": cfg.app_name,
        "version": cfg.version,
        "environment": cfg.environment,
        "upload": {
            "max_file_size_mb": cfg.upload.max_file_size_bytes / (1024 * 1024),
            "supported_extensions": cfg.upload.supported_extensions,
            "temp_folder": cfg.upload.temp_folder
        },
        "storage": {
            "backend": cfg.storage.backend,
            "local_base_path": cfg.storage.local_base_path
        },
        "analysis": {
            "max_concurrent_jobs": cfg.analysis.max_concurrent_jobs,
            "job_timeout_seconds": cfg.analysis.job_timeout_seconds,
            "default_wavelength": cfg.analysis.default_wavelength,
            "steps": cfg.analysis.steps
        },
        "reference": {
            "enabled_providers": cfg.reference.enabled_providers,
            "cache_ttl_seconds": cfg.reference.cache_ttl_seconds
        },
        "api": {
            "host": cfg.api.host,
            "port": cfg.api.port,
            "cors_origins": cfg.api.cors_origins
        },
        "logging": {
            "level": cfg.logging.level,
            "structured": cfg.logging.structured
        }
    }
