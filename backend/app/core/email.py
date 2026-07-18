import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _send_sync(to: str, subject: str, html_body: str) -> None:
    settings = get_settings()

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = settings.sender_email
    message["To"] = to
    message.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.email_host, settings.email_port) as server:
        server.starttls()
        server.login(settings.sender_email, settings.sender_email_pw)
        server.sendmail(settings.sender_email, to, message.as_string())


async def send_email(to: str, subject: str, html_body: str) -> None:
    try:
        await asyncio.to_thread(_send_sync, to, subject, html_body)
    except Exception:
        logger.exception("Failed to send email to %s", to)
        raise
