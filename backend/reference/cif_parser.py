"""CIF File Parser.

Extracts crystallographic data from CIF (Crystallographic Information File) format.
Parses unit cell parameters, space group, atomic positions, and structure factors.

Implements a subset of CIF standard sufficient for powder diffraction pattern generation.
"""

import re
import math
import logging
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("cif_parser")


class CIFParser:
    """
    Parse CIF (Crystallographic Information File) content.

    Extracts:
    - Unit cell parameters (a, b, c, alpha, beta, gamma)
    - Space group (symbol and number)
    - Chemical formula
    - Atomic positions (for structure factor calculation)
    - Reflections (if _refln_ fields present)
    """

    def parse(self, cif_content: str) -> Dict[str, Any]:
        """Parse CIF content and return crystallographic data dict."""
        result: Dict[str, Any] = {
            "formula": "",
            "formula_sum": "",
            "space_group": "",
            "space_group_number": 0,
            "crystal_system": "",
            "unit_cell": {
                "a": 0.0, "b": 0.0, "c": 0.0,
                "alpha": 90.0, "beta": 90.0, "gamma": 90.0,
            },
            "atoms": [],
            "reflections": [],
        }

        lines = cif_content.split("\n")
        current_loop: Optional[str] = None
        loop_headers: List[str] = []
        loop_values: List[List[str]] = []

        for line in lines:
            stripped = line.strip()

            if not stripped or stripped.startswith("#"):
                continue

            if stripped.startswith("loop_"):
                if current_loop and loop_headers and loop_values:
                    self._process_loop(result, current_loop, loop_headers, loop_values)
                current_loop = "unknown"
                loop_headers = []
                loop_values = []
                continue

            if stripped.startswith("_"):
                parts = stripped.split(None, 1)
                has_value = len(parts) > 1 and not parts[1].startswith("_")

                if current_loop == "unknown" and not loop_headers:
                    if has_value:
                        # Single value assignment (field + value on same line)
                        self._parse_single_value(result, stripped)
                        continue
                    current_loop = self._classify_field(stripped)
                    if current_loop != "unknown":
                        loop_headers.append(stripped)
                        continue
                    else:
                        self._parse_single_value(result, stripped)
                        continue
                elif current_loop and loop_headers:
                    if has_value:
                        # Field + value on same line → close loop, parse as single
                        self._process_loop(result, current_loop, loop_headers, loop_values)
                        current_loop = "unknown"
                        loop_headers = []
                        loop_values = []
                        self._parse_single_value(result, stripped)
                        continue
                    # Check if this field belongs to the current loop
                    field_type = self._classify_field(stripped)
                    if field_type == current_loop or field_type == "unknown":
                        loop_headers.append(stripped)
                        continue
                    else:
                        # Different loop type → close current loop, start new
                        self._process_loop(result, current_loop, loop_headers, loop_values)
                        current_loop = field_type
                        if current_loop != "unknown":
                            loop_headers = [stripped]
                            loop_values = []
                            continue
                        else:
                            loop_headers = []
                            loop_values = []
                            self._parse_single_value(result, stripped)
                            continue
                else:
                    # Single value assignment
                    self._parse_single_value(result, stripped)
                    continue

            if current_loop and loop_headers:
                parts = stripped.split()
                if parts and not stripped.startswith("_"):
                    loop_values.append(parts)

        # Process last loop
        if current_loop and loop_headers and loop_values:
            self._process_loop(result, current_loop, loop_headers, loop_values)

        # Determine crystal system from space group
        result["crystal_system"] = self._determine_crystal_system(
            result["space_group_number"], result["space_group"]
        )

        # Generate formula from atoms if not found
        if not result["formula"] and result["atoms"]:
            result["formula"] = self._generate_formula(result["atoms"])

        return result

    def _classify_field(self, field_line: str) -> str:
        """Classify a CIF field into a loop category."""
        field = field_line.split()[0] if field_line.split() else ""

        if field.startswith("_atom_site"):
            return "atom_site"
        if field.startswith("_cell"):
            return "cell"
        if field.startswith("_symmetry") or field.startswith("_space_group"):
            return "symmetry"
        if field.startswith("_refln"):
            return "refln"
        if field.startswith("_atom_type"):
            return "atom_type"
        if field.startswith("_diffrn"):
            return "diffrn"
        return "unknown"

    def _parse_single_value(self, result: Dict, line: str):
        """Parse a single CIF value assignment (field value)."""
        parts = line.split(None, 1)
        if len(parts) < 2:
            return

        field = parts[0]
        raw_value = parts[1].strip().strip("'").strip('"')

        if field == "_chemical_formula_sum" or field == "_chemical_formula_structural":
            result["formula_sum"] = raw_value
            if not result["formula"]:
                result["formula"] = raw_value.replace(" ", "")
        elif field == "_chemical_name_mineral":
            result["name"] = raw_value
        elif field == "_symmetry_space_group_name_H-M":
            result["space_group"] = raw_value.strip()
        elif field == "_space_group_name_H-M_alt":
            if not result["space_group"]:
                result["space_group"] = raw_value.strip()
        elif field == "_symmetry_space_group_number":
            try:
                result["space_group_number"] = int(raw_value)
            except ValueError:
                pass
        elif field == "_space_group.IT_number":
            try:
                result["space_group_number"] = int(raw_value)
            except ValueError:
                pass
        elif field == "_cell_length_a":
            result["unit_cell"]["a"] = self._parse_cif_number(raw_value)
        elif field == "_cell_length_b":
            result["unit_cell"]["b"] = self._parse_cif_number(raw_value)
        elif field == "_cell_length_c":
            result["unit_cell"]["c"] = self._parse_cif_number(raw_value)
        elif field == "_cell_angle_alpha":
            result["unit_cell"]["alpha"] = self._parse_cif_number(raw_value)
        elif field == "_cell_angle_beta":
            result["unit_cell"]["beta"] = self._parse_cif_number(raw_value)
        elif field == "_cell_angle_gamma":
            result["unit_cell"]["gamma"] = self._parse_cif_number(raw_value)

    def _parse_cif_number(self, value: str) -> float:
        """Parse a CIF number, handling uncertainty notation like '5.43(2)'."""
        value = value.split("(")[0].split("(")[0]
        value = value.strip().rstrip(")")
        try:
            return float(value)
        except ValueError:
            return 0.0

    def _process_loop(
        self,
        result: Dict,
        loop_type: str,
        headers: List[str],
        values: List[List[str]],
    ):
        """Process a CIF loop block."""
        if loop_type == "atom_site":
            self._parse_atom_site_loop(result, headers, values)
        elif loop_type == "refln":
            self._parse_refln_loop(result, headers, values)
        elif loop_type == "cell":
            self._parse_cell_loop(result, headers, values)

    def _parse_atom_site_loop(
        self,
        result: Dict,
        headers: List[str],
        values: List[List[str]],
    ):
        """Parse _atom_site loop to extract atomic positions."""
        headers_clean = [h.strip() for h in headers]

        # Find column indices
        label_idx = self._find_column(headers_clean, ["_atom_site_label", "_atom_site_type_symbol"])
        x_idx = self._find_column(headers_clean, ["_atom_site_fract_x"])
        y_idx = self._find_column(headers_clean, ["_atom_site_fract_y"])
        z_idx = self._find_column(headers_clean, ["_atom_site_fract_z"])
        occ_idx = self._find_column(headers_clean, ["_atom_site_occupancy"])
        adp_type_idx = self._find_column(headers_clean, ["_atom_site_adp_type"])
        u_iso_idx = self._find_column(headers_clean, ["_atom_site_U_iso_or_equiv"])
        b_iso_idx = self._find_column(headers_clean, ["_atom_site_B_iso_or_equiv"])

        for row in values:
            if len(row) < max(filter(None, [label_idx, x_idx, y_idx, z_idx]), default=0) + 1:
                continue

            atom: Dict[str, Any] = {}
            if label_idx is not None and label_idx < len(row):
                atom["label"] = row[label_idx].strip()
                # Extract element from label (e.g., "Fe1" → "Fe", "O2" → "O")
                atom["element"] = re.sub(r'\d+', '', row[label_idx].strip())
            if x_idx is not None and x_idx < len(row):
                atom["x"] = self._parse_cif_number(row[x_idx])
            if y_idx is not None and y_idx < len(row):
                atom["y"] = self._parse_cif_number(row[y_idx])
            if z_idx is not None and z_idx < len(row):
                atom["z"] = self._parse_cif_number(row[z_idx])
            if occ_idx is not None and occ_idx < len(row):
                atom["occupancy"] = self._parse_cif_number(row[occ_idx])
            if u_iso_idx is not None and u_iso_idx < len(row):
                atom["u_iso"] = self._parse_cif_number(row[u_iso_idx])
            if b_iso_idx is not None and b_iso_idx < len(row):
                atom["b_iso"] = self._parse_cif_number(row[b_iso_idx])

            if "element" in atom and atom["element"]:
                result["atoms"].append(atom)

    def _parse_refln_loop(
        self,
        result: Dict,
        headers: List[str],
        values: List[List[str]],
    ):
        """Parse _refln loop for observed/calculated reflections."""
        headers_clean = [h.strip() for h in headers]

        h_idx = self._find_column(headers_clean, ["_refln_index_h"])
        k_idx = self._find_column(headers_clean, ["_refln_index_k"])
        l_idx = self._find_column(headers_clean, ["_refln_index_l"])
        f_meas_idx = self._find_column(headers_clean, ["_refln_F_meas"])
        f_calc_idx = self._find_column(headers_clean, ["_refln_F_calc"])
        f_sq_meas_idx = self._find_column(headers_clean, ["_refln_F_squared_meas"])
        f_sq_calc_idx = self._find_column(headers_clean, ["_refln_F_squared_calc"])
        status_idx = self._find_column(headers_clean, ["_refln_status"])

        for row in values:
            max_needed = max(filter(None, [h_idx, k_idx, l_idx]), default=0) + 1
            if len(row) < max_needed:
                continue

            refln: Dict[str, Any] = {}
            if h_idx is not None and h_idx < len(row):
                try:
                    refln["h"] = int(row[h_idx])
                except ValueError:
                    continue
            if k_idx is not None and k_idx < len(row):
                try:
                    refln["k"] = int(row[k_idx])
                except ValueError:
                    continue
            if l_idx is not None and l_idx < len(row):
                try:
                    refln["l"] = int(row[l_idx])
                except ValueError:
                    continue
            if f_sq_meas_idx is not None and f_sq_meas_idx < len(row):
                refln["f_squared_meas"] = self._parse_cif_number(row[f_sq_meas_idx])
            if f_sq_calc_idx is not None and f_sq_calc_idx < len(row):
                refln["f_squared_calc"] = self._parse_cif_number(row[f_sq_calc_idx])
            if f_meas_idx is not None and f_meas_idx < len(row):
                refln["f_meas"] = self._parse_cif_number(row[f_meas_idx])
            if f_calc_idx is not None and f_calc_idx < len(row):
                refln["f_calc"] = self._parse_cif_number(row[f_calc_idx])

            # Only include reflections with measurable intensity
            has_intensity = (
                refln.get("f_squared_meas", 0) > 0 or
                refln.get("f_meas", 0) > 0
            )
            if "h" in refln and has_intensity:
                result["reflections"].append(refln)

    def _parse_cell_loop(
        self,
        result: Dict,
        headers: List[str],
        values: List[List[str]],
    ):
        """Parse a _cell loop (rare but possible)."""
        for row in values:
            if len(row) >= 6:
                try:
                    result["unit_cell"]["a"] = float(row[0])
                    result["unit_cell"]["b"] = float(row[1])
                    result["unit_cell"]["c"] = float(row[2])
                    result["unit_cell"]["alpha"] = float(row[3])
                    result["unit_cell"]["beta"] = float(row[4])
                    result["unit_cell"]["gamma"] = float(row[5])
                except (ValueError, IndexError):
                    pass

    def _find_column(self, headers: List[str], candidates: List[str]) -> Optional[int]:
        """Find index of a column in loop headers."""
        for i, header in enumerate(headers):
            for candidate in candidates:
                if header == candidate or header.startswith(candidate):
                    return i
        return None

    def _generate_formula(self, atoms: List[Dict]) -> str:
        """Generate Hill notation formula from atom list."""
        counts: Dict[str, int] = {}
        for atom in atoms:
            elem = atom.get("element", "")
            if elem:
                counts[elem] = counts.get(elem, 0) + 1

        # Hill order: C first, H second, then alphabetical
        elements = sorted(counts.keys(), key=lambda e: (
            (0, e) if e == "C" else (1, e) if e == "H" else (2, e)
        ))

        parts = []
        for elem in elements:
            count = counts[elem]
            parts.append(elem)
            if count > 1:
                parts.append(str(count))

        return "".join(parts)

    def _determine_crystal_system(self, sg_number: int, sg_symbol: str) -> str:
        """Determine crystal system from space group number or symbol."""
        if 1 <= sg_number <= 2:
            return "Triclinic"
        if 3 <= sg_number <= 15:
            return "Monoclinic"
        if 16 <= sg_number <= 74:
            return "Orthorhombic"
        if 75 <= sg_number <= 142:
            return "Tetragonal"
        if 143 <= sg_number <= 167:
            return "Trigonal"
        if 168 <= sg_number <= 194:
            return "Hexagonal"
        if 195 <= sg_number <= 230:
            return "Cubic"

        # Fallback: parse symbol
        symbol_upper = sg_symbol.upper()
        if "CUBIC" in symbol_upper or any(s in symbol_upper for s in ["F", "I", "P23", "P43"]):
            return "Cubic"
        if any(s in symbol_upper for s in ["HEX", "P6", "P63"]):
            return "Hexagonal"
        if any(s in symbol_upper for s in ["TET", "P4", "I4"]):
            return "Tetragonal"
        if any(s in symbol_upper for s in ["TRIG", "R3", "P3"]):
            return "Trigonal"
        if any(s in symbol_upper for s in ["ORTH", "P222", "C222", "F222", "I222"]):
            return "Orthorhombic"
        if any(s in symbol_upper for s in ["MONO", "P21", "C2", "P2/"]):
            return "Monoclinic"
        if any(s in symbol_upper for s in ["TRIC", "P1"]):
            return "Triclinic"

        return "Unknown"
