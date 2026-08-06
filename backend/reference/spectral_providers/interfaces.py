"""Spectral reference database contracts.

Spectroscopy instruments (FTIR, Raman, UV-Vis) query reference libraries that
return *spectra*, not crystal structures. The XRD-centric ``IReferenceProvider``
(MaterialRecord / diffraction patterns) does not fit those databases, so this
package defines a dedicated adapter interface plus the value objects shared by
every spectral provider (Open Specy, Ramanbase, SDBS, NIST, ...).
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class SpectralReference:
    """A reference spectrum returned by a spectral database.

    The same record type is produced by every provider so the instrument
    workspaces can render "library search" and "spectral matching" results
    uniformly, no matter which database was queried.
    """

    reference_id: str
    title: str
    technique: str  # "ftir" | "raman" | "uvvis"
    category: str = ""  # polymer / mineral / organic / inorganic / dye ...
    formula: Optional[str] = None
    x_axis: str = "wavenumber"  # wavenumber | raman_shift | wavelength_nm
    x: Optional[List[float]] = None
    y: Optional[List[float]] = None
    peaks: Optional[List[Dict[str, Any]]] = None
    source: str = ""
    source_url: str = ""
    license: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "reference_id": self.reference_id,
            "title": self.title,
            "technique": self.technique,
            "category": self.category,
            "formula": self.formula,
            "x_axis": self.x_axis,
            "x": self.x,
            "y": self.y,
            "peaks": self.peaks,
            "source": self.source,
            "source_url": self.source_url,
            "license": self.license,
            "metadata": self.metadata,
        }


@dataclass
class SpectralMatch:
    """A spectral-matching hit: reference plus similarity score (0-100)."""

    reference: SpectralReference
    score: float = 0.0
    algorithm: str = ""
    details: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "reference": self.reference.to_dict(),
            "score": round(float(self.score), 2),
            "algorithm": self.algorithm,
            "details": self.details or {},
        }


class ISpectralProvider(ABC):
    """Adapter contract for spectral reference databases.

    Each provider is an adapter between the MatPilot instrument workspace and
    the external spectroscopy database (Open Specy, Ramanbase, SDBS, NIST
    WebBook, PhotochemCAD, Raman Open Database, SpectraBase, ...).
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique provider identifier."""
        raise NotImplementedError

    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable provider name."""
        raise NotImplementedError

    @property
    @abstractmethod
    def description(self) -> str:
        """Provider description."""
        raise NotImplementedError

    @abstractmethod
    def is_available(self) -> bool:
        """Check whether the provider is reachable right now."""
        raise NotImplementedError

    @abstractmethod
    def supported_features(self) -> List[str]:
        """List of supported search features."""
        raise NotImplementedError

    @abstractmethod
    def version(self) -> Optional[str]:
        """Provider/API version."""
        raise NotImplementedError

    @abstractmethod
    def supported_techniques(self) -> List[str]:
        """Techniques this provider can answer for: "ftir", "raman", "uvvis"."""
        raise NotImplementedError

    @abstractmethod
    async def search(
        self,
        query: str,
        limit: int = 20,
        technique: Optional[str] = None,
    ) -> List[SpectralReference]:
        """Search the database by name / formula / keyword."""
        raise NotImplementedError

    @abstractmethod
    async def get_reference(self, reference_id: str) -> Optional[SpectralReference]:
        """Retrieve a specific reference spectrum by provider ID."""
        raise NotImplementedError

    @abstractmethod
    async def match_spectrum(
        self,
        x: List[float],
        y: List[float],
        limit: int = 10,
        technique: Optional[str] = None,
    ) -> List[SpectralMatch]:
        """Match a measured spectrum against the reference library."""
        raise NotImplementedError
