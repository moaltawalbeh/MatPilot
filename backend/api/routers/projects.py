"""Project API endpoints."""

from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from backend.api.dependencies import get_container
from backend.domain.exceptions.domain_exceptions import EntityNotFoundError

router = APIRouter(prefix="/projects", tags=["Projects"])


class ProjectCreateRequest(BaseModel):
    name: str
    description: str = ""
    material: str = ""
    tags: Optional[List[str]] = None


class ProjectUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    material: Optional[str] = None
    status: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    material: str
    owner_id: str
    file_ids: List[str]
    job_ids: List[str]
    experiment_ids: List[str]
    status: str
    tags: List[str]
    created_at: str
    updated_at: str
    files: int
    analyses: int
    experiments: int


class ExperimentResponse(BaseModel):
    id: str
    project_id: str
    name: str
    description: str
    material: str
    status: str
    file_ids: List[str]
    primary_file_id: Optional[str]
    has_pattern_data: bool
    has_crystal_structure: bool
    data_points: int
    two_theta_range: Optional[List[float]]
    wavelength_angstrom: Optional[float]
    job_ids: List[str]
    has_results: bool
    created_at: str
    updated_at: str


@router.get("", response_model=List[ProjectResponse])
async def list_projects(container=Depends(get_container)):
    """List all projects."""
    use_case = container.project_use_case
    projects = await use_case.list_projects()
    result = []
    for p in projects:
        experiment_count = len(await container.uow.experiments.get_by_project_id(p["id"]))
        p["experiments"] = experiment_count
        result.append(ProjectResponse(**p))
    return result


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(request: ProjectCreateRequest, container=Depends(get_container)):
    """Create a new project."""
    use_case = container.project_use_case
    project = await use_case.create_project(
        name=request.name,
        description=request.description,
        material=request.material,
        tags=request.tags,
    )
    project["experiments"] = 0
    return ProjectResponse(**project)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, container=Depends(get_container)):
    """Get a project by ID."""
    use_case = container.project_use_case
    project = await use_case.get_project(project_id)
    experiment_count = len(await container.uow.experiments.get_by_project_id(project["id"]))
    project["experiments"] = experiment_count
    return ProjectResponse(**project)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, request: ProjectUpdateRequest, container=Depends(get_container)):
    """Update a project."""
    use_case = container.project_use_case
    project = await use_case.update_project(
        project_id=project_id,
        name=request.name,
        description=request.description,
        material=request.material,
        status=request.status,
    )
    experiment_count = len(await container.uow.experiments.get_by_project_id(project["id"]))
    project["experiments"] = experiment_count
    return ProjectResponse(**project)


@router.delete("/{project_id}")
async def delete_project(project_id: str, container=Depends(get_container)):
    """Delete a project."""
    use_case = container.project_use_case
    deleted = await use_case.delete_project(project_id)
    if not deleted:
        raise EntityNotFoundError(f"Project {project_id} not found")
    return {"success": True, "message": f"Project {project_id} deleted"}


@router.post("/{project_id}/files/{file_id}")
async def add_file_to_project(project_id: str, file_id: str, container=Depends(get_container)):
    """Add a file to a project."""
    use_case = container.project_use_case
    project = await use_case.add_file_to_project(project_id, file_id)
    return ProjectResponse(**project)


@router.post("/{project_id}/jobs/{job_id}")
async def add_job_to_project(project_id: str, job_id: str, container=Depends(get_container)):
    """Add a job to a project."""
    use_case = container.project_use_case
    project = await use_case.add_job_to_project(project_id, job_id)
    return ProjectResponse(**project)


@router.get("/{project_id}/files")
async def list_project_files(project_id: str, container=Depends(get_container)):
    """List all files in a project."""
    use_case = container.project_use_case
    project = await use_case.get_project(project_id)
    uploads = container.upload_service.list_uploads()
    project_files = [u for u in uploads if u.file_id in project["file_ids"]]
    return [
        {
            "file_id": u.file_id,
            "filename": u.filename,
            "detected_format": u.detected_format,
            "is_valid": u.is_valid,
            "uploaded_at": str(u.uploaded_at),
        }
        for u in project_files
    ]


@router.get("/{project_id}/jobs")
async def list_project_jobs(
    project_id: str,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    container=Depends(get_container),
):
    """List all jobs in a project."""
    jobs = container.analysis_orchestrator.list_jobs(
        project_id=project_id, limit=limit, offset=offset
    )
    return {"jobs": jobs, "total": len(jobs)}


@router.get("/{project_id}/experiments")
async def list_project_experiments(project_id: str, container=Depends(get_container)):
    """List all experiments in a project."""
    experiments = await container.uow.experiments.get_by_project_id(project_id)
    return [
        ExperimentResponse(
            id=str(e.id),
            project_id=str(e.project_id),
            name=e.name,
            description=e.description,
            material=e.material,
            status=e.status,
            file_ids=e.file_ids,
            primary_file_id=e.primary_file_id,
            has_pattern_data=e.has_pattern_data,
            has_crystal_structure=e.has_crystal_structure,
            data_points=e.data_points,
            two_theta_range=e.two_theta_range,
            wavelength_angstrom=e.wavelength_angstrom,
            job_ids=e.job_ids,
            has_results=e.has_results,
            created_at=e.created_at.isoformat(),
            updated_at=e.updated_at.isoformat(),
        )
        for e in experiments
    ]


@router.get("/{project_id}/stats")
async def get_project_stats(project_id: str, container=Depends(get_container)):
    """Get project statistics for the overview page."""
    use_case = container.project_use_case
    project = await use_case.get_project(project_id)

    experiments = await container.uow.experiments.get_by_project_id(project_id)
    uploads = container.upload_service.list_uploads()
    project_files = [u for u in uploads if u.file_id in project["file_ids"]]

    jobs = container.analysis_orchestrator.list_jobs(project_id=project_id)
    completed_jobs = [j for j in jobs if j.get("status") == "completed"]

    return {
        "experiment_count": len(experiments),
        "file_count": len(project_files),
        "job_count": len(jobs),
        "completed_job_count": len(completed_jobs),
        "has_data": len(project_files) > 0,
        "has_results": len(completed_jobs) > 0,
    }
