"""Pattern Similarity Engine.

Compares experimental XRD patterns against theoretical/reference patterns
and computes multiple similarity metrics for robust phase identification.

Scoring follows the validated research methodology (docs/research_phase_id.md):

- Peak assignment is STRICTLY one-to-one: each experimental peak supports at
  most one reference reflection and each reference reflection is used at most
  once. Optimal assignment uses the Hungarian algorithm
  (``scipy.optimize.linear_sum_assignment``); a strict greedy one-to-one
  fallback is used if scipy is unavailable. This prevents score inflation.
- Position is primary: composite score = 0.60*position + 0.25*coverage
  + 0.15*intensity (research doc Topic 5).
- Figure-of-merit values are actually computed and returned:
    Smith-Snyder F_N = (1/|Delta-2theta-mean|) * (N / N_poss)
    de Wolff M20    = Q20 / (2 * epsbar * N20)
  using the search-match interpretation described in research doc 1.1/2.1.
- Counter-evidence is reported, not hidden: unexplained experimental peaks,
  missing reference peaks, per-pair residuals and the global shift.
- ICDD quality marks annotate/reweight candidate confidence (research doc
  Topic 6); duplicate phase candidates are removed by canonical identity.
"""

import math
import logging
import re
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field

from backend.domain.value_objects.wavelength import Wavelength, RadiationType

logger = logging.getLogger("similarity_engine")

# Canonical NIST Cu K-alpha (weighted average) wavelength, via value object.
DEFAULT_WAVELENGTH = Wavelength.from_radiation_type(
    RadiationType.Cu_K_ALPHA_AVG
).value_angstrom

# ICDD quality-mark tiers (research doc 6.2): star/G > I/C/P/M > B/O > H.
# Missing/blank marks map to a neutral 0.5 (never hard-excluded).
ICDD_QUALITY_PRIORS = {
    "*": 1.0,
    "S": 0.85,   # 'S/I' filter convention (ICDD data-quality guidance)
    "G": 0.85,
    "I": 0.6,
    "C": 0.6,
    "P": 0.6,
    "M": 0.6,
    "B": 0.4,
    "O": 0.4,
    "H": 0.2,
}

# Cost assigned to pairs outside the matching tolerance so the Hungarian
# solver avoids them; such pairs are dropped after assignment.
_MATCH_PENALTY = 1e3

# Sentinel returned for M20 when the mean Q residual is exactly zero.
_PERFECT_FOM = 999.0

# Fraction of the composite kept when reweighting by reference quality:
# final = raw * (alpha + (1-alpha) * q_ref).
_QUALITY_ALPHA = 0.75


def _two_theta_to_d(two_theta: float, wavelength: float) -> float:
    """Convert 2-theta (degrees) to d-spacing via Bragg's law."""
    theta_rad = math.radians(two_theta / 2.0)
    sin_theta = math.sin(theta_rad)
    if sin_theta <= 0:
        return 0.0
    return wavelength / (2.0 * sin_theta)


def canonical_formula(formula: str) -> str:
    """Canonical (Hill-ordered, element-sorted) chemical formula.

    Used for duplicate-phase detection: 'SiO2', 'Si O2' and 'O2Si' all
    normalize to 'O2Si'.
    """
    if not formula:
        return ""
    counts: Dict[str, float] = {}
    for elem, cnt in re.findall(r"([A-Z][a-z]?)(\d*\.?\d*)", formula):
        if not elem:
            continue
        counts[elem] = counts.get(elem, 0.0) + (float(cnt) if cnt else 1.0)
    if not counts:
        return formula.strip()

    def _sort_key(elem: str) -> Tuple[int, str]:
        if elem == "C":
            return (0, elem)
        if elem == "H":
            return (1, elem)
        return (2, elem)

    parts = []
    for elem in sorted(counts, key=_sort_key):
        count = counts[elem]
        parts.append(elem)
        if count != 1:
            parts.append(str(int(count) if float(count).is_integer() else count))
    return "".join(parts)


def _norm_identity(value: str) -> str:
    """Normalize a space-group / crystal-system token for identity keys."""
    return re.sub(r"[\s()\-/]", "", (value or "").lower())


def phase_identity_key(formula: str, crystal_system: str, space_group: str) -> Tuple[str, str, str]:
    """Canonical duplicate-phase identity (formula + crystal system + space group)."""
    return (
        canonical_formula(formula),
        _norm_identity(crystal_system),
        _norm_identity(space_group),
    )


