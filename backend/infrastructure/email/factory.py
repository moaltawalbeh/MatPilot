"""Email provider factory.

Selects the transport from ``EmailConfig``. Resolution order:

* ``resend`` — activated explicitly via ``MATPILOT_EMAIL_BACKEND=resend``,
  or automatically when ``RESEND_API_KEY`` is set (the default when no
  backend is configured).
* ``smtp`` — real delivery via SMTP.
* ``console`` — logs messages locally for development (safe fallback so the
  app never requires credentials).
"""

from backend.infrastructure.config.settings import EmailConfig
from backend.infrastructure.email.console_provider import ConsoleEmailProvider
from backend.infrastructure.email.provider import IEmailProvider
from backend.infrastructure.email.resend_provider import ResendEmailProvider
from backend.infrastructure.email.smtp_provider import SmtpEmailProvider
from backend.infrastructure.logging.structured_logger import get_logger


def create_email_provider(config: EmailConfig) -> IEmailProvider:
    """Build the email provider configured by ``config``."""
    backend = (config.backend or "auto").lower()
    logger = get_logger("email_factory")

    if backend in ("resend", "auto"):
        if config.resend_api_key:
            return ResendEmailProvider(
                api_key=config.resend_api_key,
                from_address=config.from_address,
            )
        if backend == "resend":
            logger.warning(
                "Resend backend selected but RESEND_API_KEY is not set; falling back to console"
            )
            return ConsoleEmailProvider()

    if backend == "smtp":
        if not config.smtp_host:
            logger.warning(
                "SMTP backend selected but MATPILOT_SMTP_HOST is not set; falling back to console"
            )
            return ConsoleEmailProvider()
        return SmtpEmailProvider(
            host=config.smtp_host,
            port=config.smtp_port,
            username=config.smtp_user,
            password=config.smtp_password,
            from_address=config.from_address,
            use_tls=config.smtp_use_tls,
            use_ssl=config.smtp_use_ssl,
        )
    return ConsoleEmailProvider()
