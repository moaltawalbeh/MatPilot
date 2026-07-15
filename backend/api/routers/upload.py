
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

from backend.services.upload_service import UploadService, UploadResult
from backend.api.dependencies import get_container
from fastapi import Depends

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


@router.post("", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    wavelength: Optional[float] = Form(None),
    radiation: Optional[str] = Form(None),
    container = Depends(get_container)
):
    """
    Upload an experimental data file.

    Accepts: .xrdml, .raw, .xy, .csv, .dat, .txt, .cif

    Returns file metadata, detected format, validation result,
    and an XRDExperiment internal model.
    """
    content = await file.read()

    # Build user metadata from form fields
    user_metadata = {}
    if wavelength is not None:
        user_metadata["wavelength"] = wavelength
    if radiation is not None:
        user_metadata["radiation"] = radiation

    # Use the UploadService
    upload_service = container.upload_service
    result = await upload_service.upload_file(
        filename=file.filename,
        content_type=file.content_type or "application/octet-stream",
        file_data=content,
        user_metadata=user_metadata
    )

    if not result.is_valid:
        raise HTTPException(
            status_code=400,
            detail={
                "file_id": result.file_id,
                "filename": result.filename,
                "detected_format": result.detected_format,
                "is_valid": False,
                "errors": result.validation.errors,
                "warnings": result.validation.warnings
            }
        )

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
        message=f"File uploaded and parsed as {result.detected_format}"
    )


@router.get("/{file_id}")
async def get_upload(file_id: str, container = Depends(get_container)):
    """Retrieve a previously uploaded file by its file_id."""
    upload_service = container.upload_service
    result = upload_service.get_upload(file_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Upload not found")
    return {
        "file_id": result.file_id,
        "filename": result.filename,
        "detected_format": result.detected_format,
        "is_valid": result.is_valid,
        "metadata": result.metadata,
        "uploaded_at": result.uploaded_at
    }


@router.get("")
async def list_uploads(container = Depends(get_container)):
    """List all uploads in the current session."""
    upload_service = container.upload_service
    results = upload_service.list_uploads()
    return [
        {
            "file_id": r.file_id,
            "filename": r.filename,
            "detected_format": r.detected_format,
            "is_valid": r.is_valid,
            "uploaded_at": r.uploaded_at
        }
        for r in results
    ]
