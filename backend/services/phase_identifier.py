
"""Phase Identification Engine.

Matches detected peaks against reference database entries to identify
crystalline phases in the sample.

Methodology (docs/research_phase_id.md):
- Peak matching is STRICTLY one-to-one (Hungarian optimal assignment with a
  strict greedy one-to-one fallback): no experimental peak may satisfy more
  than one reference line and vice versa, preventing score inflation.
- Figure-of-merit values are actually computed and returned:
    Smith-Snyder F_N = (1/|Delta-2theta-mean|) * (N / N_poss)
    de Wolff M20    = Q20 / (2 * epsbar * N20)
- Duplicate phases are removed by canonical identity.
"""

from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field

import numpy as np

from backend.domain.value_objects.peak import Peak
from backend.domain.value_objects.reference_match import ReferenceMatch
from backend.domain.value_objects.wavelength import Wavelength, RadiationType
from backend.infrastructure.logging.structured_logger import get_logger
from backend.reference.similarity_engine import (
    canonical_formula,
    phase_identity_key,
)

logger = get_logger("phase_identifier")

DEFAULT_WAVELENGTH = Wavelength.from_radiation_type(
    RadiationType.Cu_K_ALPHA_AVG
).value_angstrom

# Cost assigned to out-of-tolerance pairs in the assignment matrix.
_MATCH_PENALTY = 1e3

# Sentinel for M20 when the mean Q residual is exactly zero.
_PERFECT_FOM = 999.0


@dataclass
class PhaseCandidate:
    """A candidate phase with match statistics."""
    material_name: str
    material_formula: str
    source_provider: str
    source_id: str
    matched_peaks: int = 0
    total_reference_peaks: int = 0
    total_experimental_peaks: int = 0
    match_score: float = 0.0
    confidence: str = "Low"
    peak_correspondences: List[Dict[str, float]] = field(default_factory=list)

    # Actually computed figure-of-merit fields
    fom: float = 0.0            # Smith-Snyder F_N (higher is better)
    f_n: float = 0.0
    m20: float = 0.0
    rmse_2theta: float = 0.0
    mae_2theta: float = 0.0
    n_unexplained_exp: int = 0
    n_missing_ref: int = 0

    # Candidate identity (used for duplicate suppression)
    crystal_system: str = ""
    space_group: str = ""


def compute_d_spacing(two_theta: float, wavelength: float) -> float:
    """Compute d-spacing from 2-theta angle and wavelength."""
    import math
    theta_rad = math.radians(two_theta / 2.0)
    sin_theta = math.sin(theta_rad)
    if sin_theta <= 0:
        return float('inf')
    return wavelength / (2.0 * sin_theta)


def _greedy_strict_match(
    cost: np.ndarray,
) -> Tuple[np.ndarray, np.ndarray]:
    """Strict greedy one-to-one assignment (never reuses a peak on either side)."""
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


def calculate_match_score(
    experimental_peaks: List[Peak],
    reference_peaks: List[float],
    tolerance_deg: float = 0.15,
    wavelength: Optional[float] = None,
) -> Tuple[float, int, List[Dict[str, float]]]:
    """
    Calculate match score between experimental and reference peaks.

    Peak assignment is strictly one-to-one (Hungarian optimal assignment,
    greedy one-to-one fallback). Each experimental peak supports at most one
    reference line and each reference line is used at most once, so scores
    cannot be inflated by re-using peaks (research doc Topic 4).

    Score: 70% position (RMSE-based) + 30% coverage (matched fraction).
    Position is primary; intensities are not compared because reference
    entries here carry only 2-theta positions (research doc Topic 5).

    Args:
        experimental_peaks: Detected peaks from experiment
        reference_peaks: Reference 2-theta positions
        tolerance_deg: Maximum allowed deviation in degrees
        wavelength: Wavelength for d-spacing comparison

    Returns:
        Tuple of (match_score, matched_count, correspondences)
    """
    if not experimental_peaks or not reference_peaks:
        return 0.0, 0, []

    if wavelength is None:
        wavelength = DEFAULT_WAVELENGTH

    exp_positions = [p.two_theta for p in experimental_peaks]
    n_ref = len(reference_peaks)
    n_exp = len(exp_positions)

    cost = np.full((n_ref, n_exp), _MATCH_PENALTY, dtype=float)
    for i, ref_2theta in enumerate(reference_peaks):
        for j, exp_2theta in enumerate(exp_positions):
            dev = abs(exp_2theta - ref_2theta)
            if dev <= tolerance_deg:
                cost[i, j] = dev

    try:
        from scipy.optimize import linear_sum_assignment
        row_idx, col_idx = linear_sum_assignment(cost)
    except ImportError:
        row_idx, col_idx = _greedy_strict_match(cost)

    matched = 0
    total_deviation = 0.0
    squared_deviation = 0.0
    correspondences = []

    for i, j in zip(row_idx, col_idx):
        dev = abs(exp_positions[j] - reference_peaks[i])
        if dev <= tolerance_deg:
            matched += 1
            total_deviation += dev
            squared_deviation += dev ** 2

            corr = {
                "experimental_2theta": exp_positions[j],
                "reference_2theta": reference_peaks[i],
                "deviation": round(dev, 4),
                "intensity": experimental_peaks[j].intensity,
            }
            corr["d_spacing_exp"] = round(
                compute_d_spacing(exp_positions[j], wavelength), 4
            )
            corr["d_spacing_ref"] = round(
                compute_d_spacing(reference_peaks[i], wavelength), 4
            )
            correspondences.append(corr)

    if matched == 0:
        return 0.0, 0, []

    rmse = (squared_deviation / matched) ** 0.5

    peak_ratio = matched / max(n_ref, 1)

    position_weight = 0.7
    intensity_weight = 0.3

    position_score = max(0.0, min(1.0, 1.0 - (rmse / tolerance_deg)))
    intensity_score = peak_ratio

    match_score = position_weight * position_score + intensity_weight * intensity_score
    match_score = round(min(1.0, max(0.0, match_score)), 4)

    return match_score, matched, correspondences


