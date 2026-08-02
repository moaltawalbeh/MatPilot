"""Tests for the authentication service.

Covers registration, login, token-version revocation (logout / password
change), email verification, and password reset flows against the in-memory
unit of work.
"""

import pytest

from backend.domain.entities.user import UserStatus
from backend.infrastructure.database.sql_uow import InMemoryUnitOfWork
from backend.services.auth_service import AuthService


@pytest.fixture
def auth():
    uow = InMemoryUnitOfWork()
    return AuthService(uow)


@pytest.fixture
async def registered(auth):
    result = await auth.register(
        username="alice",
        email="alice@example.com",
        password="secret123",
        full_name="Alice Wonder",
    )
    return result


async def test_register_creates_user_and_verification_token(auth):
    result = await auth.register("bob", "bob@example.com", "password1")
    assert result["user"]["username"] == "bob"
    assert result["user"]["is_verified"] is False
    assert result["verification_token"]
    assert result["access_token"]
    assert result["refresh_token"]

    user = await auth.uow.users.get_by_email("bob@example.com")
    assert user is not None
    assert user.email_verification_token == result["verification_token"]
    assert user.hashed_password and user.hashed_password != "password1"


async def test_register_duplicate_username_raises(auth, registered):
    with pytest.raises(ValueError, match="Username"):
        await auth.register("alice", "other@example.com", "password1")


async def test_register_duplicate_email_raises(auth, registered):
    with pytest.raises(ValueError, match="Email"):
        await auth.register("other", "alice@example.com", "password1")


async def test_login_success_and_records_login(auth, registered):
    user_before = await auth.uow.users.get_by_username("alice")
    login_count_before = user_before.login_count
    result = await auth.login("alice", "secret123")
    assert result["user"]["username"] == "alice"
    assert result["access_token"] and result["refresh_token"]

    user_after = await auth.uow.users.get_by_username("alice")
    assert user_after.login_count == login_count_before + 1
    assert user_after.last_login_at is not None


async def test_login_with_email_works(auth, registered):
    result = await auth.login("alice@example.com", "secret123")
    assert result["user"]["email"] == "alice@example.com"


async def test_login_invalid_credentials_raises(auth, registered):
    with pytest.raises(ValueError, match="Invalid credentials"):
        await auth.login("alice", "wrong-password")


async def test_login_suspended_account_rejected(auth, registered):
    user = await auth.uow.users.get_by_username("alice")
    user.status = UserStatus.SUSPENDED
    await auth.uow.users.update(user)
    await auth.uow.commit()

    with pytest.raises(ValueError, match="not active"):
        await auth.login("alice", "secret123")


async def test_tokens_embed_token_version(auth, registered):
    result = await auth.login("alice", "secret123")
    payload = auth.decode_token(result["access_token"])
    assert payload["ver"] == 0


async def test_get_current_user_returns_user(auth, registered):
    result = await auth.login("alice", "secret123")
    user = await auth.get_current_user(result["access_token"])
    assert user is not None
    assert user.username == "alice"


async def test_get_current_user_rejects_refresh_token(auth, registered):
    result = await auth.login("alice", "secret123")
    user = await auth.get_current_user(result["refresh_token"])
    assert user is None


async def test_logout_revokes_all_tokens(auth, registered):
    result = await auth.login("alice", "secret123")
    user = await auth.get_current_user(result["access_token"])
    assert user is not None

    await auth.logout(user)

    assert await auth.get_current_user(result["access_token"]) is None
    with pytest.raises(ValueError, match="revoked"):
        await auth.refresh(result["refresh_token"])


async def test_refresh_rotates_tokens(auth, registered):
    result = await auth.login("alice", "secret123")
    refreshed = await auth.refresh(result["refresh_token"])
    assert refreshed["access_token"] and refreshed["refresh_token"]
    assert refreshed["access_token"] != result["access_token"]


async def test_refresh_with_access_token_rejected(auth, registered):
    result = await auth.login("alice", "secret123")
    with pytest.raises(ValueError, match="token type"):
        await auth.refresh(result["access_token"])


async def test_verify_email(auth, registered):
    assert registered["user"]["is_verified"] is False
    resp = await auth.verify_email(registered["verification_token"])
    assert resp["message"] == "Email verified successfully"

    user = await auth.uow.users.get_by_username("alice")
    assert user.is_verified is True
    assert user.email_verification_token is None


async def test_verify_email_invalid_token_raises(auth):
    with pytest.raises(ValueError, match="verification token"):
        await auth.verify_email("bogus-token")


async def test_resend_verification_generates_new_token(auth, registered):
    resp = await auth.resend_verification("alice@example.com")
    assert resp["verification_token"]
    assert resp["verification_token"] != registered["verification_token"]


async def test_resend_verification_unknown_email_is_generic(auth):
    resp = await auth.resend_verification("nobody@example.com")
    assert "verification_token" not in resp
    assert "has been sent" in resp["message"]


async def test_forgot_password_sets_reset_token(auth, registered):
    resp = await auth.forgot_password("alice@example.com")
    assert resp["reset_token"]

    user = await auth.uow.users.get_by_username("alice")
    assert user.password_reset_token == resp["reset_token"]


async def test_forgot_password_unknown_email_is_generic(auth):
    resp = await auth.forgot_password("nobody@example.com")
    assert "reset_token" not in resp


async def test_reset_password_revokes_old_tokens(auth, registered):
    login_result = await auth.login("alice", "secret123")
    reset_resp = await auth.forgot_password("alice@example.com")

    resp = await auth.reset_password(reset_resp["reset_token"], "new-secret")
    assert resp["message"] == "Password reset successfully"

    # Old token no longer valid.
    assert await auth.get_current_user(login_result["access_token"]) is None

    # New password works.
    new_login = await auth.login("alice", "new-secret")
    assert new_login["access_token"]


async def test_reset_password_invalid_token_raises(auth):
    with pytest.raises(ValueError, match="reset token"):
        await auth.reset_password("bogus-token", "new-secret")


async def test_change_password_revokes_old_tokens(auth, registered):
    result = await auth.login("alice", "secret123")
    user = await auth.get_current_user(result["access_token"])

    resp = await auth.change_password(user, "secret123", "fresh-pass")
    assert resp["message"] == "Password changed successfully"
    assert resp["access_token"]

    assert await auth.get_current_user(result["access_token"]) is None
    new_login = await auth.login("alice", "fresh-pass")
    assert new_login["access_token"]


async def test_change_password_wrong_old_password_raises(auth, registered):
    result = await auth.login("alice", "secret123")
    user = await auth.get_current_user(result["access_token"])
    with pytest.raises(ValueError, match="incorrect"):
        await auth.change_password(user, "wrong-old", "fresh-pass")
