"""Theoretical XRD Pattern Generator.

Calculates theoretical powder diffraction patterns from crystallographic data:
- Unit cell → d-spacings (Bragg's law)
- Atomic positions → structure factors → intensities
- Returns peak list with 2θ positions, intensities, hkl indices, d-spacings

Intensities include the lattice multiplicity of each {hkl} reflection family
(number of symmetry-equivalent reflections with the same d-spacing) and a
Lorentz-polarization correction. The structure factor is computed with the
simplified θ=0 scattering factor (f ≈ Z); space-group-specific systematic
absences are NOT modelled, so this generator is an approximation suitable for
peak positions and approximate relative intensities. pymatgen-based generation
(preferred, correct handling of symmetry) lives in PymatgenPatternGenerator.

Uses only numpy (no heavy dependencies).
"""

import math
import itertools
import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

from backend.domain.value_objects.wavelength import Wavelength, RadiationType

logger = logging.getLogger("theoretical_pattern")

# Cu K-alpha (weighted average) wavelength — canonical NIST value imported
# from the shared value object (backend/domain/value_objects/wavelength.py).
CU_K_ALPHA = Wavelength.from_radiation_type(
    RadiationType.Cu_K_ALPHA_AVG
).value_angstrom


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

        # Crystal system (from parsed CIF metadata, falling back to the space
        # group number) is used for lattice multiplicity.
        crystal_system = (
            cif_data.get("crystal_system", "")
            or self._crystal_system_from_sg_number(
                cif_data.get("space_group_number", 0)
            )
        )

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
                # Lattice multiplicity of the {hkl} family (research doc 1.1:
                # one plane per symmetry-equivalent family).
                multiplicity = self._reflection_multiplicity(
                    h, k, l, crystal_system
                )
                peaks.append({
                    "hkl": f"{h}{k}{l}",
                    "h": h, "k": k, "l": l,
                    "two_theta": round(two_theta, 4),
                    "d_spacing": round(d_spacing, 4),
                    "f_squared": round(f_squared, 2),
                    "multiplicity": multiplicity,
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
        Apply Lorentz-polarization correction and lattice multiplicity.

        LP = (1 + cos²(2θ)) / (sin²(θ) · cos(θ))

        Intensity ~ |F|² · multiplicity · LP. Multiplicity counts the
        symmetry-equivalent reflections of the {hkl} family contributing to
        the powder line (research doc 1.1).
        """
        for peak in peaks:
            two_theta_rad = math.radians(peak["two_theta"])
            theta = two_theta_rad / 2.0

            sin_theta = math.sin(theta)
            cos_theta = math.cos(theta)
            cos_2theta = math.cos(two_theta_rad)

            multiplicity = peak.get("multiplicity", 1)

            if sin_theta <= 0 or cos_theta <= 0:
                peak["intensity"] = peak["f_squared"] * multiplicity
                continue

            lp_factor = (1.0 + cos_2theta ** 2) / (sin_theta ** 2 * cos_theta)
            peak["intensity"] = peak["f_squared"] * multiplicity * lp_factor

    @staticmethod
    def _crystal_system_from_sg_number(space_group_number: int) -> str:
        """Resolve crystal system from the international space-group number."""
        sg = int(space_group_number or 0)
        if 1 <= sg <= 2:
            return "Triclinic"
        if 3 <= sg <= 15:
            return "Monoclinic"
        if 16 <= sg <= 74:
            return "Orthorhombic"
        if 75 <= sg <= 142:
            return "Tetragonal"
        if 143 <= sg <= 167:
            return "Trigonal"
        if 168 <= sg <= 194:
            return "Hexagonal"
        if 195 <= sg <= 230:
            return "Cubic"
        return ""

    @staticmethod
    def _reflection_multiplicity(
        h: int, k: int, l: int, crystal_system: str
    ) -> int:
        """
        Lattice multiplicity of the {hkl} reflection family.

        Number of symmetry-equivalent reflections with the same d-spacing
        under the crystal-system point group (standard powder tables;
        research doc 1.1 counting rules). This is the multiplicity of a
        surviving reflection — space-group systematic absences may remove a
        whole reflection, but they do not change the multiplicity of the
        reflections that remain.

        Trigonal uses the hexagonal (rhombohedral) setting convention; for
        other systems the multiplicity is unambiguous.
        """
        cs = (crystal_system or "").lower()
        h, k, l = abs(h), abs(k), abs(l)
        nonzero = sum(1 for v in (h, k, l) if v != 0)
        distinct = sorted({v for v in (h, k, l) if v != 0})
        n_distinct = len(distinct)

        if cs == "cubic":
            if nonzero == 1:
                return 6
            if nonzero == 2:
                return 12 if n_distinct == 1 else 24
            if n_distinct == 1:  # (hhh)
                return 8
            return 24 if n_distinct == 2 else 48
        if cs == "hexagonal":
            if nonzero == 1:
                # (00l) lies along the unique c-axis -> 2; (h00)/(0k0) -> 6
                return 2 if h == 0 and k == 0 else 6
            if nonzero == 2:
                return 6 if n_distinct == 1 else 12
            return 12 if n_distinct == 2 else 24
        if cs == "trigonal":
            if nonzero == 1:
                # Hexagonal (rhombohedral) setting: (00l) -> 6, (h00) -> 6
                return 6
            if nonzero == 2:
                return 6 if n_distinct == 1 else 12
            return 12 if n_distinct == 2 else 24
        if cs == "tetragonal":
            if nonzero == 1:
                return 2 if h == 0 and k == 0 else 4
            if nonzero == 2:
                return 4 if n_distinct == 1 else 8
            return 8 if n_distinct == 2 else 16
        if cs == "orthorhombic":
            if nonzero == 1:
                return 2
            return 4 if nonzero == 2 else 8
        if cs == "monoclinic":
            return 2 if nonzero <= 2 else 4
        if cs == "triclinic":
            return 2
        # Unknown crystal system: no symmetry information -> unit multiplicity.
        return 1

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
