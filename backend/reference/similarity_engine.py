"""Pattern Similarity Engine.

Compares experimental XRD patterns against theoretical/reference patterns.
Calculates multiple similarity metrics for robust phase identification.

Combined score weights: position 40%, peak_fraction 35%, cosine 25%
"""

import math
import logging
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field

logger = logging.getLogger("similarity_engine")


@dataclass
class SimilarityResult:
    """Result of comparing two diffraction patterns."""
    material_name: str = ""
    material_formula: str = ""
    source_id: str = ""
    source_provider: str = ""

    # Core similarity metrics
    fom: float = 0.0  # Figure of Merit (lower is better)
    rmse_2theta: float = 0.0  # RMSE of matched peak positions
    cosine_similarity: float = 0.0  # Intensity pattern similarity
    match_score: float = 0.0  # Combined score (0-1, higher is better)

    # Peak matching details
    matched_peaks: int = 0
    total_experimental_peaks: int = 0
    total_reference_peaks: int = 0
    peak_fraction: float = 0.0  # matched / total_reference

    # Individual peak correspondences
    correspondences: List[Dict[str, Any]] = field(default_factory=list)

    # Metadata
    confidence: str = "Low"
    confidence_value: float = 0.0
    match_explanation: str = ""
    d_spacing_range: Tuple[float, float] = (0.0, 0.0)

    # Theoretical pattern for overlay
    theoretical_peaks: List[Dict[str, Any]] = field(default_factory=list)


