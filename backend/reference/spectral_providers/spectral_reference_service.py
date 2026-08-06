"""Spectral reference service: aggregates all spectral database providers.

The instrument workspaces (FTIR, Raman, UV-Vis) never talk to a database
directly. They call this service, which:

1. queries the offline built-in library first so results are always returned,
2. fans out to every available live provider (Open Specy, Ramanbase, ...),
3. merges, de-duplicates and ranks the results into one uniform list.

Providers are queried concurrently and failures degrade to "provider skipped",
never an error.
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional

from backend.reference.spectral_providers.interfaces import (
    ISpectralProvider,
    SpectralMatch,
    SpectralReference,
)

logger = logging.getLogger("spectral_reference_service")


class SpectralReferenceService:
    """Facade over every registered :class:`ISpectralProvider`."""

    def __init__(self, providers: List[ISpectralProvider]):
        self._providers: List[ISpectralProvider] = list(providers)

    @property
    def providers(self) -> List[ISpectralProvider]:
        return list(self._providers)

    def register(self, provider: ISpectralProvider) -> None:
        self._providers.append(provider)

    def providers_for(self, technique: str) -> List[ISpectralProvider]:
        tech = (technique or "").lower()
        return [p for p in self._providers if tech in p.supported_techniques()]

    def available_providers_for(self, technique: str) -> List[ISpectralProvider]:
        tech = (technique or "").lower()
        return [
            p
            for p in self._providers
            if tech in p.supported_techniques() and p.is_available()
        ]

    def provider_status(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": p.name,
                "display_name": p.display_name,
                "description": p.description,
                "available": p.is_available(),
                "version": p.version(),
                "techniques": p.supported_techniques(),
                "features": p.supported_features(),
            }
            for p in self._providers
        ]

    @staticmethod
    def _dedupe(refs: List[SpectralReference]) -> List[SpectralReference]:
        seen: Dict[str, SpectralReference] = {}
        for ref in refs:
            seen.setdefault(ref.reference_id, ref)
        return list(seen.values())

    async def search(
        self,
        query: str,
        limit: int = 20,
        technique: Optional[str] = None,
    ) -> List[SpectralReference]:
        providers = self.providers_for(technique) if technique else self._providers
        if not providers:
            return []

        async def _one(provider: ISpectralProvider) -> List[SpectralReference]:
            try:
                return await provider.search(query, limit=max(limit, 10), technique=technique)
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning("search failed for %s: %s", provider.name, exc)
                return []

        results = await asyncio.gather(*(_one(p) for p in providers), return_exceptions=True)
        merged: List[SpectralReference] = []
        for r in results:
            if isinstance(r, list):
                merged.extend(r)
        return self._dedupe(merged)[:limit]

    async def get_reference(self, reference_id: str) -> Optional[SpectralReference]:
        for provider in self._providers:
            try:
                ref = await provider.get_reference(reference_id)
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning("get_reference failed for %s: %s", provider.name, exc)
                continue
            if ref:
                return ref
        return None

    async def match_spectrum(
        self,
        x: List[float],
        y: List[float],
        limit: int = 10,
        technique: Optional[str] = None,
    ) -> List[SpectralMatch]:
        providers = self.providers_for(technique) if technique else self._providers
        if not providers:
            return []

        async def _one(provider: ISpectralProvider) -> List[SpectralMatch]:
            try:
                return await provider.match_spectrum(x, y, limit=max(limit, 10), technique=technique)
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning("match failed for %s: %s", provider.name, exc)
                return []

        results = await asyncio.gather(*(_one(p) for p in providers), return_exceptions=True)
        merged: List[SpectralMatch] = []
        seen: set = set()
        for r in results:
            if not isinstance(r, list):
                continue
            for match in r:
                if match.reference.reference_id in seen:
                    continue
                seen.add(match.reference.reference_id)
                merged.append(match)
        merged.sort(key=lambda m: m.score, reverse=True)
        return merged[:limit]
