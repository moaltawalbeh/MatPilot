
from uuid import UUID

from backend.application.dtos.analysis_dto import AnalysisRequest, AnalysisResponse
from backend.domain.entities.analysis_job import AnalysisJob, AnalysisType, AnalysisStatus
from backend.domain.interfaces.unit_of_work import IUnitOfWork
from backend.domain.exceptions.domain_exceptions import EntityNotFoundError, ValidationError


class SubmitAnalysisUseCase:
    """
    Use case: Submit an analysis job.

    Creates an AnalysisJob entity and queues it for processing.
    The actual execution is handled asynchronously by the Analysis Engine.
    """

    def __init__(self, unit_of_work: IUnitOfWork):
        self._uow = unit_of_work

    async def execute(self, request: AnalysisRequest) -> AnalysisResponse:
        # Validate experiment exists
        async with self._uow:
            experiment = await self._uow.experiments.get_by_id(UUID(request.experiment_id))
            if experiment is None:
                raise EntityNotFoundError(
                    f"Experiment {request.experiment_id} not found"
                )

        # Map string to enum
        try:
            analysis_type = AnalysisType[request.analysis_type.upper()]
        except KeyError:
            raise ValidationError(f"Unknown analysis type: {request.analysis_type}")

        # Create job entity
        job = AnalysisJob(
            experiment_id=UUID(request.experiment_id),
            analysis_type=analysis_type,
            parameters=request.parameters,
            provider_preferences=request.provider_preferences,
            status=AnalysisStatus.QUEUED
        )

        # Persist job
        async with self._uow:
            await self._uow.analysis_jobs.add(job)
            await self._uow.commit()

        return AnalysisResponse(
            job_id=str(job.id),
            status=job.status.name.lower(),
            analysis_type=request.analysis_type,
            experiment_id=request.experiment_id,
            created_at=job.created_at.isoformat(),
            message="Analysis job queued successfully"
        )
