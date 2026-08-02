
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


# Canonical K-alpha wavelengths in Angstroms (NIST X-ray Transition Energies
# database / Deslattes et al. 2003; see docs/research_ka2_background.md Table 3).
# These are the single source of truth for the scientific engine.
CU_KA1_ANGSTROM = 1.540598
CU_KA2_ANGSTROM = 1.544426
CU_KA_AVG_ANGSTROM = (2.0 * CU_KA1_ANGSTROM + CU_KA2_ANGSTROM) / 3.0

MO_KA1_ANGSTROM = 0.709319
MO_KA2_ANGSTROM = 0.713609
MO_KA_AVG_ANGSTROM = (2.0 * MO_KA1_ANGSTROM + MO_KA2_ANGSTROM) / 3.0

CO_KA1_ANGSTROM = 1.788965
CO_KA2_ANGSTROM = 1.792850
CO_KA_AVG_ANGSTROM = (2.0 * CO_KA1_ANGSTROM + CO_KA2_ANGSTROM) / 3.0

FE_KA1_ANGSTROM = 1.936042
FE_KA2_ANGSTROM = 1.939980
FE_KA_AVG_ANGSTROM = (2.0 * FE_KA1_ANGSTROM + FE_KA2_ANGSTROM) / 3.0

CR_KA1_ANGSTROM = 2.289760
CR_KA2_ANGSTROM = 2.293606
CR_KA_AVG_ANGSTROM = (2.0 * CR_KA1_ANGSTROM + CR_KA2_ANGSTROM) / 3.0


@dataclass(frozen=True)
class Wavelength:
    """Value object representing X-ray wavelength."""
    value_angstrom: float
    radiation_type: RadiationType = RadiationType.Cu_K_ALPHA_AVG

    @classmethod
    def from_radiation_type(cls, radiation: RadiationType) -> 'Wavelength':
        wavelengths = {
            RadiationType.Cu_K_ALPHA1: CU_KA1_ANGSTROM,
            RadiationType.Cu_K_ALPHA2: CU_KA2_ANGSTROM,
            RadiationType.Cu_K_ALPHA_AVG: CU_KA_AVG_ANGSTROM,
            RadiationType.Mo_K_ALPHA: MO_KA1_ANGSTROM,
            RadiationType.Co_K_ALPHA: CO_KA1_ANGSTROM,
            RadiationType.Fe_K_ALPHA: FE_KA1_ANGSTROM,
            RadiationType.Cr_K_ALPHA: CR_KA1_ANGSTROM,
        }
        return cls(
            value_angstrom=wavelengths.get(radiation, CU_KA_AVG_ANGSTROM),
            radiation_type=radiation
        )
