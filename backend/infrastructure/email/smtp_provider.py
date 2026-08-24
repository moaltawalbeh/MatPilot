"""SMTP email provider.

Uses the standard library ``smtplib``; the blocking network call is pushed off
the event loop via ``asyncio.to_thread`` so it never stalls API requests.
"""

import asyncio
import smtplib
from email.message import EmailMessage as StdlibEmailMessage
from typing import Optional

from backend.infrastructure.email.provider import EmailMessage, IEmailProvider
from backend.infrastructure.logging.structured_logger import MatPilotLogger, get_logger


class SmtpEmailProvider(IEmailProvider):
    def __init__(
        self,
        host: str,
        port: int = 587,
        username: Optional[str] = None,
        password: Optional[str] = None,
        from_address: str = "MatPilot <no-reply@matpilot.site>",
        use_tls: bool = True,
        use_ssl: bool = False,
        timeout: int = 30,
        logger: Optional[MatPilotLogger] = None,
    ):
        self._host = host
        self._port = port
        self._username = username
        self._password = password
        self._from_address = from_address
        self._use_tls = use_tls
        self._use_ssl = use_ssl
        self._timeout = timeout
        self._logger = logger or get_logger("email_smtp")

    def _send_sync(self, message: EmailMessage) -> None:
        msg = StdlibEmailMessage()
        msg["From"] = self._from_address
        msg["To"] = message.to
        msg["Subject"] = message.subject
        msg.set_content(message.text)
        if message.html:
            msg.add_alternative(message.html, subtype="html")

        if self._use_ssl:
            server = smtplib.SMTP_SSL(self._host, self._port, timeout=self._timeout)
        else:
            server = smtplib.SMTP(self._host, self._port, timeout=self._timeout)
            if self._use_tls:
                server.starttls()
        try:
            if self._username:
                server.login(self._username, self._password or "")
            server.send_message(msg)
        finally:
            server.quit()

    async def send(self, message: EmailMessage) -> None:
        await asyncio.to_thread(self._send_sync, message)
        self._logger.info("Email sent via SMTP", to=message.to, subject=message.subject)
