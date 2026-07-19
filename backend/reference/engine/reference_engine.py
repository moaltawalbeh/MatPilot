"""Reference Knowledge Engine.

Single point of contact between MatPilot and all scientific databases.
Coordinates: COD API → CIF Cache → CIF Parser → Theoretical Pattern → Similarity.

No other module may communicate directly with external databases.
"""

import logging
from typing import List, Dict, Any, Optional
import asyncio

from backend.reference.interfaces.reference_provider import IReferenceProvider
from backend.reference.providers.cod_provider import CODProvider
from backend.reference.providers.local_cod_provider import LocalCODProvider
from backend.reference.cif_cache import CIFCache
from backend.reference.cif_parser import CIFParser
from backend.reference.theoretical_pattern import TheoreticalPatternGenerator
from backend.reference.pymatgen_pattern_generator import PymatgenPatternGenerator
from backend.reference.similarity_engine import SimilarityEngine, SimilarityResult
from backend.domain.entities.material_record import MaterialRecord
from backend.domain.exceptions.domain_exceptions import ProviderNotAvailableError

logger = logging.getLogger("reference_engine")


class ReferenceEngine:
    """
    Reference Knowledge Engine.

    This is the SINGLE point of contact between the MatPilot platform
    and all scientific databases. No other module may communicate
    directly with external databases.

    Sprint 6 responsibilities:
    1. Search COD via real API
    2. Download + cache CIF files
    3. Parse CIF → crystallographic data
    4. Generate theoretical patterns from CIF data
    5. Compare experimental vs theoretical → similarity scores
    6. Rank candidates by similarity
    """

    def __init__(
        self,
        cif_cache_dir: str = "data/cif_cache",
        wavelength: float = 1.5406,
    ):
        self._providers: Dict[str, IReferenceProvider] = {}
        self._cif_cache = CIFCache(cache_dir=cif_cache_dir)
        self._cif_parser = CIFParser()
        self._pattern_generator = TheoreticalPatternGenerator(wavelength=wavelength)
        self._pymatgen_generator = PymatgenPatternGenerator(wavelength=wavelength)
        self._similarity_engine = SimilarityEngine(wavelength=wavelength)
        self._wavelength = wavelength

    def register_provider(self, provider: IReferenceProvider) -> None:
        self._providers[provider.name] = provider

    def unregister_provider(self, name: str) -> None:
        if name in self._providers:
            del self._providers[name]

    def get_provider(self, name: str) -> Optional[IReferenceProvider]:
        return self._providers.get(name)

    def get_available_providers(self) -> List[IReferenceProvider]:
        return list(self._providers.values())

    def get_available_provider_names(self) -> List[str]:
        result = []
        for name, provider in self._providers.items():
            if hasattr(provider, '_availability_cache'):
                if provider._availability_cache is not False:
                    result.append(name)
            elif provider.is_available():
                result.append(name)
        return result

    @property
    def cif_cache(self) -> CIFCache:
        return self._cif_cache

    @property
    def similarity_engine(self) -> SimilarityEngine:
        return self._similarity_engine

    @property
    def pattern_generator(self) -> TheoreticalPatternGenerator:
        return self._pattern_generator

    # ─── Search ────────────────────────────────────────────────

    async def search(
        self,
        query: str,
        providers: List[str] = None,
        filters: Dict[str, Any] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[MaterialRecord]:
        """Search across all specified providers."""
        if providers is None:
            providers = self.get_available_provider_names()

        if not providers:
            return []

        tasks = []
        for provider_name in providers:
            provider = self._providers.get(provider_name)
            if provider:
                tasks.append(provider.search(query, filters or {}, limit, offset))

        if not tasks:
            raise ProviderNotAvailableError("No providers available for search")

        results_lists = await asyncio.gather(*tasks, return_exceptions=True)

        all_results: List[MaterialRecord] = []
        seen_ids = set()

        for result_list in results_lists:
            if isinstance(result_list, Exception):
                continue
            for record in result_list:
                dedup_key = f"{record.source_provider}:{record.source_id}"
                if dedup_key not in seen_ids:
                    seen_ids.add(dedup_key)
                    all_results.append(record)

        return all_results[:limit]

    # ─── CIF Download + Cache ──────────────────────────────────

    @staticmethod
    def _normalize_cod_id(cod_id: str) -> str:
        """Strip 'COD_' prefix if present to get numeric ID for URL."""
        if cod_id.upper().startswith("COD_"):
            return cod_id[4:]
        return cod_id

    def get_or_download_cif(self, cod_id: str) -> Optional[str]:
        """Get CIF content from cache or download from COD (sync)."""
        # Check cache first
        cached = self._cif_cache.get_cif_content(cod_id)
        if cached:
            logger.info(f"CIF {cod_id} loaded from cache")
            return cached

        # Also try cache with normalized ID
        numeric_id = self._normalize_cod_id(cod_id)
        if numeric_id != cod_id:
            cached = self._cif_cache.get_cif_content(numeric_id)
            if cached:
                logger.info(f"CIF {cod_id} loaded from cache (as {numeric_id})")
                return cached

        # Download from COD
        cod_provider = self._providers.get("COD")
        if not cod_provider or not isinstance(cod_provider, CODProvider):
            logger.error("COD provider not available for CIF download")
            return None

        logger.info(f"Downloading CIF {numeric_id} from COD...")
        cif_content = cod_provider.download_cif(numeric_id)
        if not cif_content:
            return None

        # Parse and cache under both keys
        parsed_data = self._cif_parser.parse(cif_content)
        self._cif_cache.store_cif(cod_id, cif_content, parsed_data)
        if numeric_id != cod_id:
            self._cif_cache.store_cif(numeric_id, cif_content, parsed_data)

        return cif_content

    async def get_or_download_cif_async(self, cod_id: str) -> Optional[str]:
        """Async version — runs blocking CIF download in a thread."""
        cached = self._cif_cache.get_cif_content(cod_id)
        if cached:
            return cached
        numeric_id = self._normalize_cod_id(cod_id)
        if numeric_id != cod_id:
            cached = self._cif_cache.get_cif_content(numeric_id)
            if cached:
                return cached
        cod_provider = self._providers.get("COD")
        if cod_provider and hasattr(cod_provider, '_availability_cache'):
            if cod_provider._availability_cache is False:
                return None
        return await asyncio.to_thread(self.get_or_download_cif, cod_id)

    def get_parsed_cif(self, cod_id: str) -> Optional[Dict[str, Any]]:
        """Get parsed CIF data from cache or download + parse (sync)."""
        # Check for cached parsed data
        parsed = self._cif_cache.get_parsed_data(cod_id)
        if parsed:
            return parsed

        # Also try with normalized ID
        numeric_id = self._normalize_cod_id(cod_id)
        if numeric_id != cod_id:
            parsed = self._cif_cache.get_parsed_data(numeric_id)
            if parsed:
                return parsed

        # Download CIF
        cif_content = self.get_or_download_cif(cod_id)
        if not cif_content:
            return None

        # Parse
        parsed = self._cif_parser.parse(cif_content)

        # Update cache with parsed data
        self._cif_cache.store_cif(cod_id, cif_content, parsed)
        if numeric_id != cod_id:
            self._cif_cache.store_cif(numeric_id, cif_content, parsed)

        return parsed

    async def get_parsed_cif_async(self, cod_id: str) -> Optional[Dict[str, Any]]:
        """Async version — runs blocking CIF download+parse in a thread."""
        parsed = self._cif_cache.get_parsed_data(cod_id)
        if parsed:
            return parsed
        numeric_id = self._normalize_cod_id(cod_id)
        if numeric_id != cod_id:
            parsed = self._cif_cache.get_parsed_data(numeric_id)
            if parsed:
                return parsed
        cod_provider = self._providers.get("COD")
        if cod_provider and hasattr(cod_provider, '_availability_cache'):
            if cod_provider._availability_cache is False:
                return None
        return await asyncio.to_thread(self.get_parsed_cif, cod_id)

    # ─── Theoretical Pattern Generation ────────────────────────

    def generate_theoretical_pattern(
        self,
        cod_id: str,
        max_two_theta: float = 120.0,
    ) -> Optional[List[Dict[str, Any]]]:
        """Generate theoretical XRD pattern from a COD entry's CIF data."""
        parsed_data = self.get_parsed_cif(cod_id)
        if not parsed_data:
            logger.warning(f"Cannot generate pattern for {cod_id}: no CIF data")
            return None

        return self._pattern_generator.generate_pattern(
            parsed_data, max_two_theta=max_two_theta
        )

    # ─── Full Pipeline: Search → Download → Generate → Compare ─

    async def identify_phases(
        self,
        experimental_peaks: List[Dict[str, Any]],
        query: str = "",
        elements: List[str] = None,
        limit: int = 20,
        max_two_theta: float = 120.0,
    ) -> List[SimilarityResult]:
        """
        Full phase identification pipeline.

        1. Search local DB (instant, no network)
        2. Optionally search COD if available (with timeout)
        3. Compare against experimental pattern
        4. Rank by similarity score
        5. Return top matches

        Args:
            experimental_peaks: Detected experimental peaks (two_theta, intensity)
            query: Search query (formula or text)
            elements: Required elements filter
            limit: Max candidates to process
            max_two_theta: Max angle for theoretical patterns

        Returns:
            Ranked list of SimilarityResult
        """
        search_query = query
        if not search_query and elements:
            search_query = " ".join(elements)

        # Allow pattern-based identification without a query
        # When no query, search ALL local entries using peak matching only
        filters = {}
        if elements:
            filters["elements"] = elements

        results: List[SimilarityResult] = list(
            await self._identify_from_local(experimental_peaks, search_query or "")
        )

        # If no query provided and we have local results, skip COD search
        # (COD search requires a query string)
        if not search_query:
            results.sort(key=lambda r: r.match_score, reverse=True)
            return results[:limit]

        cod_provider = self._providers.get("COD")
        cod_available = cod_provider is not None and cod_provider._availability_cache is True

        if cod_available:
            try:
                cod_candidates = await asyncio.wait_for(
                    self.search(
                        query=search_query,
                        providers=["COD"],
                        filters=filters,
                        limit=limit,
                    ),
                    timeout=15,
                )
            except asyncio.TimeoutError:
                logger.warning("COD search timed out, using local results only")
                cod_candidates = []
            except Exception as exc:
                logger.warning("COD search failed: %s", exc)
                cod_candidates = []

            for candidate in cod_candidates:
                cod_id = candidate.metadata.get("cod_id", candidate.source_id)

                parsed_data = await self.get_parsed_cif_async(cod_id)
                if not parsed_data:
                    logger.warning(f"Could not get CIF for COD {cod_id}")
                    continue

                theoretical_peaks = None
                if self._pymatgen_generator.available:
                    cif_content = await self.get_or_download_cif_async(cod_id)
                    if cif_content:
                        theoretical_peaks = self._pymatgen_generator.generate_from_cif_content(
                            cif_content, max_two_theta=max_two_theta
                        )
                if not theoretical_peaks:
                    theoretical_peaks = self._pattern_generator.generate_pattern(
                        parsed_data, max_two_theta=max_two_theta
                    )
                if not theoretical_peaks:
                    logger.warning(f"No theoretical peaks for COD {cod_id}")
                    continue

                material_name = parsed_data.get("name", "") or candidate.name or f"COD {cod_id}"
                material_formula = parsed_data.get("formula", "") or candidate.formula

                sim_result = self._similarity_engine.compare_patterns(
                    experimental_peaks=experimental_peaks,
                    reference_peaks=theoretical_peaks,
                    material_name=material_name,
                    material_formula=material_formula,
                    source_id=cod_id,
                    source_provider="COD",
                )

                results.append(sim_result)

        results.sort(key=lambda r: r.match_score, reverse=True)

        return results[:limit]

    async def _identify_from_local(
        self,
        experimental_peaks: List[Dict[str, Any]],
        query: str,
    ) -> List[SimilarityResult]:
        """Identify phases using local COD database with query pre-filtering."""
        local_provider = self._providers.get("LocalCOD")
        if not local_provider or not isinstance(local_provider, LocalCODProvider):
            return []

        query_lower = query.lower().strip()
        local_entries = local_provider.get_all_reference_entries()

        filtered_entries = []
        for entry in local_entries:
            name = entry.get("material_name", "").lower()
            formula = entry.get("material_formula", "").lower()
            if query_lower in name or query_lower in formula:
                filtered_entries.append(entry)

        if not filtered_entries:
            filtered_entries = local_entries

        results: List[SimilarityResult] = []

        for entry in filtered_entries:
            ref_peaks = entry.get("peak_details", entry.get("peaks", []))

            # Convert peak list to standard format if needed
            if ref_peaks and isinstance(ref_peaks[0], (int, float)):
                ref_peaks = [{"two_theta": t, "intensity": 100} for t in ref_peaks]

            if not ref_peaks:
                continue

            sim_result = self._similarity_engine.compare_patterns(
                experimental_peaks=experimental_peaks,
                reference_peaks=ref_peaks,
                material_name=entry.get("material_name", ""),
                material_formula=entry.get("material_formula", ""),
                source_id=entry.get("source_id", ""),
                source_provider=entry.get("source_provider", "LocalCOD"),
            )

            # Apply query-match boost: materials whose formula/name matches the
            # search query get a score bonus so they rank higher.
            if query_lower:
                formula_lower = entry.get("material_formula", "").lower()
                name_lower = entry.get("material_name", "").lower()
                if formula_lower == query_lower or name_lower == query_lower:
                    sim_result.match_score = min(1.0, sim_result.match_score + 0.30)
                elif query_lower in formula_lower or query_lower in name_lower:
                    sim_result.match_score = min(1.0, sim_result.match_score + 0.15)

            results.append(sim_result)

        results.sort(key=lambda r: r.match_score, reverse=True)
        return results

    # ─── Material Lookup ───────────────────────────────────────

    async def get_material(
        self, provider_name: str, provider_id: str
    ) -> Optional[MaterialRecord]:
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
        wavelength: Optional[float] = None,
    ) -> Optional[Dict[str, Any]]:
        """Get diffraction pattern, generating from CIF if needed."""
        provider = self._providers.get(provider_name)
        if not provider or not provider.is_available():
            return None

        # Try provider's built-in pattern first
        pattern = await provider.get_diffraction_pattern(provider_id, wavelength)
        if pattern:
            return pattern

        # Generate from CIF
        if provider_name == "COD":
            theoretical = self.generate_theoretical_pattern(provider_id)
            if theoretical:
                return {
                    "two_theta": [p["two_theta"] for p in theoretical],
                    "intensity": [p["intensity"] for p in theoretical],
                    "hkl": [p.get("hkl", "") for p in theoretical],
                    "d_spacing": [p.get("d_spacing", 0) for p in theoretical],
                }

        return None