def reference_quality_prior(quality_mark: str) -> float:
    """Map an ICDD quality mark to a numeric reference-quality prior.

    Tiers (research doc 6.2): high = star/G, medium = I/C/P/M, low = B/O,
    hypothetical = H. Unknown/blank marks return a neutral 0.5.
    """
    if not quality_mark:
        return 0.5
    mark = quality_mark.strip().upper()
    if mark.startswith("STAR"):
        return ICDD_QUALITY_PRIORS["*"]
    return ICDD_QUALITY_PRIORS.get(mark, 0.5)


def cif_structural_quality_score(cif_data: Optional[Dict[str, Any]]) -> float:
    """Structural-quality sub-score for CIF entries lacking an ICDD mark.

    Uses standard model-quality fields when present (research doc 6.1):
    R_gt, wR_ref, GoF, shift/su_max and resolution (theta_max). Mild
    penalties are applied for missing fields; a neutral 0.5 is returned
    when nothing is available (entries are never hard-excluded).
    """
    if not cif_data:
        return 0.5
    fields = {
        "r": cif_data.get("R_factor_gt", cif_data.get("_refine_ls_R_factor_gt")),
        "wr": cif_data.get("wR_factor_ref", cif_data.get("_refine_ls_wR_factor_ref")),
        "gof": cif_data.get("goodness_of_fit_ref", cif_data.get("_refine_ls_goodness_of_fit_ref")),
        "shift": cif_data.get("shift_over_su_max", cif_data.get("_refine_ls_shift_over_su_max")),
        "theta_max": cif_data.get("theta_max", cif_data.get("_diffrn_reflns_theta_max")),
    }
    present = {k: v for k, v in fields.items() if v is not None and v != ""}
    if not present:
        return 0.5

    def _to_float(value: Any) -> Optional[float]:
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    score = 0.5
    r = _to_float(present.get("r"))
    if r is not None and r <= 0.05:
        score += 0.2
    wr = _to_float(present.get("wr"))
    if wr is not None and wr <= 0.10:
        score += 0.1
    gof = _to_float(present.get("gof"))
    if gof is not None and 1.0 <= gof <= 2.5:
        score += 0.1
    shift = _to_float(present.get("shift"))
    if shift is not None and shift < 0.2:
        score += 0.05
    theta_max = _to_float(present.get("theta_max"))
    if theta_max is not None and theta_max >= 60.0:
        score += 0.05
    return round(min(1.0, max(0.0, score)), 3)


@dataclass
class SimilarityResult:
    """Result of comparing two diffraction patterns."""
    material_name: str = ""
    material_formula: str = ""
    source_id: str = ""
    source_provider: str = ""

    # Core similarity metrics
    fom: float = 0.0  # Figure of Merit: Smith-Snyder F_N (higher is better)
    rmse_2theta: float = 0.0  # RMSE of matched peak positions
    cosine_similarity: float = 0.0  # Intensity pattern similarity (log-compressed)
    match_score: float = 0.0  # Combined score (0-1, higher is better)

    # Peak matching details
    matched_peaks: int = 0
    total_experimental_peaks: int = 0
    total_reference_peaks: int = 0
    peak_fraction: float = 0.0  # matched / total_reference

    # Smith-Snyder F_N components
    f_n: float = 0.0
    f_n_mean_delta: float = 0.0
    f_n_n_poss: int = 0

    # de Wolff M20 components
    m20: float = 0.0
    m20_epsbar: float = 0.0
    m20_n_q: int = 0

    # Position residuals
    mae_2theta: float = 0.0
    max_delta_2theta: float = 0.0
    global_shift: float = 0.0

    # Counter-evidence (research doc 3.2)
    n_unexplained_exp: int = 0
    n_missing_ref: int = 0

    # Individual peak correspondences
    correspondences: List[Dict[str, Any]] = field(default_factory=list)

    # Metadata
    confidence: str = "Low"
    confidence_value: float = 0.0
    match_explanation: str = ""
    d_spacing_range: Tuple[float, float] = (0.0, 0.0)

    # Reference identity / quality (research doc Topic 6)
    crystal_system: str = ""
    space_group: str = ""
    quality_mark: str = ""
    quality_prior: float = 0.0
    raw_match_score: float = 0.0

    # Theoretical pattern for overlay
    theoretical_peaks: List[Dict[str, Any]] = field(default_factory=list)


