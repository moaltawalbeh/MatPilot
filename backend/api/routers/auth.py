"""Auth API endpoints.

Uses the app DI container's unit of work — Neon PostgreSQL when
``DATABASE_URL`` is configured, in-memory otherwise (local dev).
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional

from backend.api.dependencies import get_container
from backend.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])


async def get_db_auth_service(request: Request = None):
    """Provide an AuthService backed by the container's unit of work."""
    container = get_container(request)
    email_cfg = container.config.email
    yield AuthService(
        container.uow,
        email_provider=container.email_provider,
        app_url=email_cfg.app_url,
        verification_code_length=email_cfg.verification_code_length,
    )


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


class VerifyEmailRequest(BaseModel):
    token: str


class VerifyCodeRequest(BaseModel):
    email: str
    code: str


class ResendVerificationRequest(BaseModel):
    email: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


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
        return await auth_service.register(
            username=request.username,
            email=request.email,
            password=request.password,
            full_name=request.full_name or "",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(request: LoginRequest, auth_service: AuthService = Depends(get_db_auth_service)):
    try:
        return await auth_service.login(
            username_or_email=request.username_or_email,
            password=request.password,
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/refresh")
async def refresh(request: RefreshRequest, auth_service: AuthService = Depends(get_db_auth_service)):
    try:
        return await auth_service.refresh(request.refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/verify-email")
async def verify_email(request: VerifyEmailRequest, auth_service: AuthService = Depends(get_db_auth_service)):
    try:
        return await auth_service.verify_email(request.token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/verify-code")
async def verify_code(request: VerifyCodeRequest, auth_service: AuthService = Depends(get_db_auth_service)):
    try:
        return await auth_service.verify_code(request.email, request.code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/resend-verification")
async def resend_verification(
    request: ResendVerificationRequest,
    auth_service: AuthService = Depends(get_db_auth_service),
):
    return await auth_service.resend_verification(request.email)


@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    auth_service: AuthService = Depends(get_db_auth_service),
):
    return await auth_service.forgot_password(request.email)


@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    auth_service: AuthService = Depends(get_db_auth_service),
):
    try:
        return await auth_service.reset_password(request.token, request.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    user=Depends(get_current_user_dep),
    auth_service: AuthService = Depends(get_db_auth_service),
):
    try:
        return await auth_service.change_password(user, request.old_password, request.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/logout")
async def logout(
    user=Depends(get_current_user_dep),
    auth_service: AuthService = Depends(get_db_auth_service),
):
    await auth_service.logout(user)
    return {"message": "Logged out successfully"}


@router.get("/me")
async def me(user=Depends(get_current_user_dep), auth_service: AuthService = Depends(get_db_auth_service)):
    return auth_service._user_to_dict(user)
