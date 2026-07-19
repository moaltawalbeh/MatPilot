"""Local COD Reference Provider.

Uses a local subset of real crystallographic data from COD.
No network access required. Always available.
"""

import json
import os
from typing import List, Dict, Any, Optional

from backend.reference.interfaces.reference_provider import IReferenceProvider
from backend.domain.entities.material_record import MaterialRecord
from backend.domain.value_objects.crystal_system import CrystalSystem

CRYSTAL_SYSTEM_MAP = {
    "Cubic": CrystalSystem.CUBIC,
    "Hexagonal": CrystalSystem.HEXAGONAL,
    "Tetragonal": CrystalSystem.TETRAGONAL,
    "Trigonal": CrystalSystem.TRIGONAL,
    "Orthorhombic": CrystalSystem.ORTHORHOMBIC,
    "Monoclinic": CrystalSystem.MONOCLINIC,
    "Triclinic": CrystalSystem.TRICLINIC,
}


class LocalCODProvider(IReferenceProvider):
    """
    Local COD Reference Provider.

    Loads real diffraction peak data from a bundled JSON file.
    Contains 50+ common crystalline materials with real 2-theta positions
    calculated for Cu K-alpha radiation (lambda = 1.5406 A).

    This provider is ALWAYS available (no network required).
    """

    def __init__(self):
        self._version = "1.0.0"
        self._data: Optional[List[Dict[str, Any]]] = None
        self._peaks_index: Dict[str, List[float]] = {}

    def _load_data(self):
        if self._data is not None:
            return

        data_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "data",
            "cod_reference_db.json"
        )

        if not os.path.exists(data_path):
            self._data = []
            return

        with open(data_path, "r", encoding="utf-8") as f:
            raw = json.load(f)

        self._data = raw.get("materials", [])

        for mat in self._data:
            peaks = [p["two_theta"] for p in mat.get("peaks", [])]
            self._peaks_index[mat["id"]] = peaks

    @property
    def name(self) -> str:
        return "LocalCOD"

    @property
    def display_name(self) -> str:
        return "Local COD Subset"

    @property
    def description(self) -> str:
        return "Local subset of Crystallography Open Database. 50+ common materials with real diffraction peaks."

    def is_available(self) -> bool:
        return True

    def supported_features(self) -> List[str]:
        return [
            "formula_search",
            "element_search",
            "diffraction_pattern",
            "peak_list",
        ]

    def version(self) -> Optional[str]:
        return self._version

    async def search(
        self,
        query: str,
        filters: Dict[str, Any],
        limit: int,
        offset: int
    ) -> List[MaterialRecord]:
        self._load_data()

        query_lower = query.lower().strip()
        if not query_lower:
            return []

        results = []
        for mat in self._data:
            if self._matches_query(mat, query_lower, filters):
                cs = mat.get("crystal_system", "")
                lp = mat.get("lattice_parameters", {})
                results.append(MaterialRecord(
                    name=mat["name"],
                    formula=mat["formula"],
                    source_provider=self.name,
                    source_id=mat["id"],
                    crystal_system=CRYSTAL_SYSTEM_MAP.get(cs, CrystalSystem.CUBIC),
                    lattice_parameters=None,
                    metadata={
                        "space_group": mat.get("space_group", ""),
                        "lattice_parameters": lp,
                        "peaks": mat.get("peaks", []),
                        "source": mat.get("source", ""),
                    }
                ))

        return results[offset:offset + limit]

    async def get_by_id(self, provider_id: str) -> Optional[MaterialRecord]:
        self._load_data()

        for mat in self._data:
            if mat["id"] == provider_id:
                cs = mat.get("crystal_system", "")
                return MaterialRecord(
                    name=mat["name"],
                    formula=mat["formula"],
                    source_provider=self.name,
                    source_id=mat["id"],
                    crystal_system=CRYSTAL_SYSTEM_MAP.get(cs, CrystalSystem.CUBIC),
                    lattice_parameters=None,
                    metadata={
                        "space_group": mat.get("space_group", ""),
                        "lattice_parameters": mat.get("lattice_parameters", {}),
                        "peaks": mat.get("peaks", []),
                    }
                )
        return None

    async def get_diffraction_pattern(
        self,
        provider_id: str,
        wavelength: Optional[float] = None
    ) -> Optional[Dict[str, Any]]:
        self._load_data()

        for mat in self._data:
            if mat["id"] == provider_id:
                peaks = mat.get("peaks", [])
                return {
                    "two_theta": [p["two_theta"] for p in peaks],
                    "intensity": [p["intensity"] for p in peaks],
                    "hkl": [p.get("hkl", "") for p in peaks],
                    "d_spacing": [p.get("d_spacing", 0) for p in peaks],
                }
        return None

    def get_all_reference_entries(self) -> List[Dict[str, Any]]:
        """Return all materials in a format usable by the phase identifier."""
        self._load_data()

        entries = []
        for mat in self._data:
            peaks = [p["two_theta"] for p in mat.get("peaks", [])]
            if peaks:
                entries.append({
                    "material_name": mat["name"],
                    "material_formula": mat["formula"],
                    "source_provider": self.name,
                    "source_id": mat["id"],
                    "peaks": peaks,
                    "peak_details": mat.get("peaks", []),
                    "space_group": mat.get("space_group", ""),
                    "crystal_system": mat.get("crystal_system", ""),
                })
        return entries

    def get_pattern_for_overlay(self, provider_id: str) -> Optional[List[Dict[str, Any]]]:
        """Get peak list formatted for chart overlay."""
        self._load_data()

        for mat in self._data:
            if mat["id"] == provider_id:
                return mat.get("peaks", [])
        return None

    def _matches_query(self, mat: Dict[str, Any], query: str, filters: Dict[str, Any]) -> bool:
        formula = mat.get("formula", "")
        formula_lower = formula.lower()
        name = mat.get("name", "").lower()
        elements_in_formula = self._extract_elements(formula)

        if query.lower() in formula_lower or query.lower() in name:
            if self._matches_filters(mat, filters):
                return True

        for elem in elements_in_formula:
            if query.lower() in elem.lower():
                if self._matches_filters(mat, filters):
                    return True

        return False

    def _matches_filters(self, mat: Dict[str, Any], filters: Dict[str, Any]) -> bool:
        if not filters:
            return True

        cs_filter = filters.get("crystal_system")
        if cs_filter and mat.get("crystal_system", "").lower() != cs_filter.lower():
            return False

        elements_filter = filters.get("elements")
        if elements_filter:
            formula = mat.get("formula", "").lower()
            for elem in elements_filter:
                if elem.lower() not in formula:
                    return False

        return True

    def _extract_elements(self, formula: str) -> List[str]:
        import re
        elements = re.findall(r'([A-Z][a-z]?)', formula)
        return list(set(elements))
