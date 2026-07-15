
from backend.application.dtos.reference_dto import (
    ReferenceSearchRequest,
    ReferenceSearchResponse,
    ProviderInfoDTO
)
from backend.reference.engine.reference_engine import ReferenceEngine


class SearchReferenceUseCase:
    """
    Use case: Search reference databases.

    Delegates to the Reference Knowledge Engine.
    The application layer never talks directly to providers.
    """

    def __init__(self, reference_engine: ReferenceEngine):
        self._engine = reference_engine

    async def execute(self, request: ReferenceSearchRequest) -> ReferenceSearchResponse:
        results = await self._engine.search(
            query=request.query,
            providers=request.providers,
            filters=request.filters,
            limit=request.limit,
            offset=request.offset
        )

        return ReferenceSearchResponse(
            results=results,
            total_count=len(results),
            providers_searched=request.providers,
            query_time_ms=0.0
        )


class GetProvidersUseCase:
    """Use case: List available reference providers."""

    def __init__(self, reference_engine: ReferenceEngine):
        self._engine = reference_engine

    async def execute(self) -> list[ProviderInfoDTO]:
        providers = self._engine.get_available_providers()
        return [
            ProviderInfoDTO(
                name=p.name,
                display_name=p.display_name,
                description=p.description,
                is_available=p.is_available(),
                supported_features=p.supported_features(),
                version=p.version()
            )
            for p in providers
        ]
