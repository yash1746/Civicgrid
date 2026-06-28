"""
CivicGrid — Routing & RPA Agent
Determines the correct municipal department for a reported issue
and triggers RPA scripts to auto-fill municipal web forms.
"""
import logging
from typing import Optional
from supabase import Client
from app.rpa.form_filler import RPAFormFiller

logger = logging.getLogger(__name__)

# Department → SLA multiplier (fine-tuning beyond base severity)
DEPARTMENT_SLA_OVERRIDE: dict[str, Optional[int]] = {
    "Water & Sanitation Authority": None,       # Use severity-based SLA
    "Electrical & Public Lighting": None,
    "Department of Roads & Infrastructure": None,
    "Stormwater & Drainage Authority": None,
    "Solid Waste Management": 72,               # Fixed 72h for garbage
    "Parks & Urban Forestry": 96,               # Fixed 96h for trees
    "Public Property & Urban Aesthetics": 120,  # Fixed 120h for graffiti
    "General Municipal Services": 72,
}


class RoutingAgent:
    """
    Routes issues to the correct department and initiates RPA form submission.
    """

    def __init__(self, db: Client):
        self.db = db
        self.rpa = RPAFormFiller()

    async def route(
        self,
        issue_id: str,
        category: str,
        department: str,
        severity_score: int,
        sla_hours: int,
    ) -> dict:
        """
        Update the issue record with department assignment and trigger RPA.

        Returns:
            {
                success: bool,
                department: str,
                rpa_submitted: bool,
                rpa_reference_id: str | None,
            }
        """
        try:
            # Update issue with department
            self.db.table("issues").update({
                "department": department,
                "status": "assigned",
            }).eq("id", issue_id).execute()

            logger.info(
                f"RoutingAgent: issue {issue_id} routed to '{department}'"
            )

            # Trigger RPA form submission (async, non-blocking)
            rpa_result = await self.rpa.submit_to_municipal_portal(
                issue_id=issue_id,
                department=department,
                category=category,
                severity_score=severity_score,
                sla_hours=sla_hours,
            )

            # Log RPA result
            if rpa_result.get("submitted"):
                self.db.table("issues").update({
                    "rpa_form_submitted": True,
                    "rpa_reference_id": rpa_result.get("reference_id"),
                }).eq("id", issue_id).execute()

            return {
                "success": True,
                "department": department,
                "rpa_submitted": rpa_result.get("submitted", False),
                "rpa_reference_id": rpa_result.get("reference_id"),
            }

        except Exception as e:
            logger.error(f"RoutingAgent.route error: {e}", exc_info=True)
            return {
                "success": False,
                "department": department,
                "rpa_submitted": False,
                "rpa_reference_id": None,
            }