def compute_figures_of_merit(
    experimental_peaks: List[Peak],
    reference_peaks: List[float],
    correspondences: List[Dict[str, float]],
    wavelength: Optional[float] = None,
) -> Dict[str, float]:
    """
    Actually compute the Smith-Snyder F_N and de Wolff M20 for a match.

    F_N = (1/|Delta-2theta-mean|) * (N / N_poss), where N is the number of
    matched lines and N_poss the number of reference lines possible within the
    2-theta range covered by the matched experimental lines (search-match
    interpretation, research doc 1.1).

    M20 = Q20 / (2 * epsbar * N20), where Q = 1/d^2, epsbar the mean |Q| residual
    over matched lines, Q20 the Q of the 20th (highest-Q) matched line and N20
    the number of reference lines with Q <= Q20 (research doc 2.1).

    Returns a dict with f_n, f_n_mean_delta, f_n_n_poss, m20, m20_epsbar,
    m20_n_q, rmse_2theta, mae_2theta, max_delta_2theta.
    """
    result: Dict[str, float] = {
        "f_n": 0.0,
        "f_n_mean_delta": 0.0,
        "f_n_n_poss": 0.0,
        "m20": 0.0,
        "m20_epsbar": 0.0,
        "m20_n_q": 0.0,
        "rmse_2theta": 0.0,
        "mae_2theta": 0.0,
        "max_delta_2theta": 0.0,
    }

    if not correspondences:
        return result

    if wavelength is None:
        wavelength = DEFAULT_WAVELENGTH

    deviations = [c["deviation"] for c in correspondences]
    n = len(deviations)
    mean_delta = sum(deviations) / n
    rmse = (sum(d ** 2 for d in deviations) / n) ** 0.5
    mae = mean_delta
    max_delta = max(deviations)

    result["rmse_2theta"] = round(rmse, 4)
    result["mae_2theta"] = round(mae, 4)
    result["max_delta_2theta"] = round(max_delta, 4)

    # Smith-Snyder F_N
    matched_exp = [c["experimental_2theta"] for c in correspondences]
    lo, hi = min(matched_exp), max(matched_exp)
    n_poss = sum(1 for t in reference_peaks if lo <= t <= hi)
    result["f_n_mean_delta"] = round(mean_delta, 4)
    result["f_n_n_poss"] = float(n_poss)
    if n_poss > 0:
        if mean_delta > 0:
            f_n = (1.0 / mean_delta) * (n / n_poss)
        else:
            f_n = (1.0 / 1e-6) * (n / n_poss)
        result["f_n"] = round(f_n, 4)

    # de Wolff M20
    q_deltas: List[float] = []
    q_refs: List[float] = []
    for c in correspondences:
        d_exp = compute_d_spacing(c["experimental_2theta"], wavelength)
        d_ref = compute_d_spacing(c["reference_2theta"], wavelength)
        if d_exp == float('inf') or d_ref == float('inf') or d_exp <= 0 or d_ref <= 0:
            continue
        q_exp = 1.0 / (d_exp ** 2)
        q_ref = 1.0 / (d_ref ** 2)
        q_deltas.append(abs(q_exp - q_ref))
        q_refs.append(q_ref)

    if q_refs:
        epsbar = sum(q_deltas) / len(q_deltas)
        n20 = min(len(q_refs), 20)
        q_n = max(q_refs[:n20])
        ref_q = []
        for t in reference_peaks:
            d_ref = compute_d_spacing(t, wavelength)
            if d_ref != float('inf') and d_ref > 0:
                ref_q.append(1.0 / (d_ref ** 2))
        n_q = sum(1 for q in ref_q if q <= q_n + 1e-9)
        result["m20_epsbar"] = round(epsbar, 6)
        result["m20_n_q"] = float(n_q)
        if n_q > 0:
            if epsbar > 0:
                m20 = q_n / (2.0 * epsbar * n_q)
            else:
                # Perfect match: mean Q residual is exactly zero; sentinel.
                m20 = _PERFECT_FOM
            result["m20"] = round(m20, 4)

    return result


