"""
CivicGrid — Deduplication Agent
Queries Supabase PostGIS to find existing open issues within a 50-meter radius
with the same category. If a match is found, the new report is merged as a
co-reporter instead of creating a duplicate.
"""
import logging
from typing import Optional
from supabase import Client

logger = logging.getLogger(__name__)

DEDUP_RADIUS_METERS = 50


class DedupAgent:
    """
    Uses Supabase RPC (PostGIS ST_DWithin) to detect duplicate issue reports
    within DEDUP_RADIUS_METERS of the submitted coordinates.
    """

    def __init__(self, db: Client):
        self.db = db

    async def check_duplicate(
        self,
        lat: float,
        lng: float,
        category: str,
    ) -> dict:
        """
        Query for nearby open issues with the same category.

        Returns:
            {
                is_duplicate: bool,
                existing_issue_id: str | None,
                distance_m: float | None,
                nearby_count: int,
            }
        """
        try:
            response = self.db.rpc(
                "nearby_issues",
                {
                    "lat": lat,
                    "lng": lng,
                    "radius_m": DEDUP_RADIUS_METERS,
                    "cat": category,
                },
            ).execute()

            nearby = response.data or []

            if nearby:
                closest = nearby[0]  # Already ordered by distance ASC
                logger.info(
                    f"DedupAgent: found {len(nearby)} nearby issue(s). "
                    f"Closest: {closest['id']} at {closest['distance_m']:.1f}m"
                )
                return {
                    "is_duplicate": True,
                    "existing_issue_id": closest["id"],
                    "distance_m": closest["distance_m"],
                    "nearby_count": len(nearby),
                }

            return {
                "is_duplicate": False,
                "existing_issue_id": None,
                "distance_m": None,
                "nearby_count": 0,
            }

        except Exception as e:
            logger.error(f"DedupAgent.check_duplicate error: {e}", exc_info=True)
            # On dedup failure, treat as non-duplicate to avoid blocking submissions
            return {
                "is_duplicate": False,
                "existing_issue_id": None,
                "distance_m": None,
                "nearby_count": 0,
            }

    async def merge_as_co_reporter(
        self,
        existing_issue_id: str,
        reporter_id: str,
    ) -> dict:
        """
        Add the new reporter as a co-reporter on the existing issue.
        Increments civic_trust_score for verifying an existing issue.

        Returns:
            { success: bool, issue_id: str, message: str }
        """
        try:
            # Check if user is already a co-reporter
            existing = (
                self.db.table("issue_co_reporters")
                .select("id")
                .eq("issue_id", existing_issue_id)
                .eq("user_id", reporter_id)
                .execute()
            )

            if existing.data:
                return {
                    "success": True,
                    "issue_id": existing_issue_id,
                    "message": "You have already reported this issue.",
                }

            # Insert co-reporter
            self.db.table("issue_co_reporters").insert({
                "issue_id": existing_issue_id,
                "user_id": reporter_id,
            }).execute()

            # Award civic trust points for verifying an existing issue (+5)
            self.db.rpc(
                "increment_civic_trust",
                {"user_id": reporter_id, "points": 5},
            ).execute()

            logger.info(
                f"DedupAgent: merged reporter {reporter_id} as co-reporter "
                f"on issue {existing_issue_id}"
            )
            return {
                "success": True,
                "issue_id": existing_issue_id,
                "message": "Your report has been linked to an existing issue nearby.",
            }

        except Exception as e:
            logger.error(f"DedupAgent.merge_as_co_reporter error: {e}", exc_info=True)
            return {
                "success": False,
                "issue_id": existing_issue_id,
                "message": "Merge failed. Issue not duplicated.",
            }
