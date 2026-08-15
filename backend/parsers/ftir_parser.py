from typing import Dict, Any, List
import io

class FTIRParser:
    """
    Dedicated parser for FTIR spectral files (.csv, .txt, .dpt, .spa).
    Parses wavenumber (cm⁻¹) and transmittance (%) or absorbance.
    """

    def can_parse(self, filename: str) -> bool:
        ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
        # Only delimited text is implemented.  Binary SPA/DPT formats require
        # vendor-format verification and must not be treated as UTF-8 text.
        return ext in ["csv", "txt", "ftir"]

    def parse(self, content: bytes, filename: str) -> Dict[str, Any]:
        """
        Parses raw bytes into wavenumbers (cm⁻¹) and transmittance array.
        """
        text = content.decode("utf-8", errors="ignore")
        lines = text.strip().split("\n")

        wavenumbers = []
        transmittance = []

        for line in lines:
            line = line.strip()
            if not line or line.startswith(("#", "//", "Wavenumber", "wavenumber", "cm-1")):
                continue
            parts = line.replace(",", " ").replace("\t", " ").split()
            if len(parts) >= 2:
                try:
                    wn = float(parts[0])
                    val = float(parts[1])
                    wavenumbers.append(wn)
                    transmittance.append(val)
                except ValueError:
                    continue

        if len(wavenumbers) < 2:
            raise ValueError("FTIR file contains fewer than two readable wavenumber/signal rows")

        # Ensure wavenumbers sorted descending (4000 -> 400 cm⁻¹)
        if wavenumbers and wavenumbers[0] < wavenumbers[-1]:
            wavenumbers.reverse()
            transmittance.reverse()

        return {
            "wavenumbers": wavenumbers,
            "transmittance": transmittance,
            "filename": filename,
            "data_points": len(wavenumbers)
        }
