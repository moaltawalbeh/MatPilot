"""Crystallography Open Database connector placeholder.

No endpoint or local indexed COD snapshot is configured in this deployment.  This
connector therefore reports that limitation rather than returning invented phases.
"""
from typing import Any, Dict, List, Optional
from ..base_connector import IReferenceDatabaseConnector
import logging

logger = logging.getLogger(__name__)


class CODConnector(IReferenceDatabaseConnector):
    @property
    def database_name(self) -> str:
        return "Crystallography Open Database (COD)"

    @property
    def instrument_type(self) -> str:
        return "XRD"

    def get_provider_status(self) -> Dict[str, Any]:
        return {"provider": self.database_name, "status": "UNAVAILABLE_NOT_CONFIGURED", "is_live": False,
                "detail": "No verified COD client or versioned local crystallographic cache is configured."}

    def search(self, query: Dict[str, Any], limit: int = 10) -> List[Dict[str, Any]]:
        logger.info("COD matching requested but provider is unavailable: %s", query)
        return []

    def get_reference_pattern(self, reference_id: str) -> Optional[Dict[str, Any]]:
        return None
