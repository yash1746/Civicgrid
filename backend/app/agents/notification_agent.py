"""
CivicGrid — Notification Agent
Sends automated, well-formatted email updates to all users attached to a ticket
when issue statuses change. Structured for easy SMS gateway extension.
"""
import logging
from typing import Optional
from supabase import Client
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)

# ── Status → Human-readable messages ──────────────────────────────────────
STATUS_MESSAGES = {
    "open": {
        "subject": "🟡 Your Issue Has Been Received — CivicGrid",
        "action": "received and is being processed",
        "color": "#F59E0B",
        "icon": "📋",
    },
    "assigned": {
        "subject": "🔵 Your Issue Has Been Assigned — CivicGrid",
        "action": "assigned to a municipal department",
        "color": "#3B82F6",
        "icon": "🏛️",
    },
    "in_progress": {
        "subject": "🔧 Work Has Begun on Your Issue — CivicGrid",
        "action": "currently being worked on by field teams",
        "color": "#8B5CF6",
        "icon": "🔧",
    },
    "resolved": {
        "subject": "✅ Your Issue Has Been Resolved — CivicGrid",
        "action": "marked as resolved",
        "color": "#10B981",
        "icon": "✅",
    },
    "escalated": {
        "subject": "⚠️ Your Issue Has Been Escalated — CivicGrid",
        "action": "escalated due to SLA breach — public attention has been raised",
        "color": "#EF4444",
        "icon": "⚠️",
    },
    "closed": {
        "subject": "🔒 Issue Closed — CivicGrid",
        "action": "closed",
        "color": "#6B7280",
        "icon": "🔒",
    },
}

EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CivicGrid Issue Update</title>
  <style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #0F172A; margin: 0; padding: 20px; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #1E293B; border-radius: 16px; overflow: hidden; }}
    .header {{ background: linear-gradient(135deg, #1E40AF, #7C3AED); padding: 32px; text-align: center; }}
    .header h1 {{ color: #00E5FF; margin: 0; font-size: 28px; letter-spacing: 2px; }}
    .header p {{ color: #94A3B8; margin: 8px 0 0; }}
    .status-badge {{ display: inline-block; padding: 8px 20px; border-radius: 50px; font-weight: 700; font-size: 14px; margin: 16px 0; }}
    .body {{ padding: 32px; }}
    .body h2 {{ color: #E2E8F0; margin: 0 0 8px; }}
    .body p {{ color: #94A3B8; line-height: 1.6; }}
    .issue-card {{ background: #0F172A; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid {color}; }}
    .issue-card .label {{ color: #64748B; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }}
    .issue-card .value {{ color: #E2E8F0; font-size: 15px; margin: 2px 0 12px; }}
    .cta {{ text-align: center; margin: 24px 0; }}
    .cta a {{ background: linear-gradient(135deg, #1E40AF, #7C3AED); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; }}
    .footer {{ text-align: center; padding: 20px; border-top: 1px solid #1E293B; }}
    .footer p {{ color: #475569; font-size: 12px; margin: 4px 0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚡ CIVICGRID</h1>
      <p>AI-Powered Community Issue Resolution</p>
    </div>
    <div class="body">
      <h2>Hello, {user_name} {icon}</h2>
      <p>Your reported issue has been <strong style="color:{color}">{action}</strong>.</p>
      <div class="issue-card">
        <div class="label">Issue Title</div>
        <div class="value">{issue_title}</div>
        <div class="label">Category</div>
        <div class="value">{category}</div>
        <div class="label">Current Status</div>
        <div class="value" style="color:{color}">{status}</div>
        <div class="label">Department</div>
        <div class="value">{department}</div>
        {sla_section}
      </div>
      <div class="cta">
        <a href="{tracking_url}">Track Your Issue →</a>
      </div>
      <p style="font-size:13px;color:#64748B;">
        You're receiving this because you reported or co-reported this issue.
        {co_reporter_note}
      </p>
    </div>
    <div class="footer">
      <p>CivicGrid — Empowering Citizens, Transforming Communities</p>
      <p>© 2026 CivicGrid. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
"""


class NotificationAgent:
    """
    Dispatches email notifications to issue reporters and co-reporters.
    Architecture is SMS-gateway ready: extend _dispatch() to add SMS channel.
    """

    def __init__(self, db: Client):
        self.db = db
        self.email_service = EmailService()

    async def notify_status_change(
        self,
        issue_id: str,
        new_status: str,
        tracking_base_url: str = "https://civicgrid.io/issues",
    ) -> dict:
        """
        Fetch all users attached to an issue (reporter + co-reporters)
        and send them a formatted status update email.
        """
        try:
            # Fetch issue details
            issue_resp = (
                self.db.table("issues")
                .select("id, title, category, status, department, sla_deadline, reporter_id")
                .eq("id", issue_id)
                .single()
                .execute()
            )
            issue = issue_resp.data
            if not issue:
                logger.warning(f"NotificationAgent: issue {issue_id} not found")
                return {"sent": 0, "failed": 0}

            # Collect all user IDs (reporter + co-reporters)
            user_ids = {issue["reporter_id"]}
            co_resp = (
                self.db.table("issue_co_reporters")
                .select("user_id")
                .eq("issue_id", issue_id)
                .execute()
            )
            for row in co_resp.data or []:
                user_ids.add(row["user_id"])

            # Fetch user records
            users_resp = (
                self.db.table("users")
                .select("id, email, full_name")
                .in_("id", list(user_ids))
                .eq("is_active", True)
                .execute()
            )
            users = users_resp.data or []

            status_info = STATUS_MESSAGES.get(new_status, STATUS_MESSAGES["open"])
            sent = 0
            failed = 0

            for user in users:
                is_co_reporter = str(user["id"]) != str(issue["reporter_id"])
                success = await self._dispatch_email(
                    user=user,
                    issue=issue,
                    status_info=status_info,
                    new_status=new_status,
                    tracking_url=f"{tracking_base_url}/{issue_id}",
                    is_co_reporter=is_co_reporter,
                )

                # Log notification
                self.db.table("notifications").insert({
                    "issue_id": issue_id,
                    "user_id": user["id"],
                    "channel": "email",
                    "subject": status_info["subject"],
                    "status": "sent" if success else "failed",
                }).execute()

                if success:
                    sent += 1
                else:
                    failed += 1

            logger.info(
                f"NotificationAgent: issue {issue_id} status={new_status} "
                f"sent={sent} failed={failed}"
            )
            return {"sent": sent, "failed": failed}

        except Exception as e:
            logger.error(f"NotificationAgent.notify_status_change error: {e}", exc_info=True)
            return {"sent": 0, "failed": 0}

    async def _dispatch_email(
        self,
        user: dict,
        issue: dict,
        status_info: dict,
        new_status: str,
        tracking_url: str,
        is_co_reporter: bool,
    ) -> bool:
        """Render and send the email. Returns True on success."""
        sla_section = ""
        if issue.get("sla_deadline"):
            sla_section = f"""
            <div class="label">SLA Deadline</div>
            <div class="value">{issue['sla_deadline'][:16].replace('T', ' ')} UTC</div>
            """

        co_reporter_note = (
            "You co-reported this issue and will receive updates."
            if is_co_reporter
            else ""
        )

        html_body = EMAIL_TEMPLATE.format(
            user_name=user["full_name"].split()[0],
            icon=status_info["icon"],
            action=status_info["action"],
            color=status_info["color"],
            issue_title=issue["title"],
            category=issue["category"].replace("_", " ").title(),
            status=new_status.replace("_", " ").title(),
            department=issue.get("department") or "Awaiting Assignment",
            sla_section=sla_section,
            tracking_url=tracking_url,
            co_reporter_note=co_reporter_note,
        )

        return await self.email_service.send(
            to_email=user["email"],
            to_name=user["full_name"],
            subject=status_info["subject"],
            html_body=html_body,
        )
