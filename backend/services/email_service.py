"""Professional Email Service for MatPilot v1.5.1.

Supports transactional HTML emails (Welcome, Verification, Password Reset, Password Changed)
with both real SMTP delivery and a Console/Development mode that records sent messages
for inspection and dev previewing.
"""

import os
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field

from backend.infrastructure.logging.structured_logger import get_logger

logger = get_logger("email_service")


@dataclass
class EmailMessage:
    """Record of a sent transactional email."""
    id: str
    recipient: str
    subject: str
    html_body: str
    text_body: str
    template_name: str
    sent_at: str
    delivered_via_smtp: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "recipient": self.recipient,
            "subject": self.subject,
            "html_body": self.html_body,
            "text_body": self.text_body,
            "template_name": self.template_name,
            "sent_at": self.sent_at,
            "delivered_via_smtp": self.delivered_via_smtp,
            "metadata": self.metadata,
        }


class EmailService:
    """Service responsible for rendering and delivering transactional email messages."""

    def __init__(self):
        self.smtp_host = os.environ.get("MATPILOT_SMTP_HOST", "")
        self.smtp_port = int(os.environ.get("MATPILOT_SMTP_PORT", "587"))
        self.smtp_user = os.environ.get("MATPILOT_SMTP_USER", "")
        self.smtp_password = os.environ.get("MATPILOT_SMTP_PASSWORD", "")
        self.smtp_from = os.environ.get("MATPILOT_SMTP_FROM", "no-reply@matpilot.com")
        self.use_tls = os.environ.get("MATPILOT_SMTP_TLS", "true").lower() == "true"
        self.app_url = os.environ.get("MATPILOT_APP_URL", "http://localhost:3000")

        # In-memory inbox for Dev / Test / Preview mode
        self.sent_emails: List[EmailMessage] = []
        self._max_stored_emails = 100

    # ------------------------------------------------------------------
    # Core Send Implementation
    # ------------------------------------------------------------------
    def send_email(
        self,
        recipient: str,
        subject: str,
        html_content: str,
        text_content: str,
        template_name: str = "custom",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> EmailMessage:
        """Render and send an email message."""
        from uuid import uuid4

        email_id = str(uuid4())
        delivered_via_smtp = False

        # Attempt SMTP if host is configured
        if self.smtp_host:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = self.smtp_from
                msg["To"] = recipient

                part_text = MIMEText(text_content, "plain", "utf-8")
                part_html = MIMEText(html_content, "html", "utf-8")
                msg.attach(part_text)
                msg.attach(part_html)

                with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                    if self.use_tls:
                        server.starttls()
                    if self.smtp_user and self.smtp_password:
                        server.login(self.smtp_user, self.smtp_password)
                    server.send_message(msg)
                delivered_via_smtp = True
                logger.info("email_sent_via_smtp", recipient=recipient, subject=subject, email_id=email_id)
            except Exception as e:
                logger.error("smtp_delivery_failed", error=str(e), recipient=recipient, subject=subject)
        else:
            logger.info("email_sent_console_mode", recipient=recipient, subject=subject, template=template_name)

        record = EmailMessage(
            id=email_id,
            recipient=recipient,
            subject=subject,
            html_body=html_content,
            text_body=text_content,
            template_name=template_name,
            sent_at=datetime.utcnow().isoformat(),
            delivered_via_smtp=delivered_via_smtp,
            metadata=metadata or {},
        )

        self.sent_emails.insert(0, record)
        if len(self.sent_emails) > self._max_stored_emails:
            self.sent_emails.pop()

        return record

    def get_sent_emails(self, recipient: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get recently sent emails, optionally filtered by recipient."""
        records = self.sent_emails
        if recipient:
            records = [e for e in records if e.recipient.lower() == recipient.lower()]
        return [e.to_dict() for e in records]

    def clear_sent_emails(self):
        """Clear all stored sent emails."""
        self.sent_emails.clear()

    # ------------------------------------------------------------------
    # Template Helpers & Styles
    # ------------------------------------------------------------------
    def _base_template(self, title: str, body_content: str) -> str:
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #0d1117;
      color: #e6edf3;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}
    .container {{
      max-width: 600px;
      margin: 40px auto;
      background-color: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }}
    .header {{
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      padding: 32px 40px;
      border-bottom: 1px solid #30363d;
      text-align: center;
    }}
    .logo {{
      font-size: 24px;
      font-weight: 700;
      color: #58a6ff;
      letter-spacing: -0.5px;
      text-decoration: none;
    }}
    .logo-badge {{
      display: inline-block;
      background-color: rgba(56, 139, 253, 0.15);
      color: #58a6ff;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 12px;
      margin-left: 8px;
      vertical-align: middle;
    }}
    .content {{
      padding: 40px;
      line-height: 1.6;
      font-size: 15px;
      color: #c9d1d9;
    }}
    .content h1 {{
      font-size: 22px;
      color: #ffffff;
      margin-top: 0;
      margin-bottom: 16px;
      font-weight: 600;
    }}
    .btn {{
      display: inline-block;
      background-color: #238636;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      padding: 12px 28px;
      border-radius: 6px;
      margin: 24px 0;
      box-shadow: 0 4px 12px rgba(35, 134, 54, 0.3);
    }}
    .btn-primary {{
      background-color: #1f6feb;
      box-shadow: 0 4px 12px rgba(31, 111, 235, 0.3);
    }}
    .footer {{
      background-color: #0d1117;
      padding: 24px 40px;
      border-top: 1px solid #30363d;
      font-size: 12px;
      color: #8b949e;
      text-align: center;
    }}
    .footer a {{
      color: #58a6ff;
      text-decoration: none;
    }}
    .alert-box {{
      background-color: rgba(56, 139, 253, 0.1);
      border-left: 4px solid #58a6ff;
      padding: 16px;
      border-radius: 4px;
      margin: 20px 0;
      font-size: 14px;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">MatPilot<span class="logo-badge">v1.5.1</span></div>
    </div>
    <div class="content">
      {body_content}
    </div>
    <div class="footer">
      <p>&copy; 2026 MatPilot Scientific Platform. All rights reserved.</p>
      <p>
        <a href="{self.app_url}/privacy-policy">Privacy Policy</a> &bull;
        <a href="{self.app_url}/terms-and-conditions">Terms of Service</a> &bull;
        <a href="{self.app_url}/contact">Support</a>
      </p>
    </div>
  </div>
</body>
</html>"""

    # ------------------------------------------------------------------
    # Transactional Templates
    # ------------------------------------------------------------------
    def send_welcome_email(self, recipient: str, username: str, full_name: str) -> EmailMessage:
        """Send welcome email upon successful account registration."""
        name = full_name or username
        subject = "Welcome to MatPilot Scientific Platform"
        html_body = self._base_template(subject, f"""
          <h1>Welcome to MatPilot, {name}!</h1>
          <p>Thank you for joining MatPilot Version 1.5.1. Your account has been created and your cloud scientific workspace is ready.</p>
          <p>With MatPilot, you can:</p>
          <ul>
            <li>Upload raw characterization data (XRD, FTIR, Raman, UV-Vis)</li>
            <li>Perform automated multi-provider Phase Identification and Rietveld refinement</li>
            <li>Generate publication-quality scientific reports in seconds</li>
          </ul>
          <div style="text-align: center;">
            <a href="{self.app_url}/dashboard" class="btn btn-primary">Open Your Dashboard</a>
          </div>
          <p>If you have any questions, our support team is ready to assist you.</p>
        """)
        text_body = f"Welcome to MatPilot, {name}! Visit {self.app_url}/dashboard to get started."
        return self.send_email(recipient, subject, html_body, text_body, template_name="welcome")

    def send_verification_email(self, recipient: str, username: str, token: str) -> EmailMessage:
        """Send account verification link."""
        verify_url = f"{self.app_url}/verify-email?token={token}"
        subject = "Verify your MatPilot account email"
        html_body = self._base_template(subject, f"""
          <h1>Verify Your Email Address</h1>
          <p>Hello {username},</p>
          <p>Please confirm your email address to unlock all scientific collaboration features and ensure account security.</p>
          <div style="text-align: center;">
            <a href="{verify_url}" class="btn">Verify Email Address</a>
          </div>
          <div class="alert-box">
            <strong>Note:</strong> This link expires in 60 minutes. If you did not create a MatPilot account, you can safely ignore this email.
          </div>
          <p style="font-size: 13px; color: #8b949e;">If the button above does not work, copy and paste this link into your browser:<br><a href="{verify_url}" style="color: #58a6ff;">{verify_url}</a></p>
        """)
        text_body = f"Hello {username}, verify your MatPilot account: {verify_url}"
        return self.send_email(recipient, subject, html_body, text_body, template_name="verify_email", metadata={"token": token})

    def send_password_reset_email(self, recipient: str, username: str, token: str) -> EmailMessage:
        """Send password reset link."""
        reset_url = f"{self.app_url}/reset-password?token={token}"
        subject = "Password Reset Request — MatPilot"
        html_body = self._base_template(subject, f"""
          <h1>Reset Your Password</h1>
          <p>Hello {username},</p>
          <p>We received a request to reset the password for your MatPilot scientific workspace account.</p>
          <div style="text-align: center;">
            <a href="{reset_url}" class="btn btn-primary">Reset Password</a>
          </div>
          <div class="alert-box">
            <strong>Security Warning:</strong> If you did not request a password reset, please contact security immediately or ignore this email. Your password will remain unchanged.
          </div>
          <p style="font-size: 13px; color: #8b949e;">Or open this link: <a href="{reset_url}" style="color: #58a6ff;">{reset_url}</a></p>
        """)
        text_body = f"Hello {username}, reset your MatPilot password: {reset_url}"
        return self.send_email(recipient, subject, html_body, text_body, template_name="password_reset", metadata={"token": token})

    def send_password_changed_email(self, recipient: str, username: str) -> EmailMessage:
        """Send confirmation email after a password change."""
        subject = "Security Alert: Your MatPilot password was changed"
        html_body = self._base_template(subject, f"""
          <h1>Password Changed Successfully</h1>
          <p>Hello {username},</p>
          <p>This email confirms that your password for MatPilot was recently changed.</p>
          <div class="alert-box">
            If you did not make this change, please contact our laboratory support immediately at <a href="{self.app_url}/contact">support</a> and secure your account.
          </div>
          <p>Thank you for using MatPilot.</p>
        """)
        text_body = f"Hello {username}, your MatPilot password was recently changed. If this wasn't you, contact support."
        return self.send_email(recipient, subject, html_body, text_body, template_name="password_changed")

    def send_account_created_email(self, recipient: str, username: str, role: str) -> EmailMessage:
        """Send account creation confirmation."""
        subject = f"MatPilot Account Created ({role})"
        html_body = self._base_template(subject, f"""
          <h1>Your Account is Ready</h1>
          <p>Hello {username},</p>
          <p>Your account has been successfully provisioned with the role <strong>{role}</strong>.</p>
          <div style="text-align: center;">
            <a href="{self.app_url}/dashboard" class="btn btn-primary">Launch Workspace</a>
          </div>
        """)
        text_body = f"Hello {username}, your MatPilot account ({role}) is ready."
        return self.send_email(recipient, subject, html_body, text_body, template_name="account_created")
