"""Email provider factory.

Selects the transport from ``EmailConfig``. ``console`` is the safe default so
the app never requires SMTP credentials; ``smtp`` activates real delivery.
"""

from backend.infrastructure.config.settings import EmailConfig
from backend.infrastructure.email.console_provider import ConsoleEmailProvider
from backend.infrastructure.email.provider import IEmailProvider
from backend.infrastructure.email.smtp_provider import SmtpEmailProvider
from backend.infrastructure.logging.structured_logger import get_logger


def create_email_provider(config: EmailConfig) -> IEmailProvider:
    """Build the email provider configured by ``config``."""
    backend = (config.backend or "console").lower()
    if backend == "smtp":
        if not config.smtp_host:
            get_logger("email_factory").warning(
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
