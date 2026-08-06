"""Outbound email support.

Transport is pluggable: the console provider logs messages locally for
development; the Resend provider delivers real mail when ``RESEND_API_KEY``
is set; the SMTP provider can be selected explicitly. Backend resolution
happens in :func:`backend.infrastructure.email.factory.create_email_provider`.
"""

from backend.infrastructure.email.factory import create_email_provider
from backend.infrastructure.email.provider import EmailMessage, IEmailProvider

__all__ = ["EmailMessage", "IEmailProvider", "create_email_provider"]