def assign_confidence(match_score: float, matched_peaks: int) -> str:
    """Assign confidence level based on match score and number of matched peaks."""
    if match_score >= 0.85 and matched_peaks >= 3:
        return "High"
    elif match_score >= 0.65 and matched_peaks >= 2:
        return "Medium"
    elif match_score >= 0.40 and matched_peaks >= 1:
        return "Low"
    return "Very Low"


def identify_phases(
    experimental_peaks: List[Peak],
    reference_entries: List[Dict[str, Any]],
    tolerance_deg: float = 0.15,
    wavelength: Optional[float] = None,
    min_score: float = 0.3,
    max_phases: int = 5,
) -> List[PhaseCandidate]:
    """
    Identify crystalline phases by matching experimental peaks against references.

    Algorithm:
    1. For each reference entry, calculate match score (one-to-one matching)
    2. Compute figure-of-merit values (F_N, M20) and attach them
    3. Assign confidence levels
    4. Remove duplicate phases by canonical identity
    5. Return top N candidates

    Args:
        experimental_peaks: Detected peaks from the experiment
        reference_entries: List of reference database entries with:
            - material_name: str
            - material_formula: str
            - source_provider: str
            - source_id: str
            - peaks: List[float] (2-theta positions)
            - space_group: str (optional, for dedupe)
            - crystal_system: str (optional, for dedupe)
        tolerance_deg: Maximum allowed deviation between peaks
        wavelength: X-ray wavelength for d-spacing calculations
        min_score: Minimum match score threshold
        max_phases: Maximum number of phases to return

    Returns:
        List of PhaseCandidate objects, ranked by match score
    """
    logger.info("Starting phase identification",
                exp_peaks=len(experimental_peaks),
                ref_entries=len(reference_entries))

    candidates = []

    for entry in reference_entries:
        ref_peaks = entry.get("peaks", [])
        if not ref_peaks:
            continue

        score, matched, correspondences = calculate_match_score(
            experimental_peaks, ref_peaks, tolerance_deg, wavelength
        )

        if score >= min_score:
            confidence = assign_confidence(score, matched)
            foms = compute_figures_of_merit(
                experimental_peaks, ref_peaks, correspondences, wavelength
            )
            candidate = PhaseCandidate(
                material_name=entry.get("material_name", "Unknown"),
                material_formula=entry.get("material_formula", "?"),
                source_provider=entry.get("source_provider", "unknown"),
                source_id=entry.get("source_id", ""),
                matched_peaks=matched,
                total_reference_peaks=len(ref_peaks),
                total_experimental_peaks=len(experimental_peaks),
                match_score=score,
                confidence=confidence,
                peak_correspondences=correspondences,
                fom=foms["f_n"],
                f_n=foms["f_n"],
                m20=foms["m20"],
                rmse_2theta=foms["rmse_2theta"],
                mae_2theta=foms["mae_2theta"],
                n_unexplained_exp=len(experimental_peaks) - matched,
                n_missing_ref=len(ref_peaks) - matched,
                crystal_system=entry.get("crystal_system", ""),
                space_group=entry.get("space_group", ""),
            )
            candidates.append(candidate)

    candidates.sort(key=lambda c: c.match_score, reverse=True)

    # Remove duplicate phases by canonical identity (research doc 6.2(d)):
    # same canonical formula + crystal system + space group.
    deduped: Dict[Tuple[str, str, str], PhaseCandidate] = {}
    for candidate in candidates:
        key = phase_identity_key(
            candidate.material_formula, candidate.crystal_system, candidate.space_group
        )
        if key not in deduped:
            deduped[key] = candidate
    candidates = list(deduped.values())
    candidates = candidates[:max_phases]

    logger.info("Phase identification complete",
                candidates_found=len(candidates),
                top_score=candidates[0].match_score if candidates else 0)

    return candidates


def candidates_to_reference_matches(candidates: List[PhaseCandidate]) -> List[ReferenceMatch]:
    """Convert PhaseCandidate objects to ReferenceMatch value objects."""
    matches = []
    for c in candidates:
        for corr in c.peak_correspondences:
            match = ReferenceMatch(
                material_name=c.material_name,
                material_formula=c.material_formula,
                source_provider=c.source_provider,
                source_id=c.source_id,
                match_score=c.match_score,
                matched_peaks=c.matched_peaks,
                total_peaks=c.total_reference_peaks,
                experimental_peak_2theta=corr.get("experimental_2theta", 0),
                reference_peak_2theta=corr.get("reference_2theta", 0),
                d_spacing_experimental=corr.get("d_spacing_exp"),
                d_spacing_reference=corr.get("d_spacing_ref"),
                confidence=c.confidence,
            )
            matches.append(match)
    return matches
