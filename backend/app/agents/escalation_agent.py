"""
CivicGrid — Escalation Agent (Social Media Manager)
APScheduler job that monitors SLA deadlines. When an issue's SLA expires
without resolution, this agent uses Gemini to craft a professional caption
and pushes to Twitter/X and Instagram with the original media attached.
"""
import logging
from datetime import datetime, timezone
from typing import Optional
import google.generativeai as genai
from supabase import Client
from app.config import settings
from app.services.social_media import SocialMediaService

logger = logging.getLogger(__name__)

ESCALATION_CAPTION_PROMPT = """
You are a civic accountability communications specialist. Write a highly professional,
data-backed social media post about an unresolved community issue that has exceeded
its municipal SLA deadline.

Issue details:
- Category: {category}
- Description: {description}
- Location: {address}
- Severity Level: {severity_level} (Score: {severity_score}/10)
- Days Overdue: {days_overdue}
- Department Responsible: {department}
- Number of Citizens Affected (co-reporters): {co_reporter_count}
- Original Report Date: {report_date}

Requirements:
- Professional and factual tone (not aggressive or inflammatory)
- Include the days overdue prominently
- Tag the relevant department if known
- Include relevant civic hashtags
- End with a call for transparent resolution
- Keep under 280 characters for Twitter version
- Provide a longer Instagram version (up to 2200 characters)

Return valid JSON ONLY:
{{
  "twitter_caption": "<tweet text under 280 chars>",
  "instagram_caption": "<longer IG caption with hashtags>",
  "hashtags": ["#CivicGrid", "#PublicService", ...]
}}
"""


class EscalationAgent:
    """
    Monitors issue SLA deadlines and escalates overdue issues to social media.
    Designed to run as a scheduled APScheduler job every 15 minutes.
    """

    def __init__(self, db: Client):
        self.db = db
        self.social = SocialMediaService()
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)

    async def check_and_escalate(self) -> dict:
        """
        Scheduled job entry point. Finds all overdue open issues and escalates them.
        Returns summary of escalations performed.
        """
        now = datetime.now(timezone.utc)

        try:
            # Query issues past SLA deadline that haven't been escalated yet
            response = (
                self.db.table("issues")
                .select(
                    "id, title, description, category, severity_score, severity_level, "
                    "address_text, department, reporter_id, media_urls, sla_deadline, "
                    "created_at, ai_description"
                )
                .lt("sla_deadline", now.isoformat())
                .in_("status", ["open", "assigned", "in_progress"])
                .is_("escalated_at", "null")
                .execute()
            )

            overdue_issues = response.data or []
            escalated = []
            failed = []

            for issue in overdue_issues:
                try:
                    result = await self._escalate_issue(issue, now)
                    if result["success"]:
                        escalated.append(issue["id"])
                    else:
                        failed.append(issue["id"])
                except Exception as e:
                    logger.error(f"EscalationAgent: failed for issue {issue['id']}: {e}")
                    failed.append(issue["id"])

            logger.info(
                f"EscalationAgent.check_and_escalate: "
                f"escalated={len(escalated)} failed={len(failed)}"
            )
            return {
                "escalated_count": len(escalated),
                "failed_count": len(failed),
                "escalated_ids": escalated,
            }

        except Exception as e:
            logger.error(f"EscalationAgent.check_and_escalate error: {e}", exc_info=True)
            return {"escalated_count": 0, "failed_count": 0, "escalated_ids": []}

    async def _escalate_issue(self, issue: dict, now: datetime) -> dict:
        """Generate caption and post to social media for a single overdue issue."""
        issue_id = issue["id"]

        # Calculate days overdue
        sla_deadline = datetime.fromisoformat(
            issue["sla_deadline"].replace("Z", "+00:00")
        )
        days_overdue = max(1, (now - sla_deadline).days)

        # Get co-reporter count
        co_resp = (
            self.db.table("issue_co_reporters")
            .select("id", count="exact")
            .eq("issue_id", issue_id)
            .execute()
        )
        co_reporter_count = co_resp.count or 0

        # Generate professional caption via Gemini
        prompt = ESCALATION_CAPTION_PROMPT.format(
            category=issue["category"].replace("_", " ").title(),
            description=issue.get("ai_description") or issue.get("description") or "No description",
            address=issue.get("address_text") or "Location on file",
            severity_level=issue["severity_level"],
            severity_score=issue["severity_score"],
            days_overdue=days_overdue,
            department=issue.get("department") or "Municipal Services",
            co_reporter_count=co_reporter_count,
            report_date=issue["created_at"][:10],
        )

        try:
            response = await self.model.generate_content_async(
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.3,
                    max_output_tokens=1024,
                ),
            )

            import json
            captions = json.loads(response.text.strip())
        except Exception as e:
            logger.error(f"EscalationAgent: Gemini caption generation failed: {e}")
            captions = {
                "twitter_caption": (
                    f"⚠️ OVERDUE: {issue['category'].replace('_',' ').title()} in your area "
                    f"is {days_overdue} day(s) past its resolution deadline. "
                    f"#CivicGrid #PublicService"
                ),
                "instagram_caption": "",
                "hashtags": ["#CivicGrid", "#PublicService"],
            }

        # Push to social media
        media_url = issue.get("media_urls", [None])[0]
        twitter_result  = await self.social.post_to_twitter(
            caption=captions["twitter_caption"],
            media_url=media_url,
        )
        instagram_result = await self.social.post_to_instagram(
            caption=captions.get("instagram_caption") or captions["twitter_caption"],
            media_url=media_url,
        )

        # Record social posts
        for platform, result in [
            ("twitter", twitter_result),
            ("instagram", instagram_result),
        ]:
            self.db.table("social_posts").insert({
                "issue_id": issue_id,
                "platform": platform,
                "caption": captions.get(f"{platform}_caption") or captions["twitter_caption"],
                "post_id": result.get("post_id"),
                "status": "posted" if result.get("success") else "failed",
                "error_message": result.get("error"),
            }).execute()

        # Mark issue as escalated
        self.db.table("issues").update({
            "status": "escalated",
            "escalated_at": now.isoformat(),
        }).eq("id", issue_id).execute()

        return {"success": True}
