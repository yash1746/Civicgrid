"""
CivicGrid — Email Service (SendGrid)
SMS-gateway-ready architecture: extend _dispatch_sms() for Twilio/Vonage.
"""
import logging
import asyncio
from typing import Optional
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from app.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self._client: Optional[SendGridAPIClient] = None
        if settings.SENDGRID_API_KEY:
            self._client = SendGridAPIClient(settings.SENDGRID_API_KEY)

    async def send(
        self,
        to_email: str,
        to_name: str,
        subject: str,
        html_body: str,
    ) -> bool:
        """Send an HTML email via SendGrid. Returns True on success."""
        if not self._client:
            logger.warning("EmailService: SendGrid not configured — logging email instead")
            logger.info(f"[EMAIL] To: {to_email} | Subject: {subject}")
            return False

        message = Mail(
            from_email=Email(settings.EMAIL_FROM, settings.EMAIL_FROM_NAME),
            to_emails=To(to_email, to_name),
            subject=subject,
            html_content=Content("text/html", html_body),
        )

        try:
            response = await asyncio.to_thread(self._client.send, message)
            success = response.status_code in (200, 201, 202)
            if success:
                logger.info(f"EmailService: sent to {to_email} | status={response.status_code}")
            else:
                logger.warning(
                    f"EmailService: unexpected status {response.status_code} for {to_email}"
                )
            return success

        except Exception as e:
            logger.error(f"EmailService.send error for {to_email}: {e}", exc_info=True)
            return False

    # ── SMS Gateway Extension Point ────────────────────────────────────────
    # To enable SMS, install `twilio` and implement this method:
    #
    # async def send_sms(self, to_phone: str, body: str) -> bool:
    #     from twilio.rest import Client
    #     client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    #     msg = await asyncio.to_thread(
    #         client.messages.create,
    #         body=body,
    #         from_=settings.TWILIO_PHONE_NUMBER,
    #         to=to_phone,
    #     )
    #     return msg.status not in ('failed', 'undelivered')
