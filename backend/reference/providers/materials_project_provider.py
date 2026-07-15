
from typing import List, Dict, Any, Optional

from backend.reference.interfaces.reference_provider import IReferenceProvider
from backend.domain.entities.material_record import MaterialRecord


class MaterialsProjectProvider(IReferenceProvider):
    """
    Materials Project provider (placeholder).

    Future implementation will integrate with Materials Project REST API.
    API: https://materialsproject.org/api
    """

    @property
    def name(self) -> str:
        return "MaterialsProject"

    @property
    def display_name(self) -> str:
        return "Materials Project"

    @property
    def description(self) -> str:
        return "Computational materials science database."

    def is_available(self) -> bool:
        return False  # Not yet implemented

    def supported_features(self) -> List[str]:
        return []

    def version(self) -> Optional[str]:
        return None

    async def search(
        self,
        query: str,
        filters: Dict[str, Any],
        limit: int,
        offset: int
    ) -> List[MaterialRecord]:
        return []

    async def get_by_id(self, provider_id: str) -> Optional[MaterialRecord]:
        return None

    async def get_diffraction_pattern(
        self,
        provider_id: str,
        wavelength: Optional[float] = None
    ) -> Optional[Dict[str, Any]]:
        return None
