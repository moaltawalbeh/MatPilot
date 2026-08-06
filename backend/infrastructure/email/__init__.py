"""Outbound email support.

Transport is pluggable: the console provider logs messages locally for
development; the SMTP provider delivers real mail in production. Select the
backend via ``MATPILOT_EMAIL_BACKEND`` (``console`` or ``smtp``).
"""

from backend.infrastructure.email.factory import create_email_provider
from backend.infrastructure.email.provider import EmailMessage, IEmailProvider

__all__ = ["EmailMessage", "IEmailProvider", "create_email_provider"]
