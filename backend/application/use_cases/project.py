"""Project use cases."""

from typing import List, Optional
from uuid import UUID

from backend.domain.entities.project import Project
from backend.domain.exceptions.domain_exceptions import EntityNotFoundError, ValidationError


class ProjectUseCase:
    def __init__(self, uow):
        self._uow = uow

    async def list_projects(self, owner_id: str = "default") -> List[dict]:
        async with self._uow:
            projects = await self._uow.projects.get_by_owner(owner_id)
            return [self._to_dict(p) for p in projects]

    async def get_project(self, project_id: str) -> dict:
        uid = UUID(project_id)
        async with self._uow:
            project = await self._uow.projects.get_by_id(uid)
            if not project:
                raise EntityNotFoundError(f"Project {project_id} not found")
            return self._to_dict(project)

    async def create_project(self, name: str, description: str = "", material: str = "", tags: List[str] = None) -> dict:
        if not name or not name.strip():
            raise ValidationError("Project name is required")
        project = Project(
            name=name.strip(),
            description=description.strip(),
            material=material.strip(),
            tags=tags or [],
        )
        async with self._uow:
            await self._uow.projects.add(project)
            await self._uow.commit()
            return self._to_dict(project)

    async def update_project(self, project_id: str, name: str = None, description: str = None, material: str = None, status: str = None) -> dict:
        uid = UUID(project_id)
        async with self._uow:
            project = await self._uow.projects.get_by_id(uid)
            if not project:
                raise EntityNotFoundError(f"Project {project_id} not found")
            if name is not None:
                project.name = name.strip()
            if description is not None:
                project.description = description.strip()
            if material is not None:
                project.material = material.strip()
            if status is not None:
                if status not in ("Active", "Complete", "Archived"):
                    raise ValidationError(f"Invalid status: {status}")
                project.status = status
            project.touch()
            await self._uow.projects.update(project)
            await self._uow.commit()
            return self._to_dict(project)

    async def delete_project(self, project_id: str) -> bool:
        uid = UUID(project_id)
        async with self._uow:
            deleted = await self._uow.projects.delete(uid)
            if deleted:
                await self._uow.commit()
            return deleted

    async def add_file_to_project(self, project_id: str, file_id: str) -> dict:
        uid = UUID(project_id)
        async with self._uow:
            project = await self._uow.projects.get_by_id(uid)
            if not project:
                raise EntityNotFoundError(f"Project {project_id} not found")
            if file_id not in project.file_ids:
                project.file_ids.append(file_id)
            project.touch()
            await self._uow.projects.update(project)
            await self._uow.commit()
            return self._to_dict(project)

    async def add_job_to_project(self, project_id: str, job_id: str) -> dict:
        uid = UUID(project_id)
        async with self._uow:
            project = await self._uow.projects.get_by_id(uid)
            if not project:
                raise EntityNotFoundError(f"Project {project_id} not found")
            if job_id not in project.job_ids:
                project.job_ids.append(job_id)
            project.touch()
            await self._uow.projects.update(project)
            await self._uow.commit()
            return self._to_dict(project)

    @staticmethod
    def _to_dict(project: Project) -> dict:
        return {
            "id": str(project.id),
            "name": project.name,
            "description": project.description,
            "material": project.material,
            "owner_id": project.owner_id,
            "file_ids": project.file_ids,
            "job_ids": project.job_ids,
            "experiment_ids": [str(eid) for eid in project.experiment_ids],
            "status": project.status,
            "tags": project.tags,
            "created_at": project.created_at.isoformat(),
            "updated_at": project.updated_at.isoformat(),
            "files": len(project.file_ids),
            "analyses": len(project.job_ids),
        }
