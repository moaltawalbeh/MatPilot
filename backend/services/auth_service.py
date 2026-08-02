"""Authentication Service.

Handles JWT token creation/validation, password hashing, user registration/login,
email verification, password reset, and token revocation via a per-user
``token_version`` embedded in every issued JWT. Bumping ``token_version``
(e.g. on logout or password change) invalidates all outstanding tokens.
"""

import os
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID, uuid4

import jwt
from passlib.context import CryptContext

from backend.domain.entities.user import User, UserRole, UserStatus

SECRET_KEY = os.environ.get(
    "MATPILOT_SECRET_KEY", "matpilot-secret-key-change-in-production"
)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("MATPILOT_ACCESS_TOKEN_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.environ.get("MATPILOT_REFRESH_TOKEN_DAYS", "7"))
# Number of minutes the email verification / password reset tokens stay valid.
VERIFY_TOKEN_EXPIRE_MINUTES = int(os.environ.get("MATPILOT_VERIFY_TOKEN_MINUTES", "60"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    def __init__(self, uow):
        self.uow = uow

    def hash_password(self, password: str) -> str:
        return pwd_context.hash(password)

    def verify_password(self, plain: str, hashed: str) -> bool:
        return pwd_context.verify(plain, hashed)

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        to_encode.update({"exp": expire, "type": "access", "jti": uuid4().hex})
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    def create_refresh_token(self, data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh", "jti": uuid4().hex})
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    def create_verification_token(self) -> str:
        return uuid4().hex

    def decode_token(self, token: str) -> dict:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    def _token_payload(self, user: User) -> dict:
        return {
            "sub": str(user.id),
            "username": user.username,
            "ver": user.token_version,
        }

    def _user_to_dict(self, user: User) -> dict:
        return {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.name,
            "status": user.status.name,
            "is_verified": user.is_verified,
            "organization_id": str(user.organization_id) if user.organization_id else None,
            "team_ids": [str(tid) for tid in user.team_ids],
            "created_at": user.created_at.isoformat(),
            "updated_at": user.updated_at.isoformat(),
        }

    def _create_tokens(self, user: User) -> dict:
        token_data = self._token_payload(user)
        access_token = self.create_access_token(token_data)
        refresh_token = self.create_refresh_token(token_data)
        return {
            "user": self._user_to_dict(user),
            "access_token": access_token,
            "refresh_token": refresh_token,
        }

    async def register(self, username: str, email: str, password: str, full_name: str = "") -> dict:
        existing = await self.uow.users.get_by_username(username)
        if existing:
            raise ValueError("Username already taken")

        existing_email = await self.uow.users.get_by_email(email)
        if existing_email:
            raise ValueError("Email already registered")

        user = User(
            id=uuid4(),
            username=username,
            email=email,
            full_name=full_name,
            role=UserRole.RESEARCHER,
            status=UserStatus.ACTIVE,
            hashed_password=self.hash_password(password),
            email_verification_token=self.create_verification_token(),
        )
        await self.uow.users.add(user)
        await self.uow.commit()
        result = self._create_tokens(user)
        result["verification_token"] = user.email_verification_token
        return result

    async def login(self, username_or_email: str, password: str) -> dict:
        user = await self.uow.users.get_by_username(username_or_email)
        if not user:
            user = await self.uow.users.get_by_email(username_or_email)

        if not user or not user.hashed_password:
            raise ValueError("Invalid credentials")

        if not self.verify_password(password, user.hashed_password):
            raise ValueError("Invalid credentials")

        if user.status != UserStatus.ACTIVE:
            raise ValueError("Account is not active")

        user.record_login()
        await self.uow.users.update(user)
        await self.uow.commit()
        return self._create_tokens(user)

    async def refresh(self, refresh_token: str) -> dict:
        try:
            payload = self.decode_token(refresh_token)
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            raise ValueError("Invalid or expired refresh token")

        if payload.get("type") != "refresh":
            raise ValueError("Invalid token type")

        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Invalid token")

        user = await self.uow.users.get_by_id(UUID(user_id))
        if not user:
            raise ValueError("User not found")

        # Reject tokens issued before the last logout / password change.
        if payload.get("ver") != user.token_version:
            raise ValueError("Token revoked")

        result = self._create_tokens(user)
        return {"access_token": result["access_token"], "refresh_token": result["refresh_token"]}

    async def get_current_user(self, token: str) -> Optional[User]:
        try:
            payload = self.decode_token(token)
            if payload.get("type") != "access":
                return None
            user_id = payload.get("sub")
            if not user_id:
                return None
            user = await self.uow.users.get_by_id(UUID(user_id))
            if not user:
                return None
            # Reject tokens issued before the last logout / password change.
            if payload.get("ver") != user.token_version:
                return None
            return user
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return None

    async def logout(self, user: User) -> None:
        """Revoke all outstanding tokens for the user by bumping token_version."""
        user.token_version += 1
        user.touch()
        await self.uow.users.update(user)
        await self.uow.commit()

    async def verify_email(self, token: str) -> dict:
        user = await self.uow.users.get_by_email_verification_token(token)
        if not user:
            raise ValueError("Invalid or expired verification token")

        user.is_verified = True
        user.email_verification_token = None
        user.touch()
        await self.uow.users.update(user)
        await self.uow.commit()
        return {"message": "Email verified successfully"}

    async def resend_verification(self, email: str) -> dict:
        user = await self.uow.users.get_by_email(email)
        if not user:
            # Do not reveal whether the address exists.
            return {"message": "If the account exists, a verification email has been sent"}
        if user.is_verified:
            return {"message": "Email already verified"}

        user.email_verification_token = self.create_verification_token()
        user.touch()
        await self.uow.users.update(user)
        await self.uow.commit()
        return {
            "message": "If the account exists, a verification email has been sent",
            "verification_token": user.email_verification_token,
        }

    async def forgot_password(self, email: str) -> dict:
        user = await self.uow.users.get_by_email(email)
        if not user:
            return {"message": "If the account exists, a password reset email has been sent"}

        user.password_reset_token = self.create_verification_token()
        user.touch()
        await self.uow.users.update(user)
        await self.uow.commit()
        return {
            "message": "If the account exists, a password reset email has been sent",
            "reset_token": user.password_reset_token,
        }

    async def reset_password(self, token: str, new_password: str) -> dict:
        user = await self.uow.users.get_by_password_reset_token(token)
        if not user:
            raise ValueError("Invalid or expired reset token")

        user.hashed_password = self.hash_password(new_password)
        user.password_reset_token = None
        # Revoke every outstanding session so old tokens are unusable.
        user.token_version += 1
        user.touch()
        await self.uow.users.update(user)
        await self.uow.commit()
        return {"message": "Password reset successfully"}

    async def change_password(self, user: User, old_password: str, new_password: str) -> dict:
        if not user.hashed_password or not self.verify_password(old_password, user.hashed_password):
            raise ValueError("Current password is incorrect")

        user.hashed_password = self.hash_password(new_password)
        user.token_version += 1
        user.touch()
        await self.uow.users.update(user)
        await self.uow.commit()
        result = self._create_tokens(user)
        return {"message": "Password changed successfully", **result}
