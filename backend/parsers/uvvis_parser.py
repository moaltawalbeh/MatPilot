from typing import Dict, Any, List

class UVVisParser:
    """
    Dedicated parser for UV-Vis optical spectroscopy files (.csv, .txt).
    Parses wavelength (nm) and absorbance / transmittance / reflectance.
    """

    def can_parse(self, filename: str) -> bool:
        ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
        return ext in ["csv", "txt", "uvvis", "abs"]

    def parse(self, content: bytes, filename: str) -> Dict[str, Any]:
        """
        Parses raw bytes into wavelength (nm) and signal intensity array.
        Also determines measurement mode (Absorbance, Transmittance, Reflectance).
        """
        text = content.decode("utf-8", errors="ignore")
        lines = text.strip().split("\n")

        wavelength_nm = []
        signal_vals = []
        mode = "Absorbance"

        for line in lines:
            line_str = line.strip()
            if "reflectance" in line_str.lower() or "%r" in line_str.lower():
                mode = "Reflectance"
            elif "transmittance" in line_str.lower() or "%t" in line_str.lower():
                mode = "Transmittance"

            if not line_str or line_str.startswith(("#", "//", "Wavelength", "wavelength", "nm")):
                continue
            parts = line_str.replace(",", " ").replace("\t", " ").split()
            if len(parts) >= 2:
                try:
                    wl = float(parts[0])
                    val = float(parts[1])
                    wavelength_nm.append(wl)
                    signal_vals.append(val)
                except ValueError:
                    continue

        if len(wavelength_nm) < 2:
            raise ValueError("UV-Vis file contains fewer than two readable wavelength/signal rows")

        # Ensure wavelength sorted ascending (200 -> 800 nm)
        if wavelength_nm and wavelength_nm[0] > wavelength_nm[-1]:
            wavelength_nm.reverse()
            signal_vals.reverse()

        return {
            "wavelength_nm": wavelength_nm,
            "signal_values": signal_vals,
            "measurement_mode": mode,
            "filename": filename,
            "data_points": len(wavelength_nm)
        }
