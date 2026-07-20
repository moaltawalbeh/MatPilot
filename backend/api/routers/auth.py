"""Auth API endpoints.

Uses Neon PostgreSQL for persistent user storage.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional

from backend.services.auth_service import AuthService
from backend.infrastructure.database.connection import AsyncSessionLocal
from backend.infrastructure.database.async_uow import AsyncUnitOfWork

router = APIRouter(prefix="/auth", tags=["Auth"])


async def get_db_auth_service():
    """Provide AuthService backed by Neon PostgreSQL."""
    async with AsyncSessionLocal() as session:
        uow = AsyncUnitOfWork(session)
        try:
            yield AuthService(uow)
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: Optional[str] = ""


class LoginRequest(BaseModel):
    username_or_email: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


async def get_current_user_dep(
    auth_service: AuthService = Depends(get_db_auth_service),
    request: Request = None,
):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header[7:]
    user = await auth_service.get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


@router.post("/register")
async def register(request: RegisterRequest, auth_service: AuthService = Depends(get_db_auth_service)):
    try:
        result = await auth_service.register(
            username=request.username,
            email=request.email,
            password=request.password,
            full_name=request.full_name or "",
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(request: LoginRequest, auth_service: AuthService = Depends(get_db_auth_service)):
    try:
        result = await auth_service.login(
            username_or_email=request.username_or_email,
            password=request.password,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/refresh")
async def refresh(request: RefreshRequest, auth_service: AuthService = Depends(get_db_auth_service)):
    try:
        result = await auth_service.refresh(request.refresh_token)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/me")
async def me(user=Depends(get_current_user_dep), auth_service: AuthService = Depends(get_db_auth_service)):
    return auth_service._user_to_dict(user)


@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}
