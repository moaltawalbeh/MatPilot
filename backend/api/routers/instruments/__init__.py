"""Instrument workspace API endpoints package."""

from backend.api.routers.instruments import xrd, ftir, raman, uvvis

# Re-export instruments router for /projects/{project_id}/instruments
from .workspace import router

__all__ = ["router", "xrd", "ftir", "raman", "uvvis"]
