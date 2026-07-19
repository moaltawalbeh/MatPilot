"""Pymatgen-based Theoretical XRD Pattern Generator.

Uses pymatgen's CIF parser and XRDCalculator for robust, scientifically
accurate theoretical pattern generation from CIF data.

The pipeline:
    CIF content → pymatgen CifParser → Structure → XRDCalculator → Pattern

Falls back to the numpy-based TheoreticalPatternGenerator if pymatgen
is unavailable or fails to parse the CIF.
"""

import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("pymatgen_pattern_generator")


class PymatgenPatternGenerator:
    """Generate theoretical XRD patterns using pymatgen.

    This is the PRIMARY pattern generator. It handles all CIF formats
    that pymatgen can parse (which is essentially all valid CIFs from COD).
    """

    def __init__(self, wavelength: float = 1.5406):
        self._wavelength = wavelength

    @property
    def available(self) -> bool:
        try:
            from pymatgen.io.cif import CifParser
            from pymatgen.analysis.diffraction.xrd import XRDCalculator
            return True
        except ImportError:
            return False

    def generate_from_cif_content(
        self,
        cif_content: str,
        max_two_theta: float = 120.0,
        min_intensity_ratio: float = 0.001,
    ) -> Optional[List[Dict[str, Any]]]:
        """Generate theoretical XRD pattern directly from CIF file content.

        This is the most robust path — it takes raw CIF content and
        handles everything through pymatgen.

        Args:
            cif_content: Raw CIF file content as string
            max_two_theta: Maximum 2θ angle to calculate
            min_intensity_ratio: Minimum relative intensity (0-1) to include

        Returns:
            List of peak dicts with: two_theta, intensity, d_spacing, hkl, f_squared
            or None if pymatgen fails.
        """
        try:
            from pymatgen.io.cif import CifParser
            from pymatgen.analysis.diffraction.xrd import XRDCalculator
        except ImportError:
            logger.warning("pymatgen not available, cannot generate pattern from CIF content")
            return None

        try:
            parser = CifParser.from_str(cif_content)
            structures = parser.parse_structures(primitive=True)
            if not structures:
                logger.warning("pymatgen parsed CIF but found no structures")
                return None

            structure = structures[0]
            return self._generate_from_structure(
                structure, max_two_theta, min_intensity_ratio
            )
        except Exception as e:
            logger.warning("pymatgen CIF pattern generation failed: %s", e)
            return None

    def generate_from_parsed_data(
        self,
        parsed_data: Dict[str, Any],
        max_two_theta: float = 120.0,
        min_intensity_ratio: float = 0.001,
    ) -> Optional[List[Dict[str, Any]]]:
        """Generate pattern from our CIFParser's parsed data dict.

        Builds a pymatgen Structure from the parsed data and generates
        the pattern. Used when CIF content is not available but parsed
        data is.

        Args:
            parsed_data: Dict from CIFParser with unit_cell, atoms, etc.
            max_two_theta: Maximum 2θ angle
            min_intensity_ratio: Minimum relative intensity

        Returns:
            List of peak dicts, or None if construction fails.
        """
        try:
            from pymatgen.core import Lattice, Structure
        except ImportError:
            return None

        try:
            structure = self._build_structure_from_parsed_data(parsed_data)
            if structure is None:
                return None
            return self._generate_from_structure(
                structure, max_two_theta, min_intensity_ratio
            )
        except Exception as e:
            logger.warning("Structure-based pattern generation failed: %s", e)
            return None

    def _generate_from_structure(
        self,
        structure,
        max_two_theta: float = 120.0,
        min_intensity_ratio: float = 0.001,
    ) -> List[Dict[str, Any]]:
        """Generate XRD pattern from a pymatgen Structure object."""
        from pymatgen.analysis.diffraction.xrd import XRDCalculator

        calc = XRDCalculator(wavelength=self._wavelength)
        # Use a generous 2theta range to ensure we capture everything
        pattern = calc.get_pattern(structure, two_theta_range=(0, max_two_theta))

        if pattern is None or len(pattern.x) == 0:
            return []

        peaks = []
        for i, (two_theta, intensity, hkl_list) in enumerate(
            zip(pattern.x, pattern.y, pattern.hkls)
        ):
            if intensity < min_intensity_ratio * 100:
                continue

            d_spacing = self._two_theta_to_d_spacing(two_theta, self._wavelength)

            # Get the primary hkl (highest multiplicity)
            primary_hkl = ""
            if hkl_list:
                primary = hkl_list[0]
                h, k, l = primary["hkl"]
                primary_hkl = "(%d %d %d)" % (h, k, l)

            peaks.append({
                "hkl": primary_hkl,
                "h": hkl_list[0]["hkl"][0] if hkl_list else 0,
                "k": hkl_list[0]["hkl"][1] if hkl_list else 0,
                "l": hkl_list[0]["hkl"][2] if hkl_list else 0,
                "two_theta": round(float(two_theta), 4),
                "d_spacing": round(d_spacing, 4),
                "intensity": round(float(intensity), 2),
                "f_squared": round(float(intensity), 2),
            })

        return peaks

    def _build_structure_from_parsed_data(
        self, parsed_data: Dict[str, Any]
    ):
        """Build a pymatgen Structure from our CIFParser's output."""
        from pymatgen.core import Lattice, Structure

        uc = parsed_data.get("unit_cell", {})
        a = float(uc.get("a", 0))
        b = float(uc.get("b", 0))
        c = float(uc.get("c", 0))
        alpha = float(uc.get("alpha", 90.0))
        beta = float(uc.get("beta", 90.0))
        gamma = float(uc.get("gamma", 90.0))

        if a <= 0 or b <= 0 or c <= 0:
            logger.warning("Invalid unit cell: a=%.3f b=%.3f c=%.3f", a, b, c)
            return None

        atoms = parsed_data.get("atoms", [])
        if not atoms:
            logger.warning("No atoms in parsed data")
            return None

        try:
            lattice = Lattice.from_parameters(a, b, c, alpha, beta, gamma)
        except Exception as e:
            logger.warning("Could not create lattice: %s", e)
            return None

        species = []
        coords = []
        for atom in atoms:
            element = atom.get("element", "")
            if not element or not element.replace("0", "").replace("1", "").replace("2", "").replace("3", "").replace("4", "").replace("5", "").replace("6", "").replace("7", "").replace("8", "").replace("9", ""):
                # Skip empty or digit-only elements
                continue
            try:
                from pymatgen.core import Species
                species.append(Species(element))
            except Exception:
                try:
                    from pymatgen.core import Element
                    species.append(Element(element))
                except Exception:
                    continue
            coords.append([
                float(atom.get("x", 0.0)),
                float(atom.get("y", 0.0)),
                float(atom.get("z", 0.0)),
            ])

        if not species:
            logger.warning("No valid species from atoms")
            return None

        try:
            structure = Structure(lattice, species, coords)
            return structure
        except Exception as e:
            logger.warning("Could not create Structure: %s", e)
            return None

    @staticmethod
    def _two_theta_to_d_spacing(two_theta: float, wavelength: float) -> float:
        """Convert 2θ to d-spacing using Bragg's law."""
        import math
        theta_rad = math.radians(two_theta / 2.0)
        sin_theta = math.sin(theta_rad)
        if sin_theta <= 0:
            return 0.0
        return wavelength / (2.0 * sin_theta)
