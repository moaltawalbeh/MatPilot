"""Crystallography Open Database (COD) Provider.

Real integration with the COD REST API for searching and downloading
crystal structures. Does NOT do pattern generation — that's CIFParser + TheoreticalPatternGenerator.
"""

import time
import re
import logging
import asyncio
from typing import List, Dict, Any, Optional
import requests as http_requests

from backend.reference.interfaces.reference_provider import IReferenceProvider
from backend.domain.entities.material_record import MaterialRecord
from backend.domain.value_objects.crystal_system import CrystalSystem

logger = logging.getLogger("cod_provider")

CRYSTAL_SYSTEM_MAP = {
    "Cubic": CrystalSystem.CUBIC,
    "Hexagonal": CrystalSystem.HEXAGONAL,
    "Tetragonal": CrystalSystem.TETRAGONAL,
    "Trigonal": CrystalSystem.TRIGONAL,
    "Orthorhombic": CrystalSystem.ORTHORHOMBIC,
    "Monoclinic": CrystalSystem.MONOCLINIC,
    "Triclinic": CrystalSystem.TRICLINIC,
}


class CODProvider(IReferenceProvider):
    """
    Crystallography Open Database (COD) provider.

    Communicates with the COD REST API at crystallography.net.
    Searches by formula/elements, returns MaterialRecords.
    Downloads CIF files via CIFCache (separate concern).

    Rate limiting: 1 request per second between API calls.
    """

    SEARCH_URL = "https://www.crystallography.net/cod/result"
    CIF_URL_TEMPLATE = "https://www.crystallography.net/cod/{cod_id}.cif"

    def __init__(self, api_base_url: str = "https://www.crystallography.net/cod"):
        self._api_base = api_base_url
        self._version = "2.0.0"
        self._last_request_time = 0.0
        self._min_request_interval = 0.5  # 500ms between requests
        self._session = http_requests.Session()
        self._session.headers.update({
            "User-Agent": "MatPilot/2.0 (scientific-xrd-analysis)",
            "Accept": "application/json",
        })
        self._availability_cache: Optional[bool] = None

    @property
    def name(self) -> str:
        return "COD"

    @property
    def display_name(self) -> str:
        return "Crystallography Open Database"

    @property
    def description(self) -> str:
        return "Open-access collection of crystal structures. 500,000+ entries."

    def is_available(self) -> bool:
        if self._availability_cache is not None:
            return self._availability_cache
        try:
            resp = self._session.get(
                "https://www.crystallography.net/cod/",
                timeout=5,
            )
            self._availability_cache = resp.status_code == 200
            return self._availability_cache
        except Exception:
            self._availability_cache = False
            return False

    def supported_features(self) -> List[str]:
        return [
            "formula_search",
            "element_search",
            "space_group_search",
            "cif_download",
        ]

    def version(self) -> Optional[str]:
        return self._version

    def _rate_limit(self):
        """Enforce minimum interval between requests."""
        now = time.time()
        elapsed = now - self._last_request_time
        if elapsed < self._min_request_interval:
            time.sleep(self._min_request_interval - elapsed)
        self._last_request_time = time.time()

    def _build_search_params(
        self,
        query: str,
        filters: Dict[str, Any],
        limit: int,
    ) -> Dict[str, Any]:
        """Build COD API search parameters from query and filters.

        COD API supports:
        - formula: space-separated Hill notation (e.g. "O2 Si", "Al2 O3")
        - text: free text search in title/abstract
        - el1..el8: individual element symbols
        """
        params: Dict[str, Any] = {
            "format": "json",
        }

        # Determine if query is a formula, element symbol, or text
        query_stripped = query.strip()

        # Single element symbol (e.g. "Si", "Fe", "O")
        element_match = re.fullmatch(r'([A-Z][a-z]?)', query_stripped)
        if element_match:
            params["el1"] = query_stripped
            return params

        # Multi-element filter (e.g. elements=["Si", "O"])
        elements_filter = filters.get("elements") if filters else None
        if elements_filter and isinstance(elements_filter, list):
            for i, elem in enumerate(elements_filter[:8], 1):
                params[f"el{i}"] = elem
            return params

        # Formula with digits (e.g. "SiO2", "Al2O3", "Fe2O3")
        if re.search(r'\d', query_stripped):
            # Convert compact formula to Hill notation with spaces
            # "SiO2" -> "O2 Si", "Al2O3" -> "Al2 O3", "Fe2O3" -> "Fe2 O3"
            hill_formula = self._to_hill_notation(query_stripped)
            params["formula"] = hill_formula
            return params

        # Looks like a text query (e.g. "silicon", "corundum", "quartz")
        params["text"] = query_stripped
        return params

    @staticmethod
    def _to_hill_notation(formula: str) -> str:
        """Convert a compact formula to COD Hill notation with spaces.

        Examples:
            "SiO2" -> "O2 Si"
            "Al2O3" -> "Al2 O3"
            "Fe2O3" -> "Fe2 O3"
            "CaCO3" -> "C Ca O3"
            "NaCl" -> "Cl Na"
        """
        # Parse element+count pairs
        elements = re.findall(r'([A-Z][a-z]?)(\d*)', formula)
        # Filter out empty matches
        pairs = [(e, int(c) if c else 1) for e, c in elements if e]

        if not pairs:
            return formula

        # Hill order: C first, H second, then alphabetical
        def sort_key(pair):
            e = pair[0]
            if e == "C":
                return (0, e)
            elif e == "H":
                return (1, e)
            else:
                return (2, e)

        pairs.sort(key=sort_key)

        parts = []
        for elem, count in pairs:
            if count == 1:
                parts.append(elem)
            else:
                parts.append(f"{elem}{count}")
        return " ".join(parts)

    def _parse_search_results(self, data: Any, limit: int) -> List[MaterialRecord]:
        """Parse COD API JSON response into MaterialRecords.

        The COD API returns a flat JSON array of record objects:
        [{"file": "1010921", "formula": "- O2 Si -", "mineral": "...", ...}, ...]
        """
        records: List[MaterialRecord] = []

        if isinstance(data, list):
            # Flat list format (actual COD API response)
            for entry in data:
                if not isinstance(entry, dict):
                    continue
                cod_id = str(entry.get("file", "")).strip()
                if not cod_id:
                    continue

                formula = entry.get("formula", "")
                mineral = entry.get("mineral", "")
                sg = entry.get("sg", "")

                name = mineral if mineral else f"COD {cod_id}"

                record = MaterialRecord(
                    name=name,
                    formula=formula,
                    source_provider=self.name,
                    source_id=cod_id,
                    source_url=f"{self._api_base}/{cod_id}.html",
                    crystal_system=self._sg_to_crystal_system(sg),
                    metadata={
                        "cod_id": cod_id,
                        "formula_raw": formula,
                        "mineral": mineral,
                        "space_group": sg,
                        "a": entry.get("a", ""),
                        "b": entry.get("b", ""),
                        "c": entry.get("c", ""),
                        "needs_cif_download": True,
                    },
                )
                records.append(record)

                if len(records) >= limit:
                    return records

        elif isinstance(data, dict):
            # Legacy nested format (fallback)
            results_list = data.get("results", [])
            for result_entry in results_list:
                data_entries = result_entry.get("data", [])
                for entry in data_entries:
                    file_info = entry.get("file", {})
                    cod_id_str = file_info.get("sdbm", "")
                    if not cod_id_str:
                        continue
                    cod_id = cod_id_str.replace("COD_", "").strip()
                    if not cod_id:
                        continue
                    record = MaterialRecord(
                        name=f"COD {cod_id}",
                        formula="",
                        source_provider=self.name,
                        source_id=cod_id,
                        source_url=f"{self._api_base}/{cod_id}.html",
                        metadata={
                            "cod_id": cod_id,
                            "needs_cif_download": True,
                        },
                    )
                    records.append(record)
                    if len(records) >= limit:
                        return records

        return records

    @staticmethod
    def _sg_to_crystal_system(sg: str) -> CrystalSystem:
        """Map a space group symbol to crystal system."""
        sg_upper = sg.upper() if sg else ""
        if any(s in sg_upper for s in ["F", "I", "P23", "P43", "P213"]):
            return CrystalSystem.CUBIC
        if any(s in sg_upper for s in ["P6", "P63"]):
            return CrystalSystem.HEXAGONAL
        if any(s in sg_upper for s in ["P4", "I4"]):
            return CrystalSystem.TETRAGONAL
        if any(s in sg_upper for s in ["R3", "P3"]):
            return CrystalSystem.TRIGONAL
        if any(s in sg_upper for s in ["P222", "C222", "F222", "I222"]):
            return CrystalSystem.ORTHORHOMBIC
        if any(s in sg_upper for s in ["P21", "C2", "P2/"]):
            return CrystalSystem.MONOCLINIC
        if any(s in sg_upper for s in ["P1"]):
            return CrystalSystem.TRICLINIC
        return CrystalSystem.CUBIC

    async def search(
        self,
        query: str,
        filters: Dict[str, Any],
        limit: int,
        offset: int,
    ) -> List[MaterialRecord]:
        """Search COD database via REST API."""
        await asyncio.to_thread(self._rate_limit)

        params = self._build_search_params(query, filters, limit + offset)

        try:
            logger.info(f"COD search: query={query}, params={params}")

            def _do_request():
                return self._session.get(
                    self.SEARCH_URL,
                    params=params,
                    timeout=10,
                )

            resp = await asyncio.to_thread(_do_request)
            resp.raise_for_status()
            data = resp.json()
            all_records = self._parse_search_results(data, limit + offset)
            return all_records[offset : offset + limit]
        except http_requests.exceptions.RequestException as exc:
            logger.error(f"COD search failed: {exc}")
            self._availability_cache = False
            return []
        except Exception as exc:
            logger.error(f"COD search parse error: {exc}")
            self._availability_cache = False
            return []

    async def get_by_id(self, provider_id: str) -> Optional[MaterialRecord]:
        """Get specific COD entry by ID."""
        self._rate_limit()

        try:
            # COD doesn't have a single-entry JSON endpoint, but we can
            # search by exact ID. We'll return minimal record; CIF download
            # handled by CIFCache.
            return MaterialRecord(
                name=f"COD {provider_id}",
                formula="",
                source_provider=self.name,
                source_id=provider_id,
                source_url=f"{self._api_base}/{provider_id}.html",
                metadata={
                    "cod_id": provider_id,
                    "needs_cif_download": True,
                },
            )
        except Exception as exc:
            logger.error(f"COD get_by_id failed: {exc}")
            return None

    async def get_diffraction_pattern(
        self,
        provider_id: str,
        wavelength: Optional[float] = None,
    ) -> Optional[Dict[str, Any]]:
        """Get diffraction pattern — delegates to TheoreticalPatternGenerator via ReferenceEngine.

        This provider does NOT generate patterns itself. The ReferenceEngine
        coordinates CIF download → pattern generation.
        """
        return None

    def download_cif(self, cod_id: str) -> Optional[str]:
        """Download raw CIF content from COD. Called by CIFCache."""
        self._rate_limit()

        # Check local cache and data directories first as offline fallback
        import os
        cache_dirs = ["data/cif_cache", "backend/reference/data"]
        for d in cache_dirs:
            for filename in [f"{cod_id}.cif", f"COD_{cod_id}.cif"]:
                p = os.path.join(d, filename)
                if os.path.exists(p):
                    try:
                        with open(p, "r", encoding="utf-8") as f:
                            logger.info(f"Loaded CIF {cod_id} from offline fallback {p}")
                            return f.read()
                    except Exception as e:
                        logger.warning(f"Failed to read offline CIF at {p}: {e}")

        url = self.CIF_URL_TEMPLATE.format(cod_id=cod_id)
        try:
            logger.info(f"Downloading CIF: {url}")
            resp = self._session.get(url, timeout=10)
            resp.raise_for_status()
            return resp.text
        except http_requests.exceptions.RequestException as exc:
            logger.error(f"CIF download failed for {cod_id}: {exc}")
            self._availability_cache = False
            return None
        except Exception as exc:
            logger.error(f"CIF download error for {cod_id}: {exc}")
            self._availability_cache = False
            return None

    async def download_cif_async(self, cod_id: str) -> Optional[str]:
        """Async wrapper for download_cif to avoid blocking the event loop."""
        return await asyncio.to_thread(self.download_cif, cod_id)
