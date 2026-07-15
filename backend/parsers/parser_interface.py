
from abc import ABC, abstractmethod
from typing import Dict, Any

from backend.domain.entities.xrd_experiment import XRDExperiment


class IParser(ABC):
    """
    Interface for all file format parsers.

    Every parser must convert its native format to the canonical
    XRDExperiment domain model. The application layer never sees
    raw file formats.

    Design: Strategy Pattern
    """

    @property
    @abstractmethod
    def format_name(self) -> str:
        """Human-readable format name."""
        raise NotImplementedError

    @property
    @abstractmethod
    def supported_extensions(self) -> list[str]:
        """List of supported file extensions."""
        raise NotImplementedError

    @property
    @abstractmethod
    def mime_types(self) -> list[str]:
        """List of supported MIME types."""
        raise NotImplementedError

    @abstractmethod
    async def parse(
        self,
        data: bytes,
        filename: str,
        metadata: Dict[str, Any]
    ) -> XRDExperiment:
        """
        Parse raw file data into canonical XRDExperiment model.

        Args:
            data: Raw file bytes
            filename: Original filename
            metadata: Additional metadata from upload

        Returns:
            XRDExperiment domain entity
        """
        raise NotImplementedError

    @abstractmethod
    def can_parse(self, filename: str) -> bool:
        """Check if this parser can handle the given filename."""
        raise NotImplementedError
