from typing import Dict, Any, List

class RamanParser:
    """
    Dedicated parser for Raman spectral files (.csv, .txt, .spc, .wdf).
    Parses Raman shift (cm⁻¹) and intensity (a.u.).
    """

    def can_parse(self, filename: str) -> bool:
        ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
        # SPC/WDF are binary vendor formats and are intentionally not parsed as
        # text until a validated, format-specific adapter is supplied.
        return ext in ["csv", "txt", "raman"]

    def parse(self, content: bytes, filename: str) -> Dict[str, Any]:
        """
        Parses raw bytes into Raman shift (cm⁻¹) and intensity array.
        """
        text = content.decode("utf-8", errors="ignore")
        lines = text.strip().split("\n")

        raman_shift = []
        intensity = []

        for line in lines:
            line = line.strip()
            if not line or line.startswith(("#", "//", "Raman", "shift", "Shift", "cm-1")):
                continue
            parts = line.replace(",", " ").replace("\t", " ").split()
            if len(parts) >= 2:
                try:
                    shift = float(parts[0])
                    val = float(parts[1])
                    raman_shift.append(shift)
                    intensity.append(val)
                except ValueError:
                    continue

        if len(raman_shift) < 2:
            raise ValueError("Raman file contains fewer than two readable shift/intensity rows")

        # Ensure raman shift sorted ascending (100 -> 3200 cm⁻¹)
        if raman_shift and raman_shift[0] > raman_shift[-1]:
            raman_shift.reverse()
            intensity.reverse()

        return {
            "raman_shift": raman_shift,
            "intensity": intensity,
            "filename": filename,
            "data_points": len(raman_shift)
        }
