
from uuid import UUID

from backend.application.dtos.report_dto import ReportRequest, ReportResponse
from backend.domain.entities.report import Report, ReportFormat
from backend.domain.interfaces.unit_of_work import IUnitOfWork
from backend.domain.exceptions.domain_exceptions import ValidationError


class GenerateReportUseCase:
    """
    Use case: Generate a report from analysis results.

    Creates a Report entity and triggers report generation.
    The actual PDF/HTML generation is handled by the Report Engine.
    """

    def __init__(self, unit_of_work: IUnitOfWork):
        self._uow = unit_of_work

    async def execute(self, request: ReportRequest) -> ReportResponse:
        # Validate format
        try:
            report_format = ReportFormat[request.format.upper()]
        except KeyError:
            raise ValidationError(f"Unsupported report format: {request.format}")

        # Create report entity
        report = Report(
            title=request.title,
            experiment_ids=[UUID(e) for e in request.experiment_ids],
            result_ids=[UUID(r) for r in request.result_ids],
            format=report_format,
            template_id=request.template_id
        )

        # Persist report
        async with self._uow:
            await self._uow.reports.add(report)
            await self._uow.commit()

        return ReportResponse(
            report_id=str(report.id),
            status="queued",
            format=request.format,
            message="Report generation queued"
        )
