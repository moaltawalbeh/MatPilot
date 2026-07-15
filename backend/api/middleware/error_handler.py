"""Centralized exception handling for FastAPI.

Provides unified error response format across all exception types.
"""

from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from backend.domain.exceptions.domain_exceptions import (
    MatPilotException,
    InvalidFileException,
    UnsupportedFormatException,
    ParserException,
    StorageException,
    ProviderException,
    AnalysisException,
    EntityNotFoundError,
)
from backend.infrastructure.logging.structured_logger import get_logger

logger = get_logger("api.errors")


EXCEPTION_STATUS_MAP = {
    InvalidFileException: 400,
    UnsupportedFormatException: 400,
    ParserException: 422,
    EntityNotFoundError: 404,
    StorageException: 500,
    ProviderException: 503,
    AnalysisException: 500,
}


def _error_response(status_code: int, error_type: str, message: str, request: Request) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "type": error_type,
                "message": message,
                "path": str(request.url.path),
                "method": request.method,
            }
        },
    )


def register_exception_handlers(app):
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = []
        for err in exc.errors():
            loc = " -> ".join(str(l) for l in err.get("loc", []))
            errors.append(f"{loc}: {err.get('msg', '')}")
        message = "; ".join(errors)
        logger.warning("Validation error", path=str(request.url.path), detail=message)
        return _error_response(422, "ValidationError", message, request)

    @app.exception_handler(MatPilotException)
    async def matpilot_exception_handler(request: Request, exc: MatPilotException):
        status_code = EXCEPTION_STATUS_MAP.get(type(exc), 500)
        error_type = type(exc).__name__
        logger.error(
            "API exception",
            path=str(request.url.path),
            method=request.method,
            error_type=error_type,
            detail=str(exc),
            status_code=status_code,
        )
        return _error_response(status_code, error_type, str(exc), request)

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logger.error(
            "Unhandled exception",
            path=str(request.url.path),
            method=request.method,
            error_type=type(exc).__name__,
            detail=str(exc),
        )
        return _error_response(500, "InternalServerError", "An unexpected error occurred", request)
