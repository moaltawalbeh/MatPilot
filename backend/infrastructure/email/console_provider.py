"""Development email provider.

Writes every message through the structured logger instead of the network so
local development works without SMTP credentials.
"""

from typing import Optional

from backend.infrastructure.email.provider import EmailMessage, IEmailProvider
from backend.infrastructure.logging.structured_logger import MatPilotLogger, get_logger


class ConsoleEmailProvider(IEmailProvider):
    """Emits messages via the application logger (no network involved)."""

    def __init__(self, logger: Optional[MatPilotLogger] = None):
        self._logger = logger or get_logger("email_console")

    async def send(self, message: EmailMessage) -> None:
        body = message.html or message.text or ""
        self._logger.info(
            "Email sent",
            to=message.to,
            subject=message.subject,
            body=body,
        )
