
"""Structured logging for MatPilot.

Every request, upload, job, pipeline step, and provider call is logged.
"""

import json
import logging
import sys
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from backend.infrastructure.config.settings import LoggingConfig


class StructuredLogRecord(logging.LogRecord):
    """Extended log record with structured fields."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.extra_fields: Dict[str, Any] = {}


class StructuredFormatter(logging.Formatter):
    """JSON structured log formatter."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add extra fields if present
        if hasattr(record, "extra_fields"):
            log_entry.update(record.extra_fields)

        # Add exception info
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, default=str)


class MatPilotLogger:
    """
    Structured logger for MatPilot.

    Usage:
        logger = MatPilotLogger("upload_service")
        logger.info("File uploaded", file_id="abc", format="XY")
    """

    def __init__(self, name: str, config: Optional[LoggingConfig] = None):
        self._logger = logging.getLogger(name)
        self._config = config or LoggingConfig()
        self._setup_handler()

    def _setup_handler(self):
        """Configure handler if not already set."""
        if not self._logger.handlers:
            handler = logging.StreamHandler(sys.stdout)
            if self._config.structured:
                handler.setFormatter(StructuredFormatter())
            else:
                handler.setFormatter(logging.Formatter(self._config.format))
            self._logger.addHandler(handler)
            self._logger.setLevel(getattr(logging, self._config.level.upper(), logging.INFO))

    def _log(self, level: int, message: str, **kwargs):
        """Internal log method with extra fields."""
        extra = {"extra_fields": kwargs}
        self._logger.log(level, message, extra=extra)

    def debug(self, message: str, **kwargs):
        self._log(logging.DEBUG, message, **kwargs)

    def info(self, message: str, **kwargs):
        self._log(logging.INFO, message, **kwargs)

    def warning(self, message: str, **kwargs):
        self._log(logging.WARNING, message, **kwargs)

    def error(self, message: str, **kwargs):
        self._log(logging.ERROR, message, **kwargs)

    def critical(self, message: str, **kwargs):
        self._log(logging.CRITICAL, message, **kwargs)

    # Convenience methods for platform events
    def log_request(self, method: str, path: str, status: int, duration_ms: float, **kwargs):
        self.info("API request", method=method, path=path, status=status, duration_ms=duration_ms, **kwargs)

    def log_upload(self, file_id: str, filename: str, format: str, size_bytes: int, **kwargs):
        self.info("File uploaded", file_id=file_id, filename=filename, format=format, size_bytes=size_bytes, **kwargs)

    def log_job(self, job_id: str, status: str, step: str, progress: float, **kwargs):
        self.info("Job update", job_id=job_id, status=status, step=step, progress=progress, **kwargs)

    def log_pipeline(self, job_id: str, step_name: str, step_status: str, **kwargs):
        self.info("Pipeline step", job_id=job_id, step=step_name, step_status=step_status, **kwargs)

    def log_provider(self, provider: str, operation: str, duration_ms: float, **kwargs):
        self.info("Provider call", provider=provider, operation=operation, duration_ms=duration_ms, **kwargs)


def get_logger(name: str) -> MatPilotLogger:
    """Factory for getting a configured logger."""
    return MatPilotLogger(name)
