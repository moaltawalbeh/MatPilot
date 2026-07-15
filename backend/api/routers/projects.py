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


@router.get("", response_model=List[ProjectResponse])
async def list_projects(container=Depends(get_container)):
    """List all projects."""
    use_case = container.project_use_case
    projects = await use_case.list_projects()
    return [ProjectResponse(**p) for p in projects]


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
    return ProjectResponse(**project)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, container=Depends(get_container)):
    """Get a project by ID."""
    use_case = container.project_use_case
    project = await use_case.get_project(project_id)
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
