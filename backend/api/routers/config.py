"""Configuration API endpoint."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List

from backend.api.dependencies import get_container

router = APIRouter(prefix="/config", tags=["Configuration"])


class ConfigResponse(BaseModel):
    app_name: str
    version: str
    upload_max_file_size_mb: float
    upload_supported_extensions: List[str]
    analysis_max_concurrent_jobs: int
    analysis_default_wavelength: float
    reference_cache_ttl_seconds: int


@router.get("", response_model=ConfigResponse)
async def get_config(container=Depends(get_container)):
    """Get current system configuration (public fields only)."""
    cfg = container.config
    return ConfigResponse(
        app_name=cfg.app_name,
        version=cfg.version,
        upload_max_file_size_mb=cfg.upload.max_file_size_bytes / (1024 * 1024),
        upload_supported_extensions=cfg.upload.supported_extensions,
        analysis_max_concurrent_jobs=cfg.analysis.max_concurrent_jobs,
        analysis_default_wavelength=cfg.analysis.default_wavelength,
        reference_cache_ttl_seconds=cfg.reference.cache_ttl_seconds,
    )
