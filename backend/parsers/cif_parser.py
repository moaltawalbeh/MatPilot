
import re
from typing import Dict, Any, List

from backend.parsers.parser_interface import IParser
from backend.domain.entities.xrd_experiment import XRDExperiment
from backend.domain.value_objects.material import Material
from backend.domain.value_objects.wavelength import Wavelength, RadiationType
from backend.domain.value_objects.crystal_system import CrystalSystem
from backend.domain.value_objects.lattice_parameters import LatticeParameters


class CIFParser(IParser):
    """
    Parser for CIF (Crystallographic Information File).

    CIF files contain crystal structures, not diffraction patterns.
    This parser extracts:
    - Chemical formula
    - Unit cell parameters (a, b, c, alpha, beta, gamma)
    - Crystal system / space group
    - Symmetry operations

    Returns an XRDExperiment with structural metadata and empty pattern arrays.
    """

    @property
    def format_name(self) -> str:
        return "CIF"

    @property
    def supported_extensions(self) -> list[str]:
        return [".cif"]

    @property
    def mime_types(self) -> list[str]:
        return ["chemical/x-cif", "text/plain", "application/octet-stream"]

    def can_parse(self, filename: str) -> bool:
        return filename.lower().endswith(".cif")

    async def parse(
        self,
        data: bytes,
        filename: str,
        metadata: Dict[str, Any]
    ) -> XRDExperiment:
        text = data.decode("utf-8", errors="ignore")
        lines = text.splitlines()

        cif_data = self._parse_cif_lines(lines)

        # Build Material value object if we have enough data
        material = None
        if cif_data.get("formula") or cif_data.get("name") or cif_data.get("lattice_parameters"):
            material = Material(
                name=cif_data.get("name", ""),
                formula=cif_data.get("formula", ""),
                crystal_system=cif_data.get("crystal_system"),
                space_group=cif_data.get("space_group"),
                lattice_parameters=cif_data.get("lattice_parameters")
            )

        return XRDExperiment(
            name=filename,
            two_theta=[],
            intensity=[],
            wavelength=Wavelength.from_radiation_type(RadiationType.Cu_K_ALPHA_AVG),
            material=material,
            metadata={
                "source_format": self.format_name,
                "is_structure_file": True,
                "cif_data_name": cif_data.get("data_name", ""),
                "space_group": cif_data.get("space_group", ""),
                **metadata
            }
        )

    def _parse_cif_lines(self, lines: List[str]) -> Dict[str, Any]:
        """Extract key CIF tags."""
        result: Dict[str, Any] = {}

        for line in lines:
            line = line.strip()
            if not line or line.startswith("#"):
                continue

            # data_ block name
            if line.startswith("data_"):
                result["data_name"] = line[5:].strip()
                continue

            # Simple key-value pairs
            m = re.match(r"^(_\S+)\s+(.*)$", line)
            if m:
                key, value = m.group(1), m.group(2).strip().strip('"').strip("'")

                if key in ("_chemical_formula_sum", "_chemical_formula_structural"):
                    result["formula"] = value
                elif key == "_symmetry_space_group_name_H-M":
                    result["space_group"] = value
                elif key == "_chemical_name_systematic":
                    result["name"] = value
                elif key == "_cell_length_a":
                    result["a"] = self._to_float(value)
                elif key == "_cell_length_b":
                    result["b"] = self._to_float(value)
                elif key == "_cell_length_c":
                    result["c"] = self._to_float(value)
                elif key == "_cell_angle_alpha":
                    result["alpha"] = self._to_float(value)
                elif key == "_cell_angle_beta":
                    result["beta"] = self._to_float(value)
                elif key == "_cell_angle_gamma":
                    result["gamma"] = self._to_float(value)
                elif key == "_symmetry_cell_setting":
                    result["crystal_system_raw"] = value.lower()

        # Build lattice parameters if we have a, b, c
        if "a" in result and "b" in result and "c" in result:
            result["lattice_parameters"] = LatticeParameters(
                a=result["a"],
                b=result["b"],
                c=result["c"],
                alpha=result.get("alpha", 90.0),
                beta=result.get("beta", 90.0),
                gamma=result.get("gamma", 90.0)
            )

        # Map crystal system string to enum
        crystal_system_map = {
            "triclinic": CrystalSystem.TRICLINIC,
            "monoclinic": CrystalSystem.MONOCLINIC,
            "orthorhombic": CrystalSystem.ORTHORHOMBIC,
            "tetragonal": CrystalSystem.TETRAGONAL,
            "trigonal": CrystalSystem.TRIGONAL,
            "hexagonal": CrystalSystem.HEXAGONAL,
            "cubic": CrystalSystem.CUBIC,
        }
        cs_raw = result.get("crystal_system_raw", "")
        if cs_raw in crystal_system_map:
            result["crystal_system"] = crystal_system_map[cs_raw]

        return result

    @staticmethod
    def _to_float(value: str) -> float:
        """Convert CIF numeric string (may have uncertainty in parentheses) to float."""
        # Strip uncertainty: "5.4301(2)" -> "5.4301"
        cleaned = re.sub(r"\(.*?\)", "", value)
        try:
            return float(cleaned)
        except ValueError:
            return 0.0