class SimilarityEngine:
    """
    Compare experimental XRD patterns against reference/theoretical patterns.

    Uses multiple metrics:
    1. Strict one-to-one position matching (2-theta tolerance)
    2. Figure of Merit (Smith-Snyder F_N) and de Wolff M20
    3. Cosine similarity of log-compressed intensity patterns
    4. d-spacing comparison

    Combined score weights: position 60%, coverage 25%, intensity 15%
    """

    def __init__(self, tolerance_deg: float = 0.3, wavelength: float = DEFAULT_WAVELENGTH):
        self._tolerance_deg = tolerance_deg
        self._wavelength = wavelength

    def compare_patterns(
        self,
        experimental_peaks: List[Dict[str, Any]],
        reference_peaks: List[Dict[str, Any]],
        material_name: str = "",
        material_formula: str = "",
        source_id: str = "",
        source_provider: str = "",
        crystal_system: str = "",
        space_group: str = "",
        quality_mark: str = "",
        cif_data: Optional[Dict[str, Any]] = None,
    ) -> SimilarityResult:
        """
        Compare experimental pattern against reference pattern.

        Args:
            experimental_peaks: List of dicts with 'two_theta', 'intensity'
            reference_peaks: List of dicts with 'two_theta', 'intensity', 'd_spacing', 'hkl'
            material_name: Name for result metadata
            material_formula: Formula for result metadata
            source_id: Source identifier
            source_provider: Source provider name
            crystal_system: Crystal system for candidate identity/dedupe
            space_group: Space group for candidate identity/dedupe
            quality_mark: ICDD quality mark (star/G/I/C/P/M/B/O/H) if known
            cif_data: Parsed CIF metadata for structural-quality scoring

        Returns:
            SimilarityResult with all metrics
        """
        result = SimilarityResult(
            material_name=material_name,
            material_formula=material_formula,
            source_id=source_id,
            source_provider=source_provider,
            crystal_system=crystal_system,
            space_group=space_group,
            quality_mark=quality_mark or "",
            total_experimental_peaks=len(experimental_peaks),
            total_reference_peaks=len(reference_peaks),
            theoretical_peaks=reference_peaks,
        )

        if not experimental_peaks or not reference_peaks:
            return result

        # Extract 2-theta positions
        exp_2theta = sorted([p["two_theta"] for p in experimental_peaks])
        ref_2theta = sorted([p["two_theta"] for p in reference_peaks])

        # 1. Strict one-to-one peak position matching (Hungarian / greedy fallback)
        correspondences, matched_count = self._match_peaks(exp_2theta, ref_2theta)
        result.correspondences = correspondences
        result.matched_peaks = matched_count
        result.peak_fraction = matched_count / max(len(ref_2theta), 1)

        # 2. Smith-Snyder F_N (primary ranking FOM)
        result.f_n, result.f_n_mean_delta, result.f_n_n_poss = self._calculate_f_n(
            correspondences, exp_2theta, ref_2theta
        )
        result.fom = result.f_n

        # 3. de Wolff M20
        result.m20, result.m20_epsbar, result.m20_n_q = self._calculate_m20(
            correspondences, self._wavelength, ref_2theta
        )

        # 4. Position residuals (RMSE / MAE / max deviation / global shift)
        result.rmse_2theta = self._calculate_rmse(correspondences)
        result.mae_2theta, result.max_delta_2theta = self._calculate_position_errors(
            correspondences
        )
        result.global_shift = self._global_shift(correspondences)

        # 5. Counter-evidence
        result.n_unexplained_exp = len(exp_2theta) - matched_count
        result.n_missing_ref = len(ref_2theta) - matched_count

        # 6. Cosine similarity of (log-compressed) intensity vectors
        result.cosine_similarity = self._cosine_similarity(
            experimental_peaks, reference_peaks, correspondences
        )

        # 7. Combined match score
        result.match_score = self._combined_score(result)
        result.raw_match_score = result.match_score

        # 8. Reference-quality annotation / reweighting (ICDD marks, CIF metrics)
        result.quality_mark = quality_mark or result.quality_mark
        if quality_mark:
            result.quality_prior = reference_quality_prior(quality_mark)
            result.match_score = round(
                min(1.0, result.match_score * (
                    _QUALITY_ALPHA + (1.0 - _QUALITY_ALPHA) * result.quality_prior
                )),
                4,
            )
        elif cif_data is not None:
            result.quality_prior = cif_structural_quality_score(cif_data)
        else:
            result.quality_prior = 0.5

        # 9. Confidence value and assignment
        if result.matched_peaks > 0:
            result.confidence_value = self._confidence_value(result)
        else:
            result.confidence_value = 0.0
        result.confidence = self._assign_confidence(result)

        # 10. Explanation details
        result.match_explanation = (
            f"Match Score ({result.match_score:.1%}) is computed as: "
            f"60% Peak Position quality (RMSE={result.rmse_2theta:.3f} deg), "
            f"25% Coverage ({result.matched_peaks}/{result.total_reference_peaks} reference peaks matched), "
            f"15% Cosine Intensity Similarity ({result.cosine_similarity:.2%}). "
            f"F_N (Smith-Snyder)={result.f_n:.2f}, M20 (de Wolff)={result.m20:.2f}. "
            f"Counter-evidence: {result.n_unexplained_exp} unexplained experimental, "
            f"{result.n_missing_ref} missing reference peaks. "
            f"Confidence ({result.confidence_value:.1%}) from physical components: "
            f"0.60*(1-RMSE/tol) + 0.25*coverage + 0.15*intensity."
        )

        # d-spacing range
        ref_d = [p.get("d_spacing", 0) for p in reference_peaks if p.get("d_spacing", 0) > 0]
        if ref_d:
            result.d_spacing_range = (min(ref_d), max(ref_d))

        return result

    def _match_peaks(
        self,
        exp_2theta: List[float],
        ref_2theta: List[float],
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Strict one-to-one peak matching.

        Optimal assignment via the Hungarian algorithm
        (``scipy.optimize.linear_sum_assignment``) on a cost matrix where
        out-of-tolerance pairs carry a large penalty. Each experimental peak
        supports at most one reference reflection and vice versa. Falls back
        to a strict greedy one-to-one assignment if scipy is unavailable.
        """
        correspondences: List[Dict[str, Any]] = []
        if not exp_2theta or not ref_2theta:
            return correspondences, 0

        n_ref = len(ref_2theta)
        n_exp = len(exp_2theta)

        cost = np.full((n_ref, n_exp), _MATCH_PENALTY, dtype=float)
        for i, ref_pos in enumerate(ref_2theta):
            for j, exp_pos in enumerate(exp_2theta):
                dev = abs(exp_pos - ref_pos)
                if dev <= self._tolerance_deg:
                    cost[i, j] = dev

        try:
            from scipy.optimize import linear_sum_assignment
            row_idx, col_idx = linear_sum_assignment(cost)
        except ImportError:
            row_idx, col_idx = self._greedy_strict_match(cost)

        for i, j in zip(row_idx, col_idx):
            dev = abs(exp_2theta[j] - ref_2theta[i])
            if dev <= self._tolerance_deg:
                correspondences.append({
                    "experimental_2theta": exp_2theta[j],
                    "reference_2theta": ref_2theta[i],
                    "deviation": round(dev, 4),
                })

        return correspondences, len(correspondences)

    def _greedy_strict_match(
        self, cost: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Strict greedy one-to-one fallback (never reuses a peak on either side)."""
        n_ref, n_exp = cost.shape
        rows: List[int] = []
        cols: List[int] = []
        used_exp = set()
        for i in range(n_ref):
            best_j = -1
            best_cost = _MATCH_PENALTY
            for j in range(n_exp):
                if j in used_exp:
                    continue
                if cost[i, j] < best_cost:
                    best_cost = cost[i, j]
                    best_j = j
            if best_j >= 0:
                used_exp.add(best_j)
                rows.append(i)
                cols.append(best_j)
        return np.array(rows, dtype=int), np.array(cols, dtype=int)

    def _calculate_f_n(
        self,
        correspondences: List[Dict[str, Any]],
        exp_2theta: List[float],
        ref_2theta: List[float],
    ) -> Tuple[float, float, int]:
        """
        Smith-Snyder F_N = (1/|Delta-2theta-mean|) * (N / N_poss).

        N_poss is the number of reference lines possible within the 2-theta
        range covered by the matched experimental lines (search-match
        interpretation, research doc 1.1). Returns (F_N, mean_delta, N_poss).
        """
        if not correspondences:
            return 0.0, 0.0, 0

        n = len(correspondences)
        mean_delta = sum(c["deviation"] for c in correspondences) / n

        matched_exp = [c["experimental_2theta"] for c in correspondences]
        lo, hi = min(matched_exp), max(matched_exp)
        n_poss = sum(1 for t in ref_2theta if lo <= t <= hi)
        if n_poss <= 0:
            return 0.0, round(mean_delta, 4), 0

        if mean_delta > 0:
            f_n = (1.0 / mean_delta) * (n / n_poss)
        else:
            # Perfect match: mean residual is exactly zero; use a small
            # epsilon so F_N stays finite and well-defined.
            f_n = (1.0 / 1e-6) * (n / n_poss)
        return round(f_n, 4), round(mean_delta, 4), n_poss

    def _calculate_m20(
        self,
        correspondences: List[Dict[str, Any]],
        wavelength: float,
        ref_2theta: List[float],
    ) -> Tuple[float, float, int]:
        """
        de Wolff M20 = Q20 / (2 * epsbar * N20), generalized to the matched lines.

        Q = 1/d^2. epsbar is the mean |Q_exp - Q_ref| over matched lines,
        Q20 the Q value of the 20th (highest-Q) matched line, N20 the number
        of reference lines with Q <= Q20. Returns (M20, epsbar, N_q).
        """
        if not correspondences:
            return 0.0, 0.0, 0

        q_deltas: List[float] = []
        q_refs: List[float] = []
        for c in correspondences:
            d_exp = _two_theta_to_d(c["experimental_2theta"], wavelength)
            d_ref = _two_theta_to_d(c["reference_2theta"], wavelength)
            if d_exp <= 0 or d_ref <= 0:
                continue
            q_exp = 1.0 / (d_exp ** 2)
            q_ref = 1.0 / (d_ref ** 2)
            q_deltas.append(abs(q_exp - q_ref))
            q_refs.append(q_ref)

        if not q_refs:
            return 0.0, 0.0, 0

        epsbar = sum(q_deltas) / len(q_deltas)
        n20 = min(len(q_refs), 20)
        q_n = max(q_refs[:n20])
        ref_q = [
            1.0 / (_two_theta_to_d(t, wavelength) ** 2)
            for t in ref_2theta
            if _two_theta_to_d(t, wavelength) > 0
        ]
        n_q = sum(1 for q in ref_q if q <= q_n + 1e-9)

        if n_q <= 0:
            return 0.0, round(epsbar, 6), 0
        if epsbar > 0:
            m20 = q_n / (2.0 * epsbar * n_q)
        else:
            # Perfect match: epsbar is exactly zero; documented sentinel.
            m20 = _PERFECT_FOM
        return round(m20, 4), round(epsbar, 6), n_q

    def _calculate_rmse(self, correspondences: List[Dict[str, Any]]) -> float:
        """Calculate RMSE of matched peak position deviations."""
        if not correspondences:
            return 0.0
        squared_deviations = [c["deviation"] ** 2 for c in correspondences]
        rmse = math.sqrt(sum(squared_deviations) / len(squared_deviations))
        return round(rmse, 4)

    def _calculate_position_errors(
        self, correspondences: List[Dict[str, Any]]
    ) -> Tuple[float, float]:
        """Calculate MAE and max |delta-2theta| of matched pairs."""
        if not correspondences:
            return 0.0, 0.0
        deviations = [c["deviation"] for c in correspondences]
        mae = sum(deviations) / len(deviations)
        return round(mae, 4), round(max(deviations), 4)

    def _global_shift(self, correspondences: List[Dict[str, Any]]) -> float:
        """Median signed deviation (exp - ref) as a zero-offset estimate."""
        if not correspondences:
            return 0.0
        signed = sorted(c["experimental_2theta"] - c["reference_2theta"]
                        for c in correspondences)
        n = len(signed)
        mid = n // 2
        median = signed[mid] if n % 2 else (signed[mid - 1] + signed[mid]) / 2.0
        return round(median, 4)

    def _cosine_similarity(
        self,
        exp_peaks: List[Dict[str, Any]],
        ref_peaks: List[Dict[str, Any]],
        correspondences: List[Dict[str, Any]],
    ) -> float:
        """
        Cosine similarity between experimental and reference intensity
        patterns, computed over matched pairs using log-compressed relative
        intensities (research doc 5.2).
        """
        if not correspondences:
            return 0.0

        exp_dict: Dict[float, float] = {}
        for p in exp_peaks:
            exp_dict.setdefault(p["two_theta"], p.get("intensity", 0) or 0)
        ref_dict: Dict[float, float] = {}
        for p in ref_peaks:
            ref_dict.setdefault(p["two_theta"], p.get("intensity", 0) or 0)

        exp_max = max(exp_dict.values()) if exp_dict else 1.0
        ref_max = max(ref_dict.values()) if ref_dict else 1.0

        exp_intensities: List[float] = []
        ref_intensities: List[float] = []
        for corr in correspondences:
            exp_rel = (exp_dict.get(corr["experimental_2theta"], 0) / exp_max) if exp_max > 0 else 0.0
            ref_rel = (ref_dict.get(corr["reference_2theta"], 0) / ref_max) if ref_max > 0 else 0.0
            exp_intensities.append(math.log1p(max(exp_rel, 0.0)))
            ref_intensities.append(math.log1p(max(ref_rel, 0.0)))

        if not exp_intensities:
            return 0.0

        exp_arr = np.array(exp_intensities, dtype=float)
        ref_arr = np.array(ref_intensities, dtype=float)

        dot_product = float(np.dot(exp_arr, ref_arr))
        norm_exp = float(np.linalg.norm(exp_arr))
        norm_ref = float(np.linalg.norm(ref_arr))

        if norm_exp <= 0 or norm_ref <= 0:
            return 0.0

        cosine = dot_product / (norm_exp * norm_ref)
        return round(max(0.0, min(1.0, cosine)), 4)

    def _confidence_value(self, result: SimilarityResult) -> float:
        """Confidence from physical components (research doc 5.2(c))."""
        tau = max(self._tolerance_deg, 1e-6)
        position = max(0.0, min(1.0, 1.0 - result.rmse_2theta / tau))
        coverage = max(0.0, min(1.0, result.peak_fraction))
        intensity = max(0.0, min(1.0, result.cosine_similarity))
        return round(0.60 * position + 0.25 * coverage + 0.15 * intensity, 4)

    def _combined_score(self, result: SimilarityResult) -> float:
        """
        Calculate combined match score (0-1, higher is better).

        Weights (research doc 5.2(c)):
        - Position quality (RMSE-based): 60%
        - Peak fraction (matched/total_reference): 25%
        - Cosine intensity similarity: 15%
        """
        tau = max(self._tolerance_deg, 1e-6)
        if result.matched_peaks <= 0:
            # No positional evidence: position score is undefined -> score 0.
            return 0.0
        position_score = max(0.0, min(1.0, 1.0 - result.rmse_2theta / tau))
        fraction_score = result.peak_fraction
        cosine_score = result.cosine_similarity

        combined = (
            0.60 * position_score +
            0.25 * fraction_score +
            0.15 * cosine_score
        )

        return round(min(1.0, max(0.0, combined)), 4)

    def _assign_confidence(self, result: SimilarityResult) -> str:
        """Assign confidence level based on the composite score.

        A minimum of three matched peaks is required for a 'High' claim
        (DoITPoMS / research doc 5.2).
        """
        score = result.match_score
        matched = result.matched_peaks

        if score >= 0.80 and matched >= 3:
            return "High"
        if score >= 0.60 and matched >= 2:
            return "Medium"
        if score >= 0.40 and matched >= 1:
            return "Low"
        return "Very Low"


def dedupe_phases(results: List[SimilarityResult]) -> List[SimilarityResult]:
    """Remove duplicate phase candidates by canonical identity.

    Duplicates share the canonical (formula, crystal system, space group);
    the highest-scoring representative is kept (SmartLab 'hide same formula
    & same crystal system' precedent, research doc 6.2(d)).
    """
    best: Dict[Tuple[str, str, str], SimilarityResult] = {}
    for r in results:
        key = phase_identity_key(r.material_formula, r.crystal_system, r.space_group)
        if key not in best or r.match_score > best[key].match_score:
            best[key] = r
    return list(best.values())
