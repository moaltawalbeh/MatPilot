"""Tests for the Resend email provider."""

import httpx
import pytest

from backend.infrastructure.email.provider import EmailMessage
from backend.infrastructure.email.resend_provider import (
    RESEND_SEND_PATH,
    ResendEmailProvider,
)


def _provider(handler):
    transport = httpx.MockTransport(handler)
    return ResendEmailProvider(
        api_key="re_test_key",
        from_address="MatPilot <no-reply@matpilot.site>",
        transport=transport,
    )


async def test_send_posts_payload_to_resend():
    captured = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["auth"] = request.headers.get("Authorization")
        captured["payload"] = request.read().decode()
        return httpx.Response(200, json={"id": "email_123"})

    provider = _provider(handler)
    await provider.send(
        EmailMessage(
            to="user@example.com",
            subject="Verify your MatPilot email",
            text="Your code is 123456",
            html="<p>Your code is 123456</p>",
        )
    )

    assert captured["url"].endswith(RESEND_SEND_PATH)
    assert captured["auth"] == "Bearer re_test_key"
    import json

    body = json.loads(captured["payload"])
    assert body["from"] == "MatPilot <no-reply@matpilot.site>"
    assert body["to"] == ["user@example.com"]
    assert body["subject"] == "Verify your MatPilot email"
    assert body["text"] == "Your code is 123456"
    assert body["html"] == "<p>Your code is 123456</p>"


async def test_send_without_html_sends_text_only():
    captured = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        captured["payload"] = request.read().decode()
        return httpx.Response(200, json={"id": "email_123"})

    provider = _provider(handler)
    await provider.send(
        EmailMessage(to="user@example.com", subject="S", text="plain text")
    )

    import json

    assert "html" not in json.loads(captured["payload"])
    assert json.loads(captured["payload"])["text"] == "plain text"


async def test_send_raises_on_api_error():
    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(422, text='{"message": "invalid recipient"}')

    provider = _provider(handler)
    with pytest.raises(RuntimeError, match="422"):
        await provider.send(EmailMessage(to="x@example.com", subject="S", text="t"))


async def test_send_raises_on_network_error():
    async def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused")

    provider = _provider(handler)
    with pytest.raises(RuntimeError, match="Failed to reach the email service"):
        await provider.send(EmailMessage(to="x@example.com", subject="S", text="t"))


def test_requires_api_key():
    with pytest.raises(ValueError, match="RESEND_API_KEY"):
        ResendEmailProvider(api_key="")
