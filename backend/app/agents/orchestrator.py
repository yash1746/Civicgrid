"""
CivicGrid — MAS Orchestrator
Coordinates the sequential Multi-Agent pipeline for new issue reports
and proof-of-work validation. No LangChain — pure Python async pipeline.

Pipeline for new issue:
  1. VisionAgent  → classify image
  2. DedupAgent   → check 50m radius for duplicates
  3a. [IF DUPLICATE] → merge as co-reporter, stop
  3b. [IF NEW]    → create issue in Supabase
  4. RoutingAgent → assign department, trigger RPA
  5. NotificationAgent → email reporter
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from supabase import Client
from app.agents.vision_agent import VisionAgent
from app.agents.dedup_agent import DedupAgent
from app.agents.routing_agent import RoutingAgent
from app.agents.notification_agent import NotificationAgent
from app.config import settings

logger = logging.getLogger(__name__)


class MASOrchestrator:
    """
    Sequential multi-agent pipeline coordinator.
    All agents share the same Supabase client instance.
    """

    def __init__(self, db: Client):
        self.db = db
        self.vision = VisionAgent()
        self.dedup = DedupAgent(db)
        self.routing = RoutingAgent(db)
        self.notification = NotificationAgent(db)

    async def process_new_issue(
        self,
        media_bytes: bytes,
        media_mime: str,
        lat: float,
        lng: float,
        reporter_id: str,
        title: str,
        description: Optional[str],
        media_urls: list[str],
        address_text: Optional[str] = None,
    ) -> dict:
        """
        Full pipeline for a new issue submission.

        Returns:
            {
                issue_id: str,
                is_duplicate: bool,
                category: str,
                department: str,
                severity_score: int,
                message: str,
            }
        """
        logger.info(
            f"MASOrchestrator: starting pipeline for reporter={reporter_id} "
            f"coords=({lat},{lng})"
        )
        agent_log_base = {"issue_id": None, "input_payload": {}, "output_payload": {}}

        # ── STEP 1: Vision Agent ───────────────────────────────────────────
        vision_result = await self.vision.analyze_issue(media_bytes, media_mime)
        self._log_agent("vision_agent", None, {"mime": media_mime}, vision_result)

        if not vision_result.get("is_valid_civic_issue", True):
            return {
                "issue_id": None,
                "is_duplicate": False,
                "category": "other",
                "department": None,
                "severity_score": 0,
                "message": "The uploaded media does not appear to show a community issue.",
            }

        category = vision_result["category"]
        severity_score = vision_result["severity_score"]
        severity_level = vision_result["severity_level"]
        department = vision_result["department"]
        ai_description = vision_result["description"]

        # ── STEP 2: Dedup Agent ────────────────────────────────────────────
        dedup_result = await self.dedup.check_duplicate(lat, lng, category)
        self._log_agent("dedup_agent", None, {"lat": lat, "lng": lng, "category": category}, dedup_result)

        if dedup_result["is_duplicate"]:
            existing_id = dedup_result["existing_issue_id"]
            merge_result = await self.dedup.merge_as_co_reporter(existing_id, reporter_id)
            self._log_agent("dedup_agent", existing_id, {"action": "merge"}, merge_result)

            # Notify about co-report (status unchanged but co-reporter notified)
            await self.notification.notify_status_change(existing_id, "open")

            return {
                "issue_id": existing_id,
                "is_duplicate": True,
                "category": category,
                "department": department,
                "severity_score": severity_score,
                "message": merge_result["message"],
            }

        # ── STEP 3: Create New Issue in Supabase ──────────────────────────
        sla_hours = settings.sla_hours_for_severity(severity_score)
        sla_deadline = (
            datetime.now(timezone.utc) + timedelta(hours=sla_hours)
        ).isoformat()

        issue_data = {
            "title": title,
            "description": description,
            "category": category,
            "severity_score": severity_score,
            "severity_level": severity_level,
            "ai_description": ai_description,
            "status": "open",
            "department": department,
            "location": f"SRID=4326;POINT({lng} {lat})",  # WKT for PostGIS
            "address_text": address_text,
            "media_urls": media_urls,
            "reporter_id": reporter_id,
            "sla_hours": sla_hours,
            "sla_deadline": sla_deadline,
        }

        issue_resp = self.db.table("issues").insert(issue_data).execute()
        new_issue = issue_resp.data[0]
        issue_id = new_issue["id"]

        logger.info(f"MASOrchestrator: created issue {issue_id}")

        # Award civic trust points to reporter (+10 for new issue)
        try:
            self.db.rpc(
                "increment_civic_trust",
                {"user_id": reporter_id, "points": 10},
            ).execute()
        except Exception:
            pass  # Non-critical

        # ── STEP 4: Routing Agent ──────────────────────────────────────────
        routing_result = await self.routing.route(
            issue_id=issue_id,
            category=category,
            department=department,
            severity_score=severity_score,
            sla_hours=sla_hours,
        )
        self._log_agent("routing_agent", issue_id, {"department": department}, routing_result)

        # ── STEP 5: Notification Agent ─────────────────────────────────────
        await self.notification.notify_status_change(issue_id, "open")

        return {
            "issue_id": issue_id,
            "is_duplicate": False,
            "category": category,
            "department": department,
            "severity_score": severity_score,
            "sla_deadline": sla_deadline,
            "message": f"Issue reported successfully. Routed to {department}.",
        }

    async def process_proof_of_work(
        self,
        issue_id: str,
        before_bytes: bytes,
        after_bytes: bytes,
        before_mime: str,
        after_mime: str,
        resolver_id: str,
        proof_media_urls: list[str],
    ) -> dict:
        """
        Validate proof-of-work submission via Vision Agent.
        If validated, closes the ticket and notifies all stakeholders.
        """
        # Validate before/after via Gemini Vision
        validation = await self.vision.validate_proof(
            before_bytes, after_bytes, before_mime, after_mime
        )
        self._log_agent("vision_agent", issue_id, {"action": "validate_proof"}, validation)

        if validation["is_resolved"]:
            # Update issue as resolved
            self.db.table("issues").update({
                "status": "resolved",
                "proof_media_urls": proof_media_urls,
                "resolved_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", issue_id).execute()

            # Award resolver trust points (+20 for resolving)
            try:
                self.db.rpc(
                    "increment_civic_trust",
                    {"user_id": resolver_id, "points": 20},
                ).execute()
            except Exception:
                pass

            # Notify all stakeholders
            await self.notification.notify_status_change(issue_id, "resolved")

        return {
            "is_validated": validation["is_resolved"],
            "confidence_score": validation["confidence_score"],
            "resolution_quality": validation["resolution_quality"],
            "notes": validation["validation_notes"],
            "status": "resolved" if validation["is_resolved"] else "in_progress",
        }

    def _log_agent(
        self,
        agent_name: str,
        issue_id: Optional[str],
        input_payload: dict,
        output_payload: dict,
    ):
        """Persist agent execution log to Supabase."""
        try:
            self.db.table("agent_logs").insert({
                "issue_id": issue_id,
                "agent_name": agent_name,
                "input_payload": input_payload,
                "output_payload": output_payload,
                "success": True,
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to log agent '{agent_name}': {e}")
