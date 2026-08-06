"""Spectral reference providers package.

Instrument workspaces query spectroscopy databases (FTIR, Raman, UV-Vis)
through :class:`ISpectralProvider` adapters. The offline built-in library is
always registered first; live providers (Open Specy, Ramanbase) layer on top
when reachable, and architected-but-not-live databases (SDBS, NIST,
PhotochemCAD, ...) are registered as unavailable stubs that document their
integration path.
"""

from backend.reference.spectral_providers.interfaces import (
    ISpectralProvider,
    SpectralMatch,
    SpectralReference,
)
from backend.reference.spectral_providers.spectral_reference_service import (
    SpectralReferenceService,
)

__all__ = [
    "ISpectralProvider",
    "SpectralReference",
    "SpectralMatch",
    "SpectralReferenceService",
]
