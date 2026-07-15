
from typing import List, Dict, Any, Optional

from backend.reference.interfaces.reference_provider import IReferenceProvider
from backend.domain.entities.material_record import MaterialRecord


class PubChemProvider(IReferenceProvider):
    """
    PubChem provider (placeholder).

    Future chemistry support. Currently returns empty results.
    """

    @property
    def name(self) -> str:
        return "PubChem"

    @property
    def display_name(self) -> str:
        return "PubChem"

    @property
    def description(self) -> str:
        return "Chemical substances database (future chemistry support)."

    def is_available(self) -> bool:
        return False

    def supported_features(self) -> List[str]:
        return []

    def version(self) -> Optional[str]:
        return None

    async def search(self, query, filters, limit, offset):
        return []

    async def get_by_id(self, provider_id):
        return None

    async def get_diffraction_pattern(self, provider_id, wavelength=None):
        return None
