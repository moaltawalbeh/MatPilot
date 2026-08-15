from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class IReferenceDatabaseConnector(ABC):
    """
    Interface for all external reference database connectors.
    Ensures that no scientific module queries external APIs directly.
    """
    
    @property
    @abstractmethod
    def database_name(self) -> str:
        """Name of the reference database (e.g., 'COD', 'OpenSpecy')."""
        pass

    @property
    @abstractmethod
    def instrument_type(self) -> str:
        """The instrument type this database serves (e.g., 'XRD', 'FTIR')."""
        pass

    @abstractmethod
    def search(self, query: Dict[str, Any], limit: int = 10) -> List[Dict[str, Any]]:
        """
        Executes a search against the external database or the local cache.
        """
        pass

    @abstractmethod
    def get_reference_pattern(self, reference_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a full reference pattern by ID.
        """
        pass
