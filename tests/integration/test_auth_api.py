"""End-to-end tests for the auth router over HTTP.

Overrides the auth dependency so the API runs against an in-memory unit of
work instead of Neon PostgreSQL.
"""

import pytest
from fastapi.testclient import TestClient

from backend.api.routers import auth as auth_router
from backend.infrastructure.database.sql_uow import InMemoryUnitOfWork
from backend.services.auth_service import AuthService


from backend.services.email_service import EmailService


@pytest.fixture
def uow():
    return InMemoryUnitOfWork()


@pytest.fixture
def client(app, uow):
    def _override():
        email_service = EmailService()
        app.state.container.email_service = email_service
        yield AuthService(uow, email_service)

    app.dependency_overrides[auth_router.get_db_auth_service] = _override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def test_register_verify_me_flow(client, uow):
    resp = client.post(
        "/auth/register",
        json={"username": "carol", "email": "carol@example.com", "password": "secret123"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "carol@example.com"
    assert data["message"]

    # Login is blocked until the email is verified.
    assert (
        client.post(
            "/auth/login", json={"username_or_email": "carol", "password": "secret123"}
        ).status_code
        == 401
    )

    user = await uow.users.get_by_email("carol@example.com")
    assert user is not None
    assert user.email_verification_token

    verify = client.post("/auth/verify-email", json={"token": user.email_verification_token})
    assert verify.status_code == 200

    login = client.post(
        "/auth/login", json={"username_or_email": "carol", "password": "secret123"}
    )
    assert login.status_code == 200
    data = login.json()
    assert data["user"]["username"] == "carol"
    assert data["user"]["is_verified"] is True
    assert data["access_token"]

    me = client.get("/auth/me", headers=_auth_headers(data["access_token"]))
    assert me.status_code == 200
    assert me.json()["email"] == "carol@example.com"
    assert me.json()["is_verified"] is True


async def test_login_logout_revokes_token(client, uow):
    client.post(
        "/auth/register",
        json={"username": "dave", "email": "dave@example.com", "password": "secret123"},
    )
    user = await uow.users.get_by_email("dave@example.com")
    client.post("/auth/verify-email", json={"token": user.email_verification_token})

    login = client.post(
        "/auth/login", json={"username_or_email": "dave", "password": "secret123"}
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    assert client.get("/auth/me", headers=_auth_headers(token)).status_code == 200

    logout = client.post("/auth/logout", headers=_auth_headers(token))
    assert logout.status_code == 200

    assert client.get("/auth/me", headers=_auth_headers(token)).status_code == 401


async def test_change_password_invalidates_old_token(client, uow):
    client.post(
        "/auth/register",
        json={"username": "erin", "email": "erin@example.com", "password": "old-pass"},
    )
    user = await uow.users.get_by_email("erin@example.com")
    client.post("/auth/verify-email", json={"token": user.email_verification_token})

    login = client.post(
        "/auth/login", json={"username_or_email": "erin", "password": "old-pass"}
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = _auth_headers(token)

    resp = client.post(
        "/auth/change-password",
        json={"old_password": "old-pass", "new_password": "new-pass"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()

    # Old token is revoked.
    assert client.get("/auth/me", headers=headers).status_code == 401

    # Wrong old password rejected.
    new_login = client.post(
        "/auth/login", json={"username_or_email": "erin", "password": "new-pass"}
    )
    assert new_login.status_code == 200
    wrong = client.post(
        "/auth/change-password",
        json={"old_password": "nope", "new_password": "x-pass"},
        headers=_auth_headers(new_login.json()["access_token"]),
    )
    assert wrong.status_code == 400


async def test_forgot_and_reset_password_flow(client, uow):
    client.post(
        "/auth/register",
        json={"username": "frank", "email": "frank@example.com", "password": "orig-pass"},
    )
    user = await uow.users.get_by_email("frank@example.com")
    client.post("/auth/verify-email", json={"token": user.email_verification_token})

    forgot = client.post("/auth/forgot-password", json={"email": "frank@example.com"})
    assert forgot.status_code == 200
    assert "message" in forgot.json()
    assert "reset_token" not in forgot.json()

    user = await uow.users.get_by_email("frank@example.com")
    assert user.password_reset_token

    # Old password stops working after reset.
    reset = client.post(
        "/auth/reset-password",
        json={"token": user.password_reset_token, "new_password": "reset-pass"},
    )
    assert reset.status_code == 200

    assert (
        client.post(
            "/auth/login", json={"username_or_email": "frank", "password": "orig-pass"}
        ).status_code
        == 401
    )
    new_login = client.post(
        "/auth/login", json={"username_or_email": "frank", "password": "reset-pass"}
    )
    assert new_login.status_code == 200


def test_reset_password_invalid_token_returns_400(client):
    resp = client.post(
        "/auth/reset-password", json={"token": "bogus", "new_password": "whatever"}
    )
    assert resp.status_code == 400


def test_login_invalid_credentials_returns_401(client):
    resp = client.post("/auth/login", json={"username_or_email": "ghost", "password": "x"})
    assert resp.status_code == 401


def test_dev_emails_endpoint_and_email_templates(client):
    resp = client.post(
        "/auth/register",
        json={"username": "dr_curie", "email": "curie@example.com", "password": "secret123"},
    )
    assert resp.status_code == 200

    dev_resp = client.get("/auth/dev-emails?recipient=curie@example.com")
    assert dev_resp.status_code == 200
    emails = dev_resp.json()["emails"]
    assert len(emails) >= 2
    subjects = [e["subject"] for e in emails]
    assert any("Verify" in s for s in subjects)
    assert any("Welcome" in s for s in subjects)
