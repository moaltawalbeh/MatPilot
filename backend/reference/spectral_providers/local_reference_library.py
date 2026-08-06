"""Built-in spectral reference library (offline).

Guarantees library search and spectral matching work even with no network by
serving curated characteristic bands for common polymers, minerals and
materials. Live providers (Open Specy, Ramanbase, ...) layer on top of this
same :class:`ISpectralProvider` contract and are tried first.

FTIR entries are polymer / functional-group fingerprints; Raman entries reuse
the ``RAMAN_REFERENCE`` table from the Raman analysis engine.
"""

from typing import Any, Dict, List, Optional, Tuple

from backend.reference.spectral_providers.interfaces import (
    ISpectralProvider,
    SpectralMatch,
    SpectralReference,
)
from backend.services.instrument_analysis import RAMAN_REFERENCE

# name, formula, category, [(band, intensity, assignment), ...]
FTIR_REFERENCE: List[Tuple[str, str, str, List[Tuple[float, float, str]]]] = [
    ("Polystyrene", "PS", "polymer", [(3026.0, 0.35, "aromatic C-H stretch"), (2922.0, 0.5, "C-H stretch"), (1601.0, 0.5, "aromatic C=C"), (1493.0, 0.7, "ring stretch"), (1452.0, 0.7, "CH2 bend"), (756.0, 0.8, "mono-substituted ring")]),
    ("Polyethylene", "PE", "polymer", [(2920.0, 1.0, "asym CH2 stretch"), (2851.0, 0.9, "sym CH2 stretch"), (1471.0, 0.6, "CH2 scissor"), (1463.0, 0.6, "CH2 bend"), (730.0, 0.7, "CH2 rock"), (719.0, 0.7, "CH2 rock")]),
    ("Polypropylene", "PP", "polymer", [(2950.0, 1.0, "asym CH3 stretch"), (2920.0, 0.9, "asym CH2 stretch"), (1455.0, 0.6, "CH2 bend"), (1377.0, 0.6, "sym CH3 bend"), (1167.0, 0.5, "C-C stretch"), (998.0, 0.4, "CH3 rock")]),
    ("PET", "PET", "polymer", [(2968.0, 0.4, "aromatic C-H"), (1715.0, 0.9, "C=O ester"), (1454.0, 0.3, "CH2 bend"), (1340.0, 0.4, "C-O"), (1245.0, 0.9, "C-O stretch"), (1098.0, 0.7, "C-O-C"), (1018.0, 0.5, "ring C-C"), (724.0, 0.5, "CH2 rock")]),
    ("PMMA", "PMMA", "polymer", [(2995.0, 0.4, "C-H stretch"), (2950.0, 0.6, "C-H stretch"), (1729.0, 1.0, "C=O ester"), (1450.0, 0.5, "CH2 bend"), (1388.0, 0.4, "CH3 bend"), (1241.0, 0.6, "C-O stretch"), (1192.0, 0.6, "C-O stretch"), (1148.0, 0.7, "C-O-C")]),
    ("Nylon-6", "PA6", "polymer", [(3300.0, 0.8, "N-H stretch"), (2934.0, 0.6, "asym CH2"), (2862.0, 0.5, "sym CH2"), (1640.0, 1.0, "amide I C=O"), (1545.0, 0.9, "amide II N-H"), (1264.0, 0.5, "amide III"), (1200.0, 0.4, "C-N")]),
    ("Polycarbonate", "PC", "polymer", [(2968.0, 0.5, "CH3 stretch"), (1770.0, 0.9, "C=O carbonate"), (1504.0, 0.7, "aromatic C=C"), (1221.0, 1.0, "C-O stretch"), (1163.0, 0.8, "C-O-C"), (1014.0, 0.6, "aromatic C-H"), (828.0, 0.6, "aromatic ring")]),
    ("Silicone (PDMS)", "PDMS", "polymer", [(2962.0, 0.6, "CH3 stretch"), (1412.0, 0.3, "Si-CH3"), (1259.0, 0.7, "Si-CH3 sym bend"), (1093.0, 1.0, "Si-O-Si stretch"), (1020.0, 0.8, "Si-O-Si stretch"), (800.0, 0.7, "Si-CH3 rock")]),
    ("Nitrile rubber (NBR)", "NBR", "polymer", [(2918.0, 0.9, "CH2 stretch"), (2237.0, 0.4, "C=N nitrile"), (1596.0, 0.5, "C=C"), (1446.0, 0.6, "CH2 bend"), (966.0, 0.5, "C-H out of plane")]),
    ("Polyvinyl chloride", "PVC", "polymer", [(2965.0, 0.4, "C-H stretch"), (1427.0, 0.5, "CH2 bend"), (1330.0, 0.4, "CH bend"), (1254.0, 0.6, "C-H wag"), (1096.0, 0.4, "C-C stretch"), (616.0, 0.7, "C-Cl stretch")]),
    ("Starch", "C6H10O5", "biopolymer", [(3320.0, 1.0, "O-H stretch"), (2930.0, 0.5, "C-H stretch"), (1150.0, 0.7, "C-O-C"), (1080.0, 0.8, "C-O stretch"), (1020.0, 0.9, "C-O stretch"), (930.0, 0.5, "alpha-1,4 glycosidic")]),
    ("Cellulose", "C6H10O5", "biopolymer", [(3330.0, 1.0, "O-H stretch"), (2890.0, 0.5, "C-H stretch"), (1160.0, 0.6, "C-O-C"), (1108.0, 0.7, "C-O"), (1055.0, 0.8, "C-O stretch"), (1030.0, 0.8, "C-O stretch")]),
    ("Water", "H2O", "inorganic", [(3400.0, 1.0, "O-H stretch"), (1640.0, 0.4, "H-O-H bend")]),
    ("Silicon dioxide (silica)", "SiO2", "inorganic", [(1095.0, 1.0, "Si-O-Si asym stretch"), (800.0, 0.5, "Si-O-Si sym stretch"), (464.0, 0.6, "Si-O-Si bend")]),
    ("Titanium dioxide (anatase)", "TiO2", "inorganic", [(820.0, 0.5, "Ti-O stretch"), (600.0, 0.6, "Ti-O-Ti"), (450.0, 0.8, "Ti-O bend")]),
    ("Zinc oxide", "ZnO", "inorganic", [(1100.0, 0.4, "Zn-O"), (900.0, 0.5, "Zn-O"), (600.0, 0.6, "Zn-O")]),
    ("Calcium carbonate", "CaCO3", "mineral", [(1417.0, 1.0, "CO3 asym stretch"), (873.0, 0.7, "CO3 out-of-plane bend"), (712.0, 0.5, "CO3 in-plane bend")]),
    ("Sodium chloride", "NaCl", "inorganic", [(1640.0, 0.4, "surface water"), (1100.0, 0.3, "impurity")]),
]

