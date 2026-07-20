"""Authentication Service.

Handles JWT token creation/validation, password hashing, and user registration/login.
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

import jwt
from passlib.context import CryptContext

from backend.domain.entities.user import User, UserRole, UserStatus

SECRET_KEY = "matpilot-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

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
        to_encode.update({"exp": expire, "type": "access"})
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    def create_refresh_token(self, data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    def decode_token(self, token: str) -> dict:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    def _user_to_dict(self, user: User) -> dict:
        return {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.name,
            "status": user.status.name,
            "organization_id": str(user.organization_id) if user.organization_id else None,
            "team_ids": [str(tid) for tid in user.team_ids],
            "created_at": user.created_at.isoformat(),
            "updated_at": user.updated_at.isoformat(),
        }

    def _create_tokens(self, user: User) -> dict:
        token_data = {"sub": str(user.id), "username": user.username}
        access_token = self.create_access_token(token_data)
        refresh_token = self.create_refresh_token(token_data)
        return {"user": self._user_to_dict(user), "access_token": access_token, "refresh_token": refresh_token}

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
        )
        await self.uow.users.add(user)
        await self.uow.commit()
        return self._create_tokens(user)

    async def login(self, username_or_email: str, password: str) -> dict:
        user = await self.uow.users.get_by_username(username_or_email)
        if not user:
            user = await self.uow.users.get_by_email(username_or_email)

        if not user or not user.hashed_password:
            raise ValueError("Invalid credentials")

        if not self.verify_password(password, user.hashed_password):
            raise ValueError("Invalid credentials")

        user.record_login()
        await self.uow.users.update(user)
        await self.uow.commit()
        return self._create_tokens(user)

    async def refresh(self, refresh_token: str) -> dict:
        payload = self.decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError("Invalid token type")

        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Invalid token")

        from uuid import UUID
        user = await self.uow.users.get_by_id(UUID(user_id))
        if not user:
            raise ValueError("User not found")

        token_data = {"sub": str(user.id), "username": user.username}
        access_token = self.create_access_token(token_data)
        return {"access_token": access_token}

    async def get_current_user(self, token: str) -> Optional[User]:
        try:
            payload = self.decode_token(token)
            if payload.get("type") != "access":
                return None
            user_id = payload.get("sub")
            if not user_id:
                return None
            from uuid import UUID
            return await self.uow.users.get_by_id(UUID(user_id))
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return None
