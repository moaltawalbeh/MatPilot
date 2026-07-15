
"""Centralized exception handling for FastAPI.

Uses FastAPI's @app.exception_handler decorator pattern.
Middleware-based exception handling is unreliable for route exceptions.
"""

from fastapi import Request
from fastapi.responses import JSONResponse

from backend.domain.exceptions.domain_exceptions import (
    MatPilotException,
    InvalidFileException,
    UnsupportedFormatException,
    ParserException,
    StorageException,
    ProviderException,
    AnalysisException,
    EntityNotFoundError
)
from backend.infrastructure.logging.structured_logger import get_logger

logger = get_logger("api.errors")


# Exception to HTTP status code mapping
EXCEPTION_STATUS_MAP = {
    InvalidFileException: 400,
    UnsupportedFormatException: 400,
    ParserException: 422,
    EntityNotFoundError: 404,
    StorageException: 500,
    ProviderException: 503,
    AnalysisException: 500,
}


def register_exception_handlers(app):
    """Register all exception handlers on the FastAPI app."""

    @app.exception_handler(MatPilotException)
    async def matpilot_exception_handler(request: Request, exc: MatPilotException):
        status_code = EXCEPTION_STATUS_MAP.get(type(exc), 500)
        error_type = type(exc).__name__

        logger.error(
            "API exception",
            path=str(request.url.path),
            method=request.method,
            error_type=error_type,
            message=str(exc),
            status_code=status_code
        )

        return JSONResponse(
            status_code=status_code,
            content={
                "error": {
                    "type": error_type,
                    "message": str(exc),
                    "path": str(request.url.path),
                    "method": request.method
                }
            }
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logger.error(
            "Unhandled exception",
            path=str(request.url.path),
            method=request.method,
            error_type=type(exc).__name__,
            message=str(exc)
        )

        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "type": "InternalServerError",
                    "message": "An unexpected error occurred",
                    "path": str(request.url.path),
                    "method": request.method
                }
            }
        )
