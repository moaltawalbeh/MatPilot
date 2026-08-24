"""Resend email provider.

Sends transactional email through the Resend REST API
(https://resend.com/docs/api-reference/emails/send-email) using ``httpx``.
The provider is activated automatically whenever ``RESEND_API_KEY`` is set
(see :func:`backend.infrastructure.email.factory.create_email_provider`).
"""

from typing import Optional

import httpx

from backend.infrastructure.email.provider import EmailMessage, IEmailProvider
from backend.infrastructure.logging.structured_logger import MatPilotLogger, get_logger

RESEND_API_BASE_URL = "https://api.resend.com"
RESEND_SEND_PATH = "/emails"


class ResendEmailProvider(IEmailProvider):
    """Delivers :class:`EmailMessage` objects via the Resend API."""

    def __init__(
        self,
        api_key: str,
        from_address: str = "MatPilot <no-reply@matpilot.site>",
        timeout: float = 15.0,
        api_base_url: str = RESEND_API_BASE_URL,
        transport: Optional[httpx.AsyncBaseTransport] = None,
        logger: Optional[MatPilotLogger] = None,
    ):
        if not api_key:
            raise ValueError("RESEND_API_KEY is required to use the Resend email provider")
        self._api_key = api_key
        self._from_address = from_address
        self._timeout = timeout
        self._api_base_url = api_base_url.rstrip("/")
        self._transport = transport
        self._logger = logger or get_logger("email_resend")

    def _build_payload(self, message: EmailMessage) -> dict:
        payload = {
            "from": self._from_address,
            "to": [message.to],
            "subject": message.subject,
            "text": message.text,
        }
        if message.html:
            payload["html"] = message.html
        return payload

    async def send(self, message: EmailMessage) -> None:
        # A fresh AsyncClient per call keeps the provider stateless (matching
        # the console/SMTP providers) and avoids lifecycle management in DI.
        async with httpx.AsyncClient(
            base_url=self._api_base_url,
            timeout=self._timeout,
            transport=self._transport,
        ) as client:
            try:
                response = await client.post(
                    RESEND_SEND_PATH,
                    json=self._build_payload(message),
                    headers={
                        "Authorization": f"Bearer {self._api_key}",
                        "Content-Type": "application/json",
                    },
                )
            except httpx.HTTPError as exc:
                self._logger.error(
                    "Resend request failed",
                    to=message.to,
                    error=str(exc),
                )
                raise RuntimeError(f"Failed to reach the email service: {exc}") from exc

        if response.status_code >= 400:
            detail = response.text[:300]
            self._logger.error(
                "Resend rejected the email",
                to=message.to,
                subject=message.subject,
                status=response.status_code,
                body=detail,
            )
            raise RuntimeError(
                f"Email service error ({response.status_code}): {detail}"
            )

        self._logger.info(
            "Email sent via Resend",
            to=message.to,
            subject=message.subject,
            status=response.status_code,
        )
