
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

from backend.domain.entities.material_record import MaterialRecord


class IReferenceProvider(ABC):
    """
    Interface for all reference database providers.

    Every scientific database (COD, Materials Project, etc.)
    must implement this interface. The Reference Engine
    communicates ONLY through this interface.

    This is the Adapter pattern. Each provider is an adapter
    between the MatPilot domain model and the external API.
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
        """Check if the provider is reachable."""
        raise NotImplementedError

    @abstractmethod
    def supported_features(self) -> List[str]:
        """List of supported search features."""
        raise NotImplementedError

    @abstractmethod
    def version(self) -> Optional[str]:
        """Provider API version."""
        raise NotImplementedError

    @abstractmethod
    async def search(
        self,
        query: str,
        filters: Dict[str, Any],
        limit: int,
        offset: int
    ) -> List[MaterialRecord]:
        """
        Search the provider for materials matching the query.

        Must return provider-independent MaterialRecord entities.
        """
        raise NotImplementedError

    @abstractmethod
    async def get_by_id(self, provider_id: str) -> Optional[MaterialRecord]:
        """Retrieve a specific material by provider ID."""
        raise NotImplementedError

    @abstractmethod
    async def get_diffraction_pattern(
        self,
        provider_id: str,
        wavelength: Optional[float] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve calculated diffraction pattern for a material.

        Returns dict with 'two_theta', 'intensity', 'hkl' arrays.
        """
        raise NotImplementedError
