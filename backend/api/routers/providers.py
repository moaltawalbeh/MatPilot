"""Reference providers API endpoint."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional

from backend.api.dependencies import get_container

router = APIRouter(prefix="/providers", tags=["Reference"])


class ProviderInfo(BaseModel):
    name: str
    display_name: str
    description: str
    is_available: bool
    supported_features: List[str]
    version: Optional[str]


@router.get("", response_model=List[ProviderInfo])
async def list_providers(container=Depends(get_container)):
    """List all registered reference providers."""
    use_case = container.get_providers_use_case
    providers = await use_case.execute()
    return [
        ProviderInfo(
            name=p.name,
            display_name=p.display_name,
            description=p.description,
            is_available=p.is_available,
            supported_features=p.supported_features,
            version=p.version,
        )
        for p in providers
    ]
