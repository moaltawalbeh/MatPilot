
from typing import List, Dict, Any, Optional
import asyncio

from backend.reference.interfaces.reference_provider import IReferenceProvider
from backend.domain.entities.material_record import MaterialRecord
from backend.domain.exceptions.domain_exceptions import ProviderNotAvailableError


class ReferenceEngine:
    """
    Reference Knowledge Engine.

    This is the SINGLE point of contact between the MatPilot platform
    and all scientific databases. No other module may communicate
    directly with external databases.

    The engine:
    1. Manages provider registration and lifecycle
    2. Routes queries to appropriate providers
    3. Aggregates results from multiple sources
    4. Caches frequently accessed data
    5. Normalizes provider-specific schemas to domain models

    Design: Facade + Strategy + Registry patterns
    """

    def __init__(self):
        self._providers: Dict[str, IReferenceProvider] = {}
        self._cache: Dict[str, Any] = {}  # Simple cache; replace with Redis in production

    def register_provider(self, provider: IReferenceProvider) -> None:
        """Register a new reference provider."""
        self._providers[provider.name] = provider

    def unregister_provider(self, name: str) -> None:
        """Remove a provider."""
        if name in self._providers:
            del self._providers[name]

    def get_provider(self, name: str) -> Optional[IReferenceProvider]:
        """Get a specific provider by name."""
        return self._providers.get(name)

    def get_available_providers(self) -> List[IReferenceProvider]:
        """Get all registered providers."""
        return list(self._providers.values())

    def get_available_provider_names(self) -> List[str]:
        """Get names of providers that are currently reachable."""
        return [
            name for name, provider in self._providers.items()
            if provider.is_available()
        ]

    async def search(
        self,
        query: str,
        providers: List[str] = None,
        filters: Dict[str, Any] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[MaterialRecord]:
        """
        Search across all specified providers.

        If no providers are specified, searches all available providers.
        Results are aggregated and deduplicated.
        """
        if providers is None:
            providers = self.get_available_provider_names()

        if not providers:
            return []

        # Execute searches in parallel
        tasks = []
        for provider_name in providers:
            provider = self._providers.get(provider_name)
            if provider and provider.is_available():
                tasks.append(provider.search(query, filters or {}, limit, offset))

        if not tasks:
            raise ProviderNotAvailableError("No providers available for search")

        results_lists = await asyncio.gather(*tasks, return_exceptions=True)

        # Aggregate and deduplicate results
        all_results: List[MaterialRecord] = []
        seen_ids = set()

        for result_list in results_lists:
            if isinstance(result_list, Exception):
                continue  # Log error but don't fail entire search
            for record in result_list:
                # Deduplicate by source_id + source_provider
                dedup_key = f"{record.source_provider}:{record.source_id}"
                if dedup_key not in seen_ids:
                    seen_ids.add(dedup_key)
                    all_results.append(record)

        return all_results[:limit]

    async def get_material(
        self,
        provider_name: str,
        provider_id: str
    ) -> Optional[MaterialRecord]:
        """Get a specific material from a specific provider."""
        provider = self._providers.get(provider_name)
        if not provider:
            raise ProviderNotAvailableError(f"Provider {provider_name} not registered")
        if not provider.is_available():
            raise ProviderNotAvailableError(f"Provider {provider_name} is not available")

        return await provider.get_by_id(provider_id)

    async def get_diffraction_pattern(
        self,
        provider_name: str,
        provider_id: str,
        wavelength: Optional[float] = None
    ) -> Optional[Dict[str, Any]]:
        """Get diffraction pattern from a provider."""
        provider = self._providers.get(provider_name)
        if not provider or not provider.is_available():
            return None

        return await provider.get_diffraction_pattern(provider_id, wavelength)
