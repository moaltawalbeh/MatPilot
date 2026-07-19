"""Local Cache provider.

Real implementation using CIFCache for persistent local caching
of CIF files and parsed crystallographic data.
"""

from typing import List, Dict, Any, Optional

from backend.reference.interfaces.reference_provider import IReferenceProvider
from backend.reference.cif_cache import CIFCache
from backend.domain.entities.material_record import MaterialRecord


class LocalCacheProvider(IReferenceProvider):
    """
    Local Cache provider backed by CIFCache.

    Caches CIF files and parsed crystallographic data to disk.
    Reduces network calls to COD API.
    """

    def __init__(self, cache_dir: str = "data/cif_cache"):
        self._cache = CIFCache(cache_dir=cache_dir)

    @property
    def name(self) -> str:
        return "LocalCache"

    @property
    def display_name(self) -> str:
        return "Local CIF Cache"

    @property
    def description(self) -> str:
        return f"Local cache of {self._cache.cache_size()} CIF entries. Reduces COD API calls."

    def is_available(self) -> bool:
        return True

    def supported_features(self) -> List[str]:
        return ["cache_lookup", "cache_store", "cif_cache"]

    def version(self) -> Optional[str]:
        return "2.0.0"

    async def search(self, query, filters, limit, offset):
        # Cache doesn't do searches, only stores
        return []

    async def get_by_id(self, provider_id):
        # Check if cached
        parsed = self._cache.get_parsed_data(provider_id)
        if not parsed:
            return None

        return MaterialRecord(
            name=parsed.get("name", f"Cached {provider_id}"),
            formula=parsed.get("formula", ""),
            source_provider="LocalCache",
            source_id=provider_id,
            metadata={
                "formula": parsed.get("formula", ""),
                "space_group": parsed.get("space_group", ""),
                "crystal_system": parsed.get("crystal_system", ""),
                "from_cache": True,
            },
        )

    async def get_diffraction_pattern(self, provider_id, wavelength=None):
        # Not implemented - pattern generation handled by TheoreticalPatternGenerator
        return None

    def get_cache_info(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return {
            "cached_entries": self._cache.cache_size(),
            "cached_ids": self._cache.list_cached_ids(),
        }
