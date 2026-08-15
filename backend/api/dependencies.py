"""FastAPI dependency injection helpers."""

from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, Depends


def get_container(request: Request):
    return request.app.state.container


async def get_current_user_optional(request: Request) -> Optional[Dict[str, Any]]:
    """Get the current authenticated user if Authorization header is present."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:]
    container = get_container(request)
    from backend.services.auth_service import AuthService
    auth_service = AuthService(container.uow)
    try:
        return await auth_service.get_current_user(token)
    except Exception:
        return None


async def get_current_user_required(user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)) -> Dict[str, Any]:
    """Require an authenticated user."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user
