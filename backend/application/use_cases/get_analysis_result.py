
from uuid import UUID

from backend.application.dtos.analysis_dto import AnalysisResultDTO
from backend.domain.interfaces.unit_of_work import IUnitOfWork
from backend.domain.exceptions.domain_exceptions import EntityNotFoundError


class GetAnalysisResultUseCase:
    """Use case: Retrieve analysis results by job ID."""

    def __init__(self, unit_of_work: IUnitOfWork):
        self._uow = unit_of_work

    async def execute(self, job_id: str) -> AnalysisResultDTO:
        async with self._uow:
            job = await self._uow.analysis_jobs.get_by_id(UUID(job_id))
            if job is None:
                raise EntityNotFoundError(f"Analysis job {job_id} not found")

            if job.result_id is None:
                return AnalysisResultDTO(
                    result_id="",
                    job_id=job_id,
                    analysis_type=job.analysis_type.name.lower(),
                    status=job.status.name.lower(),
                    created_at=job.created_at.isoformat()
                )

            result = await self._uow.analysis_results.get_by_id(job.result_id)
            if result is None:
                raise EntityNotFoundError(f"Result for job {job_id} not found")

        # Map domain entity to DTO
        peaks = []
        for p in result.peaks:
            peaks.append({
                "two_theta": p.two_theta,
                "intensity": p.intensity,
                "fwhm": p.fwhm,
                "d_spacing": p.d_spacing,
                "hkl": p.hkl
            })

        matches = []
        for m in result.matches:
            matches.append({
                "material_name": m.material_name,
                "material_formula": m.material_formula,
                "source_provider": m.source_provider,
                "match_score": m.match_score,
                "confidence": m.confidence
            })

        return AnalysisResultDTO(
            result_id=str(result.id),
            job_id=job_id,
            analysis_type=result.analysis_type.name.lower(),
            status=job.status.name.lower(),
            peaks=peaks,
            matches=matches,
            phases=[],
            parameters=result.parameters_used,
            confidence=result.confidence_scores,
            created_at=result.created_at.isoformat()
        )
