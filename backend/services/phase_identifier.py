
"""Phase Identification Engine.

Matches detected peaks against reference database entries
to identify crystalline phases in the sample.
"""

from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from backend.domain.value_objects.peak import Peak
from backend.domain.value_objects.reference_match import ReferenceMatch
from backend.infrastructure.logging.structured_logger import get_logger

logger = get_logger("phase_identifier")


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


def compute_d_spacing(two_theta: float, wavelength: float) -> float:
    """Compute d-spacing from 2-theta angle and wavelength."""
    import math
    theta_rad = math.radians(two_theta / 2.0)
    sin_theta = math.sin(theta_rad)
    if sin_theta <= 0:
        return float('inf')
    return wavelength / (2.0 * sin_theta)


def calculate_match_score(
    experimental_peaks: List[Peak],
    reference_peaks: List[float],
    tolerance_deg: float = 0.15,
    wavelength: Optional[float] = None,
) -> Tuple[float, int, List[Dict[str, float]]]:
    """
    Calculate match score between experimental and reference peaks.

    Uses figure of merit (FOM) similar to ICDD/PDF approach:
    FOM = sum(|2theta_exp - 2theta_ref|) / sum(2theta_ref) * 100

    Lower FOM = better match.

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

    matched = 0
    total_deviation = 0.0
    correspondences = []

    for ref_2theta in reference_peaks:
        best_dev = float('inf')
        best_exp_peak = None

        for exp_peak in experimental_peaks:
            dev = abs(exp_peak.two_theta - ref_2theta)
            if dev < best_dev and dev <= tolerance_deg:
                best_dev = dev
                best_exp_peak = exp_peak

        if best_exp_peak is not None:
            matched += 1
            total_deviation += best_dev

            corr = {
                "experimental_2theta": best_exp_peak.two_theta,
                "reference_2theta": ref_2theta,
                "deviation": round(best_dev, 4),
                "intensity": best_exp_peak.intensity,
            }
            if wavelength:
                corr["d_spacing_exp"] = round(
                    compute_d_spacing(best_exp_peak.two_theta, wavelength), 4
                )
                corr["d_spacing_ref"] = round(
                    compute_d_spacing(ref_2theta, wavelength), 4
                )
            correspondences.append(corr)

    if matched == 0:
        return 0.0, 0, []

    avg_deviation = total_deviation / matched

    peak_ratio = matched / max(len(reference_peaks), 1)

    intensity_weight = 0.3
    position_weight = 0.7

    position_score = max(0, 1.0 - (avg_deviation / tolerance_deg))
    intensity_score = peak_ratio

    match_score = (position_weight * position_score + intensity_weight * intensity_score)
    match_score = round(min(1.0, max(0.0, match_score)), 4)

    return match_score, matched, correspondences


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
    1. For each reference entry, calculate match score
    2. Rank by match score
    3. Assign confidence levels
    4. Return top N candidates

    Args:
        experimental_peaks: Detected peaks from the experiment
        reference_entries: List of reference database entries with:
            - material_name: str
            - material_formula: str
            - source_provider: str
            - source_id: str
            - peaks: List[float] (2-theta positions)
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
            )
            candidates.append(candidate)

    candidates.sort(key=lambda c: c.match_score, reverse=True)
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
