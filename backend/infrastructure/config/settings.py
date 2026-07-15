
"""Centralized configuration for MatPilot.

All configurable values are defined here.
Environment-based overrides are supported.
"""

import os
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass(frozen=True)
class UploadConfig:
    """Upload-related configuration."""
    max_file_size_bytes: int = 50 * 1024 * 1024  # 50 MB
    supported_extensions: List[str] = field(default_factory=lambda: [
        ".xrdml", ".raw", ".xy", ".csv", ".dat", ".txt", ".cif"
    ])
    temp_folder: str = field(default_factory=lambda: os.environ.get("MATPILOT_TEMP_DIR", "/tmp/matpilot"))
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
    cache_ttl_seconds: int = 3600
    search_timeout_seconds: int = 30


@dataclass(frozen=True)
class AnalysisConfig:
    """Analysis pipeline configuration."""
    max_concurrent_jobs: int = field(default_factory=lambda: int(os.environ.get("MATPILOT_MAX_JOBS", "4")))
    job_timeout_seconds: int = 300
    default_wavelength: float = 1.541874  # Cu Kα average
    steps: List[str] = field(default_factory=lambda: [
        "validation", "parsing", "reference_search", "peak_detection",
        "phase_identification", "rietveld", "report"
    ])


@dataclass(frozen=True)
class APIConfig:
    """API server configuration."""
    host: str = field(default_factory=lambda: os.environ.get("MATPILOT_API_HOST", "0.0.0.0"))
    port: int = field(default_factory=lambda: int(os.environ.get("MATPILOT_API_PORT", "8000")))
    cors_origins: List[str] = field(default_factory=lambda: ["*"])
    request_timeout_seconds: int = 60


@dataclass(frozen=True)
class LoggingConfig:
    """Logging configuration."""
    level: str = field(default_factory=lambda: os.environ.get("MATPILOT_LOG_LEVEL", "INFO"))
    format: str = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    structured: bool = True  # Use JSON structured logging


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
