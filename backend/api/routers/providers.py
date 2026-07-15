
from fastapi import APIRouter, Depends
from backend.api.dependencies import get_container

router = APIRouter(prefix="/providers", tags=["Reference"])


@router.get("")
async def list_providers(container = Depends(get_container)):
    """
    List all registered reference providers.

    Returns provider names and availability status.
    """
    use_case = container.get_providers_use_case
    providers = await use_case.execute()

    return [
        {
            "name": p.name,
            "display_name": p.display_name,
            "description": p.description,
            "is_available": p.is_available,
            "supported_features": p.supported_features,
            "version": p.version
        }
        for p in providers
    ]
