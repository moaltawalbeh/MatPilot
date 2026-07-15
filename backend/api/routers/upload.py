"""Upload API endpoints.

All uploads must happen inside a Project.
When a file is uploaded, an Experiment is automatically created.
"""

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
    experiment_id: Optional[str] = None
    job_id: Optional[str] = None
    analysis_started: bool = False


class UploadListItem(BaseModel):
    file_id: str
    filename: str
    detected_format: str
    is_valid: bool
    uploaded_at: str
    experiment_id: Optional[str] = None


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
    experiment_id: Optional[str] = Form(None),
    container=Depends(get_container),
):
    """Upload an experimental data file.

    Accepts: .xrdml, .raw, .xy, .csv, .dat, .txt, .cif
    Requires project_id. Creates an Experiment automatically if experiment_id not provided.
    """
    if not project_id:
        raise InvalidFileException("project_id is required. Uploads must happen inside a Project.")

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
    orchestrator = container.analysis_orchestrator
    result = await orchestrator.process_upload_and_analyze(
        filename=file.filename,
        content_type=file.content_type or "application/octet-stream",
        file_data=content,
        user_metadata=user_metadata,
        project_id=project_id,
    )

    if not result["success"]:
        raise InvalidFileException(
            f"File validation failed: {'; '.join(result.get('errors', ['Unknown error']))}"
        )

    created_experiment_id = None
    job_id = result.get("job_id")
    try:
        from backend.domain.entities.experiment import Experiment, ExperimentMetadata
        from uuid import UUID

        data_points = result.get("data_points", 0)
        is_cif = file.filename and file.filename.lower().endswith(".cif")

        experiment = Experiment(
            project_id=UUID(project_id),
            name=file.filename or "Untitled Experiment",
            material="",
            status="Analyzing" if result.get("analysis_started") else "Uploaded",
            file_ids=[result["file_id"]],
            primary_file_id=result["file_id"],
            has_pattern_data=not is_cif and data_points > 0,
            has_crystal_structure=is_cif,
            data_points=data_points,
            two_theta_range=result.get("metadata", {}).get("two_theta_range"),
            wavelength_angstrom=result.get("metadata", {}).get("wavelength_angstrom"),
            metadata=ExperimentMetadata(
                wavelength_angstrom=result.get("metadata", {}).get("wavelength_angstrom"),
            ),
        )

        if experiment_id:
            experiment.id = UUID(experiment_id)
            experiment.project_id = UUID(project_id)

        await container.uow.experiments.add(experiment)
        created_experiment_id = str(experiment.id)

        if job_id:
            experiment.job_ids.append(UUID(job_id))
            await container.project_use_case.add_job_to_project(project_id, job_id)

        await container.project_use_case.add_file_to_project(project_id, result["file_id"])
    except Exception:
        pass

    upload_metadata = result.get("metadata", {})
    two_theta_range = upload_metadata.get("two_theta_range")
    if two_theta_range and (two_theta_range[0] is None or two_theta_range[1] is None):
        two_theta_range = None

    return UploadResponse(
        file_id=result["file_id"],
        filename=upload_metadata.get("original_filename", file.filename),
        detected_format=result.get("detected_format", "unknown"),
        is_valid=True,
        file_size_bytes=len(content),
        data_points=result.get("data_points", 0),
        two_theta_range=two_theta_range,
        has_wavelength=result.get("has_wavelength", False),
        wavelength_angstrom=upload_metadata.get("wavelength_angstrom"),
        metadata=upload_metadata,
        validation_errors=[],
        validation_warnings=[],
        message=f"File uploaded and analysis started: {result.get('detected_format', 'unknown')}",
        experiment_id=created_experiment_id,
        job_id=result.get("job_id"),
        analysis_started=result.get("analysis_started", False),
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