LOCAL_FTIR_INDEX: Dict[str, Tuple[str, str, str, List[Tuple[float, float, str]]]] = {
    entry[0].lower(): entry for entry in FTIR_REFERENCE
}

LOCAL_RAMAN_INDEX: Dict[str, Tuple[str, str, List[float]]] = {
    name.lower(): (name, formula, shifts) for name, formula, shifts in RAMAN_REFERENCE
}


def _peak_correlation_score(
    query_positions: List[float],
    reference_positions: List[float],
    tolerance: float,
) -> Tuple[float, List[Dict[str, Any]]]:
    """Fraction of reference bands reproduced by the query within `tolerance`."""
    matched: List[Dict[str, Any]] = []
    for ref in reference_positions:
        hits = [q for q in query_positions if abs(q - ref) <= tolerance]
        if hits:
            matched.append(
                {"reference": float(ref), "detected": float(min(hits, key=lambda h: abs(h - ref)))}
            )
    if not reference_positions:
        return 0.0, []
    return len(matched) / len(reference_positions), matched


class LocalSpectralLibraryProvider(ISpectralProvider):
    """Offline curated library of FTIR fingerprints and Raman band sets."""

    def __init__(self, tolerance: float = 12.0):
        self._tolerance = tolerance
        self._availability = True

    @property
    def name(self) -> str:
        return "LocalSpectralLibrary"

    @property
    def display_name(self) -> str:
        return "Built-in Reference Library"

    @property
    def description(self) -> str:
        return (
            "Curated offline library of FTIR functional-group fingerprints and "
            "Raman characteristic band sets for common materials."
        )

    def is_available(self) -> bool:
        return self._availability

    def supported_features(self) -> List[str]:
        return ["library_search", "peak_matching"]

    def version(self) -> Optional[str]:
        return "1.0.0"

    def supported_techniques(self) -> List[str]:
        return ["ftir", "raman"]

    def _ftir_reference(self, entry) -> SpectralReference:
        name, formula, category, bands = entry
        return SpectralReference(
            reference_id=f"local-ftir-{name.lower().replace(' ', '-').replace('(', '').replace(')', '')}",
            title=name,
            technique="ftir",
            category=category,
            formula=formula,
            x_axis="wavenumber",
            peaks=[
                {"position": b, "intensity": i, "assignment": a} for b, i, a in bands
            ],
            x=[b for b, _, _ in bands],
            y=[i for _, i, _ in bands],
            source=self.display_name,
            license="MIT",
        )

    def _raman_reference(self, entry) -> SpectralReference:
        name, formula, shifts = entry
        return SpectralReference(
            reference_id=f"local-raman-{name.lower().replace(' ', '-').replace('(', '').replace(')', '')}",
            title=name,
            technique="raman",
            category="mineral" if len(formula) <= 6 else "material",
            formula=formula,
            x_axis="raman_shift",
            peaks=[{"position": float(s), "intensity": 0.5, "assignment": ""} for s in shifts],
            x=[float(s) for s in shifts],
            y=[0.5] * len(shifts),
            source=self.display_name,
            license="MIT",
        )

    def _references(self, technique: Optional[str]) -> List[SpectralReference]:
        refs: List[SpectralReference] = []
        if technique in (None, "ftir"):
            refs += [self._ftir_reference(e) for e in FTIR_REFERENCE]
        if technique in (None, "raman"):
            refs += [self._raman_reference(e) for e in RAMAN_REFERENCE]
        return refs

    async def search(
        self,
        query: str,
        limit: int = 20,
        technique: Optional[str] = None,
    ) -> List[SpectralReference]:
        q = (query or "").strip().lower()
        if not q:
            return self._references(technique)[:limit]
        results = []
        for ref in self._references(technique):
            if q in ref.title.lower() or q in (ref.formula or "").lower() or q in (ref.category or "").lower():
                results.append(ref)
            if len(results) >= limit:
                break
        return results

    async def get_reference(self, reference_id: str) -> Optional[SpectralReference]:
        for ref in self._references(None):
            if ref.reference_id == reference_id:
                return ref
        return None

    async def match_spectrum(
        self,
        x: List[float],
        y: List[float],
        limit: int = 10,
        technique: Optional[str] = None,
    ) -> List[SpectralMatch]:
        if technique not in ("ftir", "raman"):
            return []
        # Reduce the query to its salient band positions (simple prominence scan
        # on the raw curve without importing scipy's find_peaks here).
        from backend.services.instrument_analysis import _find_peaks

        x_arr = [float(v) for v in x]
        y_arr = [float(v) for v in y]
        if not x_arr or len(x_arr) != len(y_arr):
            return []
        span = max(y_arr) - min(y_arr) if y_arr else 1.0
        prominence = max(0.02 * span, 1e-9)
        import numpy as np

        idx, _ = _find_peaks(
            np.asarray(y_arr, dtype=float),
            prominence,
            min_distance=2,
        )
        query_positions = [float(x_arr[int(i)]) for i in idx]
        if not query_positions:
            return []

        tolerance = self._tolerance
        matches: List[SpectralMatch] = []
        for ref in self._references(technique):
            ref_positions = [float(p["position"]) for p in (ref.peaks or [])]
            if not ref_positions:
                continue
            coverage, matched = _peak_correlation_score(query_positions, ref_positions, tolerance)
            score = coverage * 100.0
            if score <= 0:
                continue
            matches.append(
                SpectralMatch(
                    reference=ref,
                    score=score,
                    algorithm="band-coincidence",
                    details={
                        "matched_bands": matched,
                        "query_band_count": len(query_positions),
                        "reference_band_count": len(ref_positions),
                        "tolerance_cm": tolerance,
                    },
                )
            )
        matches.sort(key=lambda m: m.score, reverse=True)
        return matches[:limit]
