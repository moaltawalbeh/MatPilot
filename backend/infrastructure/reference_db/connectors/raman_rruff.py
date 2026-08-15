"""Raman reference connector; deliberately non-fabricating until configured."""
from typing import Any, Dict, List, Optional
from ..base_connector import IReferenceDatabaseConnector
import logging

logger = logging.getLogger(__name__)


class RRUFFConnector(IReferenceDatabaseConnector):
    @property
    def database_name(self) -> str:
        return "RRUFF Raman reference library"

    @property
    def instrument_type(self) -> str:
        return "RAMAN"

    def get_provider_status(self) -> Dict[str, Any]:
        return {"provider": self.database_name, "status": "UNAVAILABLE_NOT_CONFIGURED", "is_live": False,
                "detail": "No verified live API or versioned local Raman library is configured."}

    def search(self, query: Dict[str, Any], limit: int = 10) -> List[Dict[str, Any]]:
        logger.info("Raman library search requested but provider is unavailable: %s", query)
        return []

    def get_reference_pattern(self, reference_id: str) -> Optional[Dict[str, Any]]:
        return None
