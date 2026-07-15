"""Upload API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends
from pydantic import BaseModel

from backend.api.dependencies import get_container
from backend.domain.exceptions.domain_exceptions import InvalidFileException

router = APIRouter(prefix="/upload", tags=["Upload"])


class UploadResponse(BaseModel):
    file_id: str
    filename: str
    detected_format: str
    is_valid: bool
    file_size_bytes: int
    data_points: int
    two_theta_range: Optional[List[float]]
    has_wavelength: bool
    wavelength_angstrom: Optional[float]
    metadata: dict
    validation_errors: List[str]
    validation_warnings: List[str]
    message: str


class UploadListItem(BaseModel):
    file_id: str
    filename: str
    detected_format: str
    is_valid: bool
    uploaded_at: str


@router.get("", response_model=List[UploadListItem])
async def list_uploads(container=Depends(get_container)):
    """List all uploads."""
    results = container.upload_service.list_uploads()
    return [
        UploadListItem(
            file_id=r.file_id,
            filename=r.filename,
            detected_format=r.detected_format,
            is_valid=r.is_valid,
            uploaded_at=str(r.uploaded_at),
        )
        for r in results
    ]


@router.post("", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    wavelength: Optional[float] = Form(None),
    radiation: Optional[str] = Form(None),
    project_id: Optional[str] = Form(None),
    container=Depends(get_container),
):
    """Upload an experimental data file.

    Accepts: .xrdml, .raw, .xy, .csv, .dat, .txt, .cif
    """
    content = await file.read()

    if len(content) > container.config.upload.max_file_size_bytes:
        raise InvalidFileException(
            f"File exceeds maximum size of {container.config.upload.max_file_size_bytes // (1024 * 1024)} MB"
        )

    user_metadata = {}
    if wavelength is not None:
        user_metadata["wavelength"] = wavelength
    if radiation is not None:
        user_metadata["radiation"] = radiation

    upload_service = container.upload_service
    result = await upload_service.upload_file(
        filename=file.filename,
        content_type=file.content_type or "application/octet-stream",
        file_data=content,
        user_metadata=user_metadata,
    )

    if not result.is_valid:
        raise InvalidFileException(
            f"File validation failed: {'; '.join(result.validation.errors)}"
        )

    if project_id:
        try:
            await container.project_use_case.add_file_to_project(project_id, result.file_id)
        except Exception:
            pass

    exp = result.experiment
    two_theta_range = None
    if exp and exp.two_theta:
        two_theta_range = [min(exp.two_theta), max(exp.two_theta)]

    return UploadResponse(
        file_id=result.file_id,
        filename=result.filename,
        detected_format=result.detected_format,
        is_valid=result.is_valid,
        file_size_bytes=result.validation.file_size_bytes,
        data_points=exp.data_points if exp else 0,
        two_theta_range=two_theta_range,
        has_wavelength=exp.wavelength is not None if exp else False,
        wavelength_angstrom=exp.wavelength.value_angstrom if exp and exp.wavelength else None,
        metadata=result.metadata,
        validation_errors=result.validation.errors,
        validation_warnings=result.validation.warnings,
        message=f"File uploaded and parsed as {result.detected_format}",
    )


@router.get("/{file_id}")
async def get_upload(file_id: str, container=Depends(get_container)):
    """Retrieve a previously uploaded file by its file_id."""
    result = container.upload_service.get_upload(file_id)
    if result is None:
        from backend.domain.exceptions.domain_exceptions import EntityNotFoundError
        raise EntityNotFoundError(f"Upload {file_id} not found")
    return {
        "file_id": result.file_id,
        "filename": result.filename,
        "detected_format": result.detected_format,
        "is_valid": result.is_valid,
        "metadata": result.metadata,
        "uploaded_at": str(result.uploaded_at),
    }
