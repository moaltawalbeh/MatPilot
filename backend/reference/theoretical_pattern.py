"""Theoretical XRD Pattern Generator.

Calculates theoretical powder diffraction patterns from crystallographic data:
- Unit cell → d-spacings (Bragg's law)
- Atomic positions → structure factors → intensities
- Returns peak list with 2θ positions, intensities, hkl indices, d-spacings

Uses only numpy (no heavy dependencies).
"""

import math
import itertools
import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

logger = logging.getLogger("theoretical_pattern")

# Cu K-alpha wavelength
CU_K_ALPHA = 1.5406  # Angstroms


class TheoreticalPatternGenerator:
    """
    Generate theoretical powder XRD patterns from CIF crystallographic data.

    Algorithm:
    1. Parse unit cell parameters → compute volume
    2. Generate hkl reflections up to max 2θ
    3. Calculate d-spacing for each hkl using metric tensor
    4. Apply Bragg's law → 2θ positions
    5. Calculate structure factors → intensities
    6. Apply Lorentz-polarization correction
    7. Return peak list sorted by 2θ
    """

    def __init__(self, wavelength: float = CU_K_ALPHA):
        self._wavelength = wavelength

    def generate_pattern(
        self,
        cif_data: Dict[str, Any],
        max_two_theta: float = 120.0,
        min_intensity_ratio: float = 0.001,
    ) -> List[Dict[str, Any]]:
        """
        Generate theoretical diffraction pattern from CIF data.

        Args:
            cif_data: Parsed CIF data dict with unit_cell, atoms, space_group_number
            max_two_theta: Maximum 2θ angle to calculate
            min_intensity_ratio: Minimum relative intensity (0-1) to include

        Returns:
            List of peak dicts with: two_theta, intensity, d_spacing, hkl, f_squared
        """
        unit_cell = cif_data.get("unit_cell", {})
        a = unit_cell.get("a", 0)
        b = unit_cell.get("b", 0)
        c = unit_cell.get("c", 0)
        alpha = unit_cell.get("alpha", 90.0)
        beta = unit_cell.get("beta", 90.0)
        gamma = unit_cell.get("gamma", 90.0)

        if a <= 0 or b <= 0 or c <= 0:
            logger.warning("Invalid unit cell parameters")
            return []

        atoms = cif_data.get("atoms", [])
        reflections_cif = cif_data.get("reflections", [])

        # Compute metric tensor and its inverse
        metric = self._compute_metric_tensor(a, b, c, alpha, beta, gamma)
        metric_inv = np.linalg.inv(metric)

        # Determine max hkl indices
        max_hkl = self._max_hkl_index(a, b, c, max_two_theta, self._wavelength)

        # Generate all hkl reflections
        hkl_list = self._generate_hkl(max_hkl)

        # Calculate d-spacings and 2θ for each hkl
        peaks: List[Dict[str, Any]] = []

        for hkl in hkl_list:
            h, k, l = hkl

            # Skip 000
            if h == 0 and k == 0 and l == 0:
                continue

            # Calculate d-spacing using metric tensor
            d_spacing = self._compute_d_spacing(hkl, metric_inv)
            if d_spacing <= 0:
                continue

            # Calculate 2θ from Bragg's law
            two_theta = self._bragg_angle(d_spacing, self._wavelength)
            if two_theta is None or two_theta > max_two_theta or two_theta < 1.0:
                continue

            # Calculate structure factor
            f_squared = self._compute_structure_factor(hkl, atoms)

            if f_squared > 0:
                peaks.append({
                    "hkl": f"{h}{k}{l}",
                    "h": h, "k": k, "l": l,
                    "two_theta": round(two_theta, 4),
                    "d_spacing": round(d_spacing, 4),
                    "f_squared": round(f_squared, 2),
                })

        if not peaks:
            return []

        # Apply Lorentz-polarization correction to intensities
        self._apply_lorentz_polarization(peaks)

        # Normalize intensities (max = 100)
        max_intensity = max(p["intensity"] for p in peaks) if peaks else 1
        if max_intensity > 0:
            for p in peaks:
                p["intensity"] = round((p["intensity"] / max_intensity) * 100, 2)

        # Filter by minimum intensity
        peaks = [p for p in peaks if p["intensity"] >= min_intensity_ratio * 100]

        # Sort by 2θ
        peaks.sort(key=lambda p: p["two_theta"])

        # Remove duplicates (same 2θ within 0.01°) keeping strongest
        peaks = self._merge_close_peaks(peaks, tolerance=0.01)

        return peaks

    def _compute_metric_tensor(
        self, a: float, b: float, c: float,
        alpha: float, beta: float, gamma: float
    ) -> np.ndarray:
        """Compute the metric tensor for the unit cell."""
        alpha_r = math.radians(alpha)
        beta_r = math.radians(beta)
        gamma_r = math.radians(gamma)

        g = np.zeros((3, 3))
        g[0, 0] = a * a
        g[1, 1] = b * b
        g[2, 2] = c * c
        g[0, 1] = g[1, 0] = a * b * math.cos(gamma_r)
        g[0, 2] = g[2, 0] = a * c * math.cos(beta_r)
        g[1, 2] = g[2, 1] = b * c * math.cos(alpha_r)

        return g

    def _max_hkl_index(
        self, a: float, b: float, c: float,
        max_two_theta: float, wavelength: float
    ) -> int:
        """Estimate maximum hkl index needed."""
        theta_max = math.radians(max_two_theta / 2.0)
        sin_theta = math.sin(theta_max)
        if sin_theta <= 0:
            return 10
        d_min = wavelength / (2.0 * sin_theta)
        return max(int(max(a, b, c) / d_min) + 1, 10)

    def _generate_hkl(self, max_index: int) -> List[Tuple[int, int, int]]:
        """Generate all hkl reflections within index limit."""
        indices = range(-max_index, max_index + 1)
        hkl_list = []
        for h, k, l in itertools.product(indices, indices, indices):
            if h == 0 and k == 0 and l == 0:
                continue
            # Only keep unique reflections (Friedel pairs merged):
            # first non-zero index must be positive
            first_nonzero = next(
                (x for x in [h, k, l] if x != 0), 0
            )
            if first_nonzero > 0:
                hkl_list.append((h, k, l))
        return hkl_list

    def _compute_d_spacing(
        self, hkl: Tuple[int, int, int], metric_inv: np.ndarray
    ) -> float:
        """Compute d-spacing from hkl indices and inverse metric tensor."""
        h, k, l = hkl
        hkl_vec = np.array([h, k, l], dtype=float)

        # 1/d² = hkl^T * G* * hkl
        inv_d_sq = float(hkl_vec @ metric_inv @ hkl_vec)

        if inv_d_sq <= 0:
            return 0.0
        return 1.0 / math.sqrt(inv_d_sq)

    def _bragg_angle(self, d_spacing: float, wavelength: float) -> Optional[float]:
        """Calculate 2θ from d-spacing using Bragg's law: nλ = 2d·sin(θ)."""
        sin_theta = wavelength / (2.0 * d_spacing)
        if abs(sin_theta) > 1.0:
            return None
        theta = math.asin(sin_theta)
        return 2.0 * math.degrees(theta)

    def _compute_structure_factor(
        self, hkl: Tuple[int, int, int], atoms: List[Dict]
    ) -> float:
        """
        Calculate |F|² for a reflection.

        F(hkl) = Σ_j f_j · exp(2πi(h·x_j + k·y_j + l·z_j))

        Simplified: uses atomic scattering factors at θ=0
        (valid for powder diffraction peak positions and approximate intensities).
        """
        if not atoms:
            return 0.0

        h, k, l = hkl
        f_real = 0.0
        f_imag = 0.0

        for atom in atoms:
            x = atom.get("x", 0.0)
            y = atom.get("y", 0.0)
            z = atom.get("z", 0.0)
            occ = atom.get("occupancy", 1.0)
            element = atom.get("element", "")

            # Atomic scattering factor (simplified: f = Z for θ=0)
            f_atom = self._atomic_scattering_factor(element)

            # Phase factor
            phase = 2.0 * math.pi * (h * x + k * y + l * z)

            f_real += f_atom * occ * math.cos(phase)
            f_imag += f_atom * occ * math.sin(phase)

        return f_real ** 2 + f_imag ** 2

    def _atomic_scattering_factor(self, element: str) -> float:
        """
        Simplified atomic scattering factor at θ=0.
        Returns atomic number Z as approximation.
        Full implementation would use parameterized f(sinθ/λ) curves.
        """
        ELEMENT_Z = {
            "H": 1, "He": 2, "Li": 3, "Be": 4, "B": 5, "C": 6, "N": 7, "O": 8,
            "F": 9, "Ne": 10, "Na": 11, "Mg": 12, "Al": 13, "Si": 14, "P": 15,
            "S": 16, "Cl": 17, "Ar": 18, "K": 19, "Ca": 20, "Sc": 21, "Ti": 22,
            "V": 23, "Cr": 24, "Mn": 25, "Fe": 26, "Co": 27, "Ni": 28, "Cu": 29,
            "Zn": 30, "Ga": 31, "Ge": 32, "As": 33, "Se": 34, "Br": 35, "Kr": 36,
            "Rb": 37, "Sr": 38, "Y": 39, "Zr": 40, "Nb": 41, "Mo": 42, "Tc": 43,
            "Ru": 44, "Rh": 45, "Pd": 46, "Ag": 47, "Cd": 48, "In": 49, "Sn": 50,
            "Sb": 51, "Te": 52, "I": 53, "Xe": 54, "Cs": 55, "Ba": 56, "La": 57,
            "Ce": 58, "Pr": 59, "Nd": 60, "Pm": 61, "Sm": 62, "Eu": 63, "Gd": 64,
            "Tb": 65, "Dy": 66, "Ho": 67, "Er": 68, "Tm": 69, "Yb": 70, "Lu": 71,
            "Hf": 72, "Ta": 73, "W": 74, "Re": 75, "Os": 76, "Ir": 77, "Pt": 78,
            "Au": 79, "Hg": 80, "Tl": 81, "Pb": 82, "Bi": 83, "Po": 84, "At": 85,
            "Rn": 86, "Fr": 87, "Ra": 88, "Ac": 89, "Th": 90, "Pa": 91, "U": 92,
        }
        return float(ELEMENT_Z.get(element, 6))

    def _apply_lorentz_polarization(self, peaks: List[Dict[str, Any]]):
        """
        Apply Lorentz-polarization correction.

        LP = (1 + cos²(2θ)) / (sin²(θ) · cos(θ))

        This corrects for geometric factors of the diffractometer.
        """
        for peak in peaks:
            two_theta_rad = math.radians(peak["two_theta"])
            theta = two_theta_rad / 2.0

            sin_theta = math.sin(theta)
            cos_theta = math.cos(theta)
            cos_2theta = math.cos(two_theta_rad)

            if sin_theta <= 0 or cos_theta <= 0:
                peak["intensity"] = peak["f_squared"]
                continue

            lp_factor = (1.0 + cos_2theta ** 2) / (sin_theta ** 2 * cos_theta)
            peak["intensity"] = peak["f_squared"] * lp_factor

    def _merge_close_peaks(
        self, peaks: List[Dict[str, Any]], tolerance: float = 0.01
    ) -> List[Dict[str, Any]]:
        """Merge peaks within tolerance, keeping the one with highest intensity."""
        if not peaks:
            return []

        merged: List[Dict[str, Any]] = []
        current = peaks[0].copy()

        for peak in peaks[1:]:
            if abs(peak["two_theta"] - current["two_theta"]) < tolerance:
                # Merge: keep stronger peak
                if peak["intensity"] > current["intensity"]:
                    current = peak.copy()
            else:
                merged.append(current)
                current = peak.copy()

        merged.append(current)
        return merged
