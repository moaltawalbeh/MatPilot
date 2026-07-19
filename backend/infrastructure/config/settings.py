
"""Centralized configuration for MatPilot.

All configurable values are defined here.
Environment-based overrides are supported.
"""

import os
import tempfile
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass(frozen=True)
class UploadConfig:
    """Upload-related configuration."""
    max_file_size_bytes: int = field(
        default_factory=lambda: int(os.environ.get("MATPILOT_MAX_FILE_SIZE", str(50 * 1024 * 1024)))
    )
    supported_extensions: List[str] = field(default_factory=lambda: [
        ".xrdml", ".raw", ".xy", ".csv", ".dat", ".txt", ".cif"
    ])
    temp_folder: str = field(
        default_factory=lambda: os.environ.get(
            "MATPILOT_TEMP_DIR",
            os.path.join(tempfile.gettempdir(), "matpilot"),
        )
    )
    chunk_size_bytes: int = 8192


@dataclass(frozen=True)
class StorageConfig:
    """Storage backend configuration."""
    backend: str = field(default_factory=lambda: os.environ.get("MATPILOT_STORAGE_BACKEND", "local"))
    local_base_path: str = field(default_factory=lambda: os.environ.get("MATPILOT_STORAGE_PATH", "./storage"))
    # Future: S3, Azure, GCS
    s3_bucket: Optional[str] = field(default_factory=lambda: os.environ.get("MATPILOT_S3_BUCKET"))
    s3_region: Optional[str] = field(default_factory=lambda: os.environ.get("MATPILOT_S3_REGION"))
    azure_container: Optional[str] = field(default_factory=lambda: os.environ.get("MATPILOT_AZURE_CONTAINER"))
    gcs_bucket: Optional[str] = field(default_factory=lambda: os.environ.get("MATPILOT_GCS_BUCKET"))


@dataclass(frozen=True)
class ReferenceConfig:
    """Reference engine configuration."""
    enabled_providers: List[str] = field(default_factory=lambda: [
        "COD", "MaterialsProject", "OQMD", "AFLOW", "NOMAD", "MaterialsCloud"
    ])
    cache_ttl_seconds: int = field(
        default_factory=lambda: int(os.environ.get("MATPILOT_CACHE_TTL", "3600"))
    )
    search_timeout_seconds: int = field(
        default_factory=lambda: int(os.environ.get("MATPILOT_SEARCH_TIMEOUT", "30"))
    )
    cif_cache_dir: str = field(
        default_factory=lambda: os.environ.get("MATPILOT_CIF_CACHE_DIR", "data/cif_cache")
    )
    cod_api_url: str = field(
        default_factory=lambda: os.environ.get(
            "MATPILOT_COD_API_URL", "https://www.crystallography.net/cod"
        )
    )
    wavelength: float = field(
        default_factory=lambda: float(os.environ.get("MATPILOT_DEFAULT_WAVELENGTH", "1.5406"))
    )


@dataclass(frozen=True)
class AnalysisConfig:
    """Analysis pipeline configuration."""
    max_concurrent_jobs: int = field(default_factory=lambda: int(os.environ.get("MATPILOT_MAX_JOBS", "4")))
    job_timeout_seconds: int = field(
        default_factory=lambda: int(os.environ.get("MATPILOT_JOB_TIMEOUT", "300"))
    )
    default_wavelength: float = field(
        default_factory=lambda: float(os.environ.get("MATPILOT_DEFAULT_WAVELENGTH", "1.541874"))
    )
    steps: List[str] = field(default_factory=lambda: [
        "validation", "parsing", "reference_search", "peak_detection",
        "phase_identification", "rietveld", "report"
    ])


@dataclass(frozen=True)
class APIConfig:
    """API server configuration."""
    host: str = field(default_factory=lambda: os.environ.get("MATPILOT_API_HOST", "0.0.0.0"))
    port: int = field(default_factory=lambda: int(os.environ.get("MATPILOT_API_PORT", "8000")))
    cors_origins: List[str] = field(default_factory=lambda: _parse_cors_origins())
    request_timeout_seconds: int = 60


def _parse_cors_origins() -> List[str]:
    """Parse CORS origins from MATPILOT_CORS_ORIGINS env var (comma-separated)."""
    raw = os.environ.get("MATPILOT_CORS_ORIGINS", "")
    if raw:
        return [o.strip() for o in raw.split(",") if o.strip()]
    env = os.environ.get("MATPILOT_ENV", "development")
    if env == "development":
        return ["http://localhost:3000", "http://localhost:3001"]
    return ["*"]


@dataclass(frozen=True)
class LoggingConfig:
    """Logging configuration."""
    level: str = field(default_factory=lambda: os.environ.get("MATPILOT_LOG_LEVEL", "INFO"))
    format: str = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    structured: bool = field(
        default_factory=lambda: os.environ.get("MATPILOT_LOG_STRUCTURED", "true").lower() == "true"
    )


@dataclass(frozen=True)
class MatPilotConfig:
    """Root configuration container."""
    app_name: str = "MatPilot"
    version: str = "0.3.0"
    environment: str = field(default_factory=lambda: os.environ.get("MATPILOT_ENV", "development"))
    upload: UploadConfig = field(default_factory=UploadConfig)
    storage: StorageConfig = field(default_factory=StorageConfig)
    reference: ReferenceConfig = field(default_factory=ReferenceConfig)
    analysis: AnalysisConfig = field(default_factory=AnalysisConfig)
    api: APIConfig = field(default_factory=APIConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)


def load_config() -> MatPilotConfig:
    """Load configuration from environment and defaults."""
    return MatPilotConfig()