class SimilarityEngine:
    """
    Compare experimental XRD patterns against reference/theoretical patterns.

    Uses multiple metrics:
    1. Position matching (2θ tolerance)
    2. Figure of Merit (ICDD-style)
    3. Cosine similarity of intensity patterns
    4. d-spacing comparison

    Combined score weights: position 40%, peak_fraction 35%, cosine 25%
    """

    def __init__(self, tolerance_deg: float = 0.3, wavelength: float = 1.5406):
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

        Returns:
            SimilarityResult with all metrics
        """
        result = SimilarityResult(
            material_name=material_name,
            material_formula=material_formula,
            source_id=source_id,
            source_provider=source_provider,
            total_experimental_peaks=len(experimental_peaks),
            total_reference_peaks=len(reference_peaks),
            theoretical_peaks=reference_peaks,
        )

        if not experimental_peaks or not reference_peaks:
            return result

        # Extract 2θ positions
        exp_2theta = sorted([p["two_theta"] for p in experimental_peaks])
        ref_2theta = sorted([p["two_theta"] for p in reference_peaks])

        # 1. Peak position matching
        correspondences, matched_count = self._match_peaks(exp_2theta, ref_2theta)
        result.correspondences = correspondences
        result.matched_peaks = matched_count
        result.peak_fraction = matched_count / max(len(ref_2theta), 1)

        # 2. Figure of Merit (FOM)
        result.fom = self._calculate_fom(correspondences)

        # 3. RMSE of matched positions
        result.rmse_2theta = self._calculate_rmse(correspondences)

        # 4. Cosine similarity of intensity patterns
        result.cosine_similarity = self._cosine_similarity(
            experimental_peaks, reference_peaks, correspondences
        )

        # 5. Combined match score
        result.match_score = self._combined_score(result)

        # 6. Confidence value calculation
        if result.matched_peaks > 0:
            pos_term = math.exp(-result.rmse_2theta / self._tolerance_deg)
            result.confidence_value = round(min(1.0, max(0.0, result.peak_fraction * result.cosine_similarity * pos_term)), 4)
        else:
            result.confidence_value = 0.0

        # 7. Confidence assignment
        result.confidence = self._assign_confidence(result)

        # 8. Set explanation details
        result.match_explanation = (
            f"Match Score ({result.match_score:.1%}) is computed as: "
            f"40% Peak Position quality (FOM={result.fom:.2f}), "
            f"35% Peak Fraction ({result.matched_peaks}/{result.total_reference_peaks} reference peaks matched), "
            f"25% Cosine Intensity Similarity ({result.cosine_similarity:.2%}). "
            f"Confidence ({result.confidence_value:.1%}) is computed mathematically as: "
            f"Peak Fraction ({result.peak_fraction:.2f}) * Cosine Similarity ({result.cosine_similarity:.2f}) * "
            f"Position Deviation Decay (exp(-RMSE_2theta/tolerance)={math.exp(-result.rmse_2theta / self._tolerance_deg):.2f})."
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
        Match reference peaks to closest experimental peaks within tolerance.

        Uses greedy matching: for each reference peak, find closest unmatched
        experimental peak within tolerance.
        """
        correspondences: List[Dict[str, Any]] = []
        matched_exp = set()

        for ref_pos in ref_2theta:
            best_dev = float('inf')
            best_exp_idx = -1

            for i, exp_pos in enumerate(exp_2theta):
                if i in matched_exp:
                    continue
                dev = abs(exp_pos - ref_pos)
                if dev < best_dev and dev <= self._tolerance_deg:
                    best_dev = dev
                    best_exp_idx = i

            if best_exp_idx >= 0:
                matched_exp.add(best_exp_idx)
                correspondences.append({
                    "experimental_2theta": exp_2theta[best_exp_idx],
                    "reference_2theta": ref_pos,
                    "deviation": round(best_dev, 4),
                })

        return correspondences, len(correspondences)

    def _calculate_fom(self, correspondences: List[Dict[str, Any]]) -> float:
        """
        Calculate Figure of Merit (ICDD-style).

        FOM = Σ|Δ2θ| / Σ(2θ_ref) * 100

        Lower FOM = better match. FOM=0 is perfect.
        """
        if not correspondences:
            return 100.0

        total_deviation = sum(c["deviation"] for c in correspondences)
        total_ref = sum(c["reference_2theta"] for c in correspondences)

        if total_ref <= 0:
            return 100.0

        fom = (total_deviation / total_ref) * 100
        return round(min(fom, 100.0), 4)

    def _calculate_rmse(self, correspondences: List[Dict[str, Any]]) -> float:
        """Calculate RMSE of matched peak position deviations."""
        if not correspondences:
            return 0.0

        squared_deviations = [c["deviation"] ** 2 for c in correspondences]
        rmse = math.sqrt(sum(squared_deviations) / len(squared_deviations))
        return round(rmse, 4)

    def _cosine_similarity(
        self,
        exp_peaks: List[Dict[str, Any]],
        ref_peaks: List[Dict[str, Any]],
        correspondences: List[Dict[str, Any]],
    ) -> float:
        """
        Calculate cosine similarity between experimental and reference
        intensity patterns.

        Only considers matched peak pairs.
        """
        if not correspondences:
            return 0.0

        # Build intensity vectors for matched peaks
        exp_intensities = []
        ref_intensities = []

        exp_dict = {p["two_theta"]: p["intensity"] for p in exp_peaks}
        ref_dict = {p["two_theta"]: p["intensity"] for p in ref_peaks}

        # Normalize intensities to max=1
        exp_max = max(exp_dict.values()) if exp_dict else 1
        ref_max = max(ref_dict.values()) if ref_dict else 1

        for corr in correspondences:
            exp_i = exp_dict.get(corr["experimental_2theta"], 0) / exp_max
            ref_i = ref_dict.get(corr["reference_2theta"], 0) / ref_max
            exp_intensities.append(exp_i)
            ref_intensities.append(ref_i)

        if not exp_intensities:
            return 0.0

        exp_arr = np.array(exp_intensities)
        ref_arr = np.array(ref_intensities)

        dot_product = float(np.dot(exp_arr, ref_arr))
        norm_exp = float(np.linalg.norm(exp_arr))
        norm_ref = float(np.linalg.norm(ref_arr))

        if norm_exp <= 0 or norm_ref <= 0:
            return 0.0

        cosine = dot_product / (norm_exp * norm_ref)
        return round(max(0.0, min(1.0, cosine)), 4)

    def _combined_score(self, result: SimilarityResult) -> float:
        """
        Calculate combined match score (0-1, higher is better).

        Weights:
        - Position quality (based on FOM): 40%
        - Peak fraction (matched/total_reference): 35%
        - Cosine similarity: 25%
        """
        # Position quality: FOM of 0 → score 1.0, FOM of 5 → score 0.5, FOM of 10 → score 0.0
        position_score = max(0.0, 1.0 - result.fom / 10.0)

        # Peak fraction
        fraction_score = result.peak_fraction

        # Cosine similarity
        cosine_score = result.cosine_similarity

        combined = (
            0.40 * position_score +
            0.35 * fraction_score +
            0.25 * cosine_score
        )

        return round(min(1.0, max(0.0, combined)), 4)

    def _assign_confidence(self, result: SimilarityResult) -> str:
        """Assign confidence level based on combined metrics."""
        val = getattr(result, "confidence_value", None)
        if val is None or val == 0.0:
            score = result.match_score
            matched = result.matched_peaks

            if score >= 0.80 and matched >= 2:
                return "High"
            if score >= 0.60 and matched >= 2:
                return "Medium"
            if score >= 0.40 and matched >= 1:
                return "Low"
            return "Very Low"

        if val >= 0.70 and result.matched_peaks >= 2:
            return "High"
        if val >= 0.40 and result.matched_peaks >= 2:
            return "Medium"
        if val >= 0.15 and result.matched_peaks >= 1:
            return "Low"
        return "Very Low"
