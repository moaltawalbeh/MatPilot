"""Authentication Service.

Handles JWT token creation/validation, password hashing, user registration,
email verification, password reset, and token revocation via a per-user
``token_version`` embedded in every issued JWT. Bumping ``token_version``
(e.g. on logout or password change) invalidates all outstanding tokens.

Accounts are created in the INACTIVE state and are only activated after the
owner verifies their email address via the emailed link or code. No tokens are
issued at registration time, so a user cannot sign in before verifying.
"""

import os
import secrets
from datetime import datetime, timedelta
from typing import Optional, Any
from uuid import UUID, uuid4

import jwt
from passlib.context import CryptContext

from backend.domain.entities.user import User, UserRole, UserStatus
from backend.infrastructure.email.provider import EmailMessage, IEmailProvider
from backend.infrastructure.logging.structured_logger import MatPilotLogger, get_logger

SECRET_KEY = os.environ.get(
    "MATPILOT_SECRET_KEY", "matpilot-secret-key-change-in-production"
)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("MATPILOT_ACCESS_TOKEN_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.environ.get("MATPILOT_REFRESH_TOKEN_DAYS", "7"))
# Number of minutes the email verification / password reset tokens stay valid.
# Default: 24 hours (24 * 60).
VERIFY_TOKEN_EXPIRE_MINUTES = int(
    os.environ.get("MATPILOT_VERIFY_TOKEN_MINUTES", str(24 * 60))
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _format_ttl(minutes: int) -> str:
    """Human-friendly expiry string, e.g. '24 hours' or '90 minutes'."""
    if minutes % 60 == 0 and minutes >= 60:
        hours = minutes // 60
        return f"{hours} hour{'s' if hours != 1 else ''}"
    return f"{minutes} minute{'s' if minutes != 1 else ''}"


class AuthService:
    def __init__(
        self,
        uow,
        email_service: Optional[Any] = None,
        email_provider: Optional[IEmailProvider] = None,
        app_url: str = "https://matpilot.site",
        verification_code_length: int = 6,
        verification_token_ttl_minutes: Optional[int] = None,
        logger: Optional[MatPilotLogger] = None,
    ):
        self.uow = uow
        self.email_service = email_service
        self.email_provider = email_provider
        self.app_url = app_url.rstrip("/")
        self.verification_code_length = max(4, min(int(verification_code_length or 6), 12))
        self.verification_token_ttl_minutes = int(
            verification_token_ttl_minutes or VERIFY_TOKEN_EXPIRE_MINUTES
        )
        self._logger = logger or get_logger("auth_service")

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

    def create_verification_code(self) -> str:
        """Generate a numeric verification code (CSPRNG)."""
        length = self.verification_code_length
        return f"{secrets.randbelow(10 ** length):0{length}d}"

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

    def _issue_verification(self, user: User) -> None:
        """Issue a fresh verification token + code with an expiry timestamp."""
        user.email_verification_token = self.create_verification_token()
        user.email_verification_code = self.create_verification_code()
        user.email_verification_expires_at = datetime.utcnow() + timedelta(
            minutes=self.verification_token_ttl_minutes
        )

    def _activate(self, user: User) -> None:
        """Mark the user verified and active; clear verification state."""
        user.is_verified = True
        user.status = UserStatus.ACTIVE
        user.email_verification_token = None
        user.email_verification_code = None
        user.email_verification_expires_at = None
        user.touch()

    async def _notify(self, message: EmailMessage) -> None:
        """Send an email, logging (never surfacing) delivery failures."""
        if not self.email_provider or not hasattr(self.email_provider, "send"):
            return
        try:
            await self.email_provider.send(message)
        except Exception as exc:  # pragma: no cover - depends on external SMTP
            self._logger.error(
                "Failed to send email",
                to=message.to,
                subject=message.subject,
                error=str(exc),
            )

    async def _send_verification_email(self, user: User) -> None:
        if not self.email_provider:
            return
        code = user.email_verification_code or ""
        link = f"{self.app_url}/verify?token={user.email_verification_token}"
        ttl = _format_ttl(self.verification_token_ttl_minutes)
        text = (
            f"Hello {user.username},\n\n"
            f"Welcome to MatPilot. Please verify your email address to activate your account.\n\n"
            f"Your verification code is: {code}\n\n"
            f"Or click the link below:\n{link}\n\n"
            f"This link and code expire in {ttl}.\n\n"
            f"If you did not create this account, you can safely ignore this email."
        )
        html = (
            "<div style='font-family: Arial, Helvetica, sans-serif; max-width: 560px; "
            "margin: 0 auto; color: #1f2937;'>"
            "<h2 style='margin-bottom: 16px;'>Verify your MatPilot email</h2>"
            f"<p>Hello {self._html_escape(user.username)},</p>"
            "<p>Welcome to MatPilot. Please verify your email address to activate "
            "your account.</p>"
            "<div style='text-align: center; padding: 24px 0;'>"
            "<p style='color: #6b7280; font-size: 13px; margin: 0 0 8px;'>"
            "Your 6-digit verification code</p>"
            f"<p style='font-size: 36px; font-weight: 700; letter-spacing: 8px; "
            "margin: 0; color: #1f2937;'>"
            f"{self._html_escape(code)}</p>"
            "</div>"
            "<p style='text-align: center; color: #6b7280; font-size: 13px;'>or</p>"
            "<div style='text-align: center;'>"
            f"<a href='{self._html_escape(link)}' style='display: inline-block; "
            "background: #f97316; color: #ffffff; text-decoration: none; "
            "padding: 12px 28px; border-radius: 8px; font-weight: 600;'>"
            "Verify my email</a>"
            "</div>"
            f"<p style='color: #6b7280; font-size: 12px; margin-top: 24px;'>"
            f"This link and code expire in {self._html_escape(ttl)}. "
            "If you did not create this account, you can safely ignore this email.</p>"
            "</div>"
        )
        await self._notify(
            EmailMessage(
                to=user.email,
                subject="Verify your MatPilot email",
                text=text,
                html=html,
            )
        )

    @staticmethod
    def _html_escape(value: str) -> str:
        return (
            value.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&#39;")
        )

    async def _send_password_reset_email(self, user: User) -> None:
        if not self.email_provider:
            return
        link = f"{self.app_url}/reset-password?token={user.password_reset_token}"
        ttl = _format_ttl(self.verification_token_ttl_minutes)
        text = (
            f"Hello {user.username},\n\n"
            f"We received a request to reset your MatPilot password.\n\n"
            f"Open the link below to choose a new password:\n{link}\n\n"
            f"This link expires in {ttl}.\n\n"
            f"If you did not request this, you can safely ignore this email."
        )
        await self._notify(
            EmailMessage(
                to=user.email,
                subject="Reset your MatPilot password",
                text=text,
            )
        )

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
            status=UserStatus.INACTIVE,
            hashed_password=self.hash_password(password),
            is_verified=False,
        )
        self._issue_verification(user)
        await self.uow.users.add(user)
        await self.uow.commit()
        await self._send_verification_email(user)
        if self.email_service and user.email:
            self.email_service.send_verification_email(
                recipient=user.email,
                username=user.username,
                token=user.email_verification_token,
            )
            self.email_service.send_welcome_email(
                recipient=user.email,
                username=user.username,
                full_name=user.full_name or user.username,
            )
        return {
            "message": "Verification email has been sent. Please check your inbox to activate your account.",
            "email": email,
        }

    async def login(self, username_or_email: str, password: str) -> dict:
        user = await self.uow.users.get_by_username(username_or_email)
        if not user:
            user = await self.uow.users.get_by_email(username_or_email)

        if not user or not user.hashed_password:
            raise ValueError("Invalid credentials")

        if not self.verify_password(password, user.hashed_password):
            raise ValueError("Invalid credentials")

        if not user.is_verified:
            raise ValueError("Please verify your email address before signing in")
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
            raise ValueError("Invalid or expired verification link")
        if user.is_verified:
            return {"message": "Email already verified"}
        if user.email_verification_expires_at and datetime.utcnow() > user.email_verification_expires_at:
            raise ValueError("Verification link has expired. Please request a new one.")

        self._activate(user)
        await self.uow.users.update(user)
        await self.uow.commit()
        return {"message": "Email verified successfully"}

    async def verify_code(self, email: str, code: str) -> dict:
        user = await self.uow.users.get_by_email(email)
        if not user:
            raise ValueError("Invalid verification code")
        if user.is_verified:
            return {"message": "Email already verified"}
        if not user.email_verification_code or user.email_verification_code != str(code).strip():
            raise ValueError("Invalid verification code")
        if user.email_verification_expires_at and datetime.utcnow() > user.email_verification_expires_at:
            raise ValueError("Verification code has expired. Please request a new one.")

        self._activate(user)
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

        self._issue_verification(user)
        user.touch()
        await self.uow.users.update(user)
        await self.uow.commit()
        await self._send_verification_email(user)
        if self.email_service and user.email:
            try:
                self.email_service.send_verification_email(
                    recipient=user.email,
                    username=user.username,
                    token=user.email_verification_token,
                )
            except Exception:
                pass
        return {"message": "If the account exists, a verification email has been sent"}

    async def forgot_password(self, email: str) -> dict:
        user = await self.uow.users.get_by_email(email)
        if not user:
            return {"message": "If the account exists, a password reset email has been sent"}

        user.password_reset_token = self.create_verification_token()
        user.password_reset_expires_at = datetime.utcnow() + timedelta(
            minutes=self.verification_token_ttl_minutes
        )
        user.touch()
        await self.uow.users.update(user)
        await self.uow.commit()
        await self._send_password_reset_email(user)
        if self.email_service and user.email:
            try:
                self.email_service.send_password_reset_email(
                    recipient=user.email,
                    username=user.username,
                    token=user.password_reset_token,
                )
            except Exception:
                pass
        return {"message": "If the account exists, a password reset email has been sent"}

    async def reset_password(self, token: str, new_password: str) -> dict:
        user = await self.uow.users.get_by_password_reset_token(token)
        if not user:
            raise ValueError("Invalid or expired reset token")
        if user.password_reset_expires_at and datetime.utcnow() > user.password_reset_expires_at:
            user.password_reset_token = None
            user.touch()
            await self.uow.users.update(user)
            await self.uow.commit()
            raise ValueError("Invalid or expired reset token")

        user.hashed_password = self.hash_password(new_password)
        user.password_reset_token = None
        # Revoke every outstanding session so old tokens are unusable.
        user.token_version += 1
        user.touch()
        await self.uow.users.update(user)
        await self.uow.commit()
        if self.email_service and user.email:
            try:
                self.email_service.send_password_changed_email(
                    recipient=user.email,
                    username=user.username,
                )
            except Exception:
                pass
        return {"message": "Password reset successfully"}

    async def change_password(self, user: User, old_password: str, new_password: str) -> dict:
        if not user.hashed_password or not self.verify_password(old_password, user.hashed_password):
            raise ValueError("Current password is incorrect")

        user.hashed_password = self.hash_password(new_password)
        user.token_version += 1
        user.touch()
        await self.uow.users.update(user)
        await self.uow.commit()
        if self.email_service and user.email:
            try:
                self.email_service.send_password_changed_email(
                    recipient=user.email,
                    username=user.username,
                )
            except Exception:
                pass
        result = self._create_tokens(user)
        return {"message": "Password changed successfully", **result}
