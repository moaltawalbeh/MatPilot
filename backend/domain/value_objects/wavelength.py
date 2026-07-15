
from dataclasses import dataclass
from typing import Optional
from enum import Enum


class RadiationType(Enum):
    Cu_K_ALPHA1 = "Cu Kα1"
    Cu_K_ALPHA2 = "Cu Kα2"
    Cu_K_ALPHA_AVG = "Cu Kα (avg)"
    Mo_K_ALPHA = "Mo Kα"
    Co_K_ALPHA = "Co Kα"
    Fe_K_ALPHA = "Fe Kα"
    Cr_K_ALPHA = "Cr Kα"
    SYNCHROTRON = "Synchrotron"
    CUSTOM = "Custom"


@dataclass(frozen=True)
class Wavelength:
    """Value object representing X-ray wavelength."""
    value_angstrom: float
    radiation_type: RadiationType = RadiationType.Cu_K_ALPHA_AVG

    @classmethod
    def from_radiation_type(cls, radiation: RadiationType) -> 'Wavelength':
        wavelengths = {
            RadiationType.Cu_K_ALPHA1: 1.540598,
            RadiationType.Cu_K_ALPHA2: 1.544426,
            RadiationType.Cu_K_ALPHA_AVG: 1.541874,
            RadiationType.Mo_K_ALPHA: 0.709317,
            RadiationType.Co_K_ALPHA: 1.789010,
            RadiationType.Fe_K_ALPHA: 1.937355,
            RadiationType.Cr_K_ALPHA: 2.29100,
        }
        return cls(
            value_angstrom=wavelengths.get(radiation, 1.541874),
            radiation_type=radiation
        )
