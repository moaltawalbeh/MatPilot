
from typing import Optional
from uuid import UUID

from backend.application.dtos.upload_dto import UploadFileRequest, UploadFileResponse
from backend.domain.entities.xrd_experiment import XRDExperiment
from backend.domain.interfaces.unit_of_work import IUnitOfWork
from backend.parsers.parser_factory import ParserFactory
from backend.domain.exceptions.domain_exceptions import UnsupportedFormatException, ParserException


class UploadFileUseCase:
    """
    Use case: Upload and parse an experimental data file.

    This use case orchestrates the upload flow:
    1. Detect file format
    2. Parse to canonical XRDExperiment model
    3. Persist to storage
    4. Return structured response

    The use case knows nothing about HTTP or web frameworks.
    It only knows DTOs and domain entities.
    """

    def __init__(
        self,
        unit_of_work: IUnitOfWork,
        parser_factory: ParserFactory
    ):
        self._uow = unit_of_work
        self._parser_factory = parser_factory

    async def execute(self, request: UploadFileRequest) -> UploadFileResponse:
        """Execute the upload use case."""
        # Detect format and get appropriate parser
        parser = self._parser_factory.get_parser(request.filename)
        if parser is None:
            raise UnsupportedFormatException(
                f"Unsupported file format: {request.filename}"
            )

        # Parse file to canonical model
        try:
            experiment: XRDExperiment = await parser.parse(
                data=request.file_data,
                filename=request.filename,
                metadata=request.metadata
            )
        except Exception as e:
            raise ParserException(f"Failed to parse file: {str(e)}")

        # Persist experiment
        async with self._uow:
            await self._uow.experiments.add(experiment)
            await self._uow.commit()

        # Build response DTO
        wavelength_val = None
        if experiment.wavelength:
            wavelength_val = experiment.wavelength.value_angstrom

        return UploadFileResponse(
            experiment_id=str(experiment.id),
            filename=request.filename,
            format_detected=parser.format_name,
            data_points=experiment.data_points,
            two_theta_range=(
                min(experiment.two_theta) if experiment.two_theta else 0.0,
                max(experiment.two_theta) if experiment.two_theta else 0.0
            ),
            wavelength=wavelength_val,
            success=True,
            message="File uploaded and parsed successfully"
        )
