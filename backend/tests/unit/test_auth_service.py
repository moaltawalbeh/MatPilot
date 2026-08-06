"""Tests for the authentication service.

Covers registration, email verification (link and code), login gating,
token-version revocation (logout / password change), and password reset flows
against the in-memory unit of work.
"""

import pytest

from backend.domain.entities.user import UserStatus
from backend.infrastructure.database.sql_uow import InMemoryUnitOfWork
from backend.infrastructure.email.console_provider import ConsoleEmailProvider
from backend.services.auth_service import AuthService


@pytest.fixture
def auth():
    uow = InMemoryUnitOfWork()
    return AuthService(uow, email_provider=ConsoleEmailProvider())


@pytest.fixture
async def registered(auth):
    """A fully verified 'alice' account ready to log in."""
    await auth.register("alice", "alice@example.com", "secret123", "Alice Wonder")
    user = await auth.uow.users.get_by_email("alice@example.com")
    await auth.verify_email(user.email_verification_token)
    return await auth.uow.users.get_by_email("alice@example.com")


async def test_register_creates_inactive_user_and_sends_verification(auth):
    result = await auth.register("bob", "bob@example.com", "password1")
    assert "Verification email has been sent" in result["message"]
    assert result["email"] == "bob@example.com"

    user = await auth.uow.users.get_by_email("bob@example.com")
    assert user is not None
    assert user.is_verified is False
    assert user.status == UserStatus.INACTIVE
    assert user.email_verification_token
    assert user.email_verification_code
    assert user.email_verification_expires_at is not None
    assert user.hashed_password and user.hashed_password != "password1"


async def test_register_does_not_issue_tokens(auth):
    result = await auth.register("bob", "bob@example.com", "password1")
    assert "access_token" not in result
    assert "refresh_token" not in result
    assert "verification_token" not in result


async def test_register_duplicate_username_raises(auth, registered):
    with pytest.raises(ValueError, match="Username"):
        await auth.register("alice", "other@example.com", "password1")


async def test_register_duplicate_email_raises(auth, registered):
    with pytest.raises(ValueError, match="Email"):
        await auth.register("other", "alice@example.com", "password1")


async def test_login_success_and_records_login(auth, registered):
    login_count_before = registered.login_count
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


async def test_login_unverified_email_rejected(auth):
    await auth.register("bob", "bob@example.com", "password1")
    with pytest.raises(ValueError, match="verify your email"):
        await auth.login("bob@example.com", "password1")


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


async def test_verify_email_activates_account(auth):
    await auth.register("bob", "bob@example.com", "password1")
    user = await auth.uow.users.get_by_email("bob@example.com")

    resp = await auth.verify_email(user.email_verification_token)
    assert resp["message"] == "Email verified successfully"

    verified = await auth.uow.users.get_by_email("bob@example.com")
    assert verified.is_verified is True
    assert verified.status == UserStatus.ACTIVE
    assert verified.email_verification_token is None
    assert verified.email_verification_code is None

    # The now-verified user can sign in.
    result = await auth.login("bob@example.com", "password1")
    assert result["access_token"]


async def test_verify_email_invalid_token_raises(auth):
    with pytest.raises(ValueError, match="verification link"):
        await auth.verify_email("bogus-token")


async def test_verify_email_expired_link_raises(auth):
    await auth.register("bob", "bob@example.com", "password1")
    user = await auth.uow.users.get_by_email("bob@example.com")
    from datetime import datetime, timedelta

    user.email_verification_expires_at = datetime.utcnow() - timedelta(minutes=1)
    await auth.uow.users.update(user)
    await auth.uow.commit()

    with pytest.raises(ValueError, match="expired"):
        await auth.verify_email(user.email_verification_token)


async def test_verify_email_already_verified_ok(auth):
    await auth.register("bob", "bob@example.com", "password1")
    user = await auth.uow.users.get_by_email("bob@example.com")
    await auth.verify_email(user.email_verification_token)

    user = await auth.uow.users.get_by_email("bob@example.com")
    resp = await auth.verify_email(user.email_verification_token)
    assert resp["message"] == "Email already verified"


async def test_verify_code_activates_account(auth):
    await auth.register("bob", "bob@example.com", "password1")
    user = await auth.uow.users.get_by_email("bob@example.com")

    resp = await auth.verify_code("bob@example.com", user.email_verification_code)
    assert resp["message"] == "Email verified successfully"

    verified = await auth.uow.users.get_by_email("bob@example.com")
    assert verified.is_verified is True
    assert verified.status == UserStatus.ACTIVE

    result = await auth.login("bob@example.com", "password1")
    assert result["access_token"]


async def test_verify_code_wrong_code_raises(auth):
    await auth.register("bob", "bob@example.com", "password1")
    with pytest.raises(ValueError, match="Invalid verification code"):
        await auth.verify_code("bob@example.com", "000000")


async def test_verify_code_unknown_email_raises(auth):
    with pytest.raises(ValueError, match="Invalid verification code"):
        await auth.verify_code("nobody@example.com", "123456")


async def test_verify_code_expired_raises(auth):
    await auth.register("bob", "bob@example.com", "password1")
    user = await auth.uow.users.get_by_email("bob@example.com")
    from datetime import datetime, timedelta

    user.email_verification_expires_at = datetime.utcnow() - timedelta(minutes=1)
    await auth.uow.users.update(user)
    await auth.uow.commit()

    with pytest.raises(ValueError, match="expired"):
        await auth.verify_code("bob@example.com", user.email_verification_code)


async def test_resend_verification_generates_new_code(auth):
    result = await auth.register("bob", "bob@example.com", "password1")
    user = await auth.uow.users.get_by_email("bob@example.com")
    original_token = user.email_verification_token
    original_code = user.email_verification_code

    resp = await auth.resend_verification("bob@example.com")
    assert "has been sent" in resp["message"]
    assert "verification_token" not in resp

    refreshed = await auth.uow.users.get_by_email("bob@example.com")
    assert refreshed.email_verification_token != original_token
    assert refreshed.email_verification_code != original_code


async def test_resend_verification_unknown_email_is_generic(auth):
    resp = await auth.resend_verification("nobody@example.com")
    assert "verification_token" not in resp
    assert "has been sent" in resp["message"]


async def test_forgot_password_sets_reset_token(auth, registered):
    resp = await auth.forgot_password("alice@example.com")
    assert "reset_token" not in resp
    assert "has been sent" in resp["message"]

    user = await auth.uow.users.get_by_username("alice")
    assert user.password_reset_token
    assert user.password_reset_expires_at is not None


async def test_forgot_password_unknown_email_is_generic(auth):
    resp = await auth.forgot_password("nobody@example.com")
    assert "reset_token" not in resp


async def test_reset_password_revokes_old_tokens(auth, registered):
    login_result = await auth.login("alice", "secret123")
    await auth.forgot_password("alice@example.com")
    user = await auth.uow.users.get_by_username("alice")

    resp = await auth.reset_password(user.password_reset_token, "new-secret")
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
