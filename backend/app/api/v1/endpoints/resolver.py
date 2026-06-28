"""
CivicGrid — Resolver Portal API
Work queue sorted by SLA urgency and geolocation proximity.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.database import get_db
from app.core.dependencies import require_resolver

router = APIRouter(prefix="/resolver", tags=["Resolver Portal"])


@router.get("/queue")
async def get_work_queue(
    lat: float = None,
    lng: float = None,
    status_filter: str = "open,assigned,in_progress",
    limit: int = 50,
    current_user: dict = Depends(require_resolver),
    db: Client = Depends(get_db),
):
    """
    Returns work queue sorted by SLA urgency (overdue first).
    Optionally filters by proximity if lat/lng provided.
    """
    statuses = status_filter.split(",")
    now = datetime.now(timezone.utc).isoformat()

    # Fetch issues
    query = (
        db.table("issues")
        .select(
            "id, title, category, severity_level, severity_score, status, "
            "department, address_text, media_urls, sla_deadline, created_at, "
            "reporter_id"
        )
        .in_("status", statuses)
        .order("sla_deadline", desc=False)  # Most urgent first
        .limit(limit)
    )

    resp = query.execute()
    issues = resp.data or []

    # Annotate with SLA urgency label
    now_dt = datetime.now(timezone.utc)
    for issue in issues:
        if issue.get("sla_deadline"):
            sla_dt = datetime.fromisoformat(
                issue["sla_deadline"].replace("Z", "+00:00")
            )
            hours_remaining = (sla_dt - now_dt).total_seconds() / 3600
            if hours_remaining < 0:
                issue["sla_urgency"] = "overdue"
                issue["hours_remaining"] = round(abs(hours_remaining), 1)
            elif hours_remaining < 4:
                issue["sla_urgency"] = "critical"
                issue["hours_remaining"] = round(hours_remaining, 1)
            elif hours_remaining < 24:
                issue["sla_urgency"] = "high"
                issue["hours_remaining"] = round(hours_remaining, 1)
            else:
                issue["sla_urgency"] = "normal"
                issue["hours_remaining"] = round(hours_remaining, 1)
        else:
            issue["sla_urgency"] = "normal"
            issue["hours_remaining"] = None

    # If coordinates provided, add distance context using Supabase RPC
    if lat and lng:
        nearby_resp = db.rpc(
            "nearby_issues",
            {"lat": lat, "lng": lng, "radius_m": 50000},  # 50km
        ).execute()
        distance_map = {
            r["id"]: r["distance_m"]
            for r in (nearby_resp.data or [])
        }
        for issue in issues:
            issue["distance_m"] = distance_map.get(issue["id"])

    return {"success": True, "data": issues, "total": len(issues)}


@router.post("/issues/{issue_id}/accept")
async def accept_issue(
    issue_id: str,
    current_user: dict = Depends(require_resolver),
    db: Client = Depends(get_db),
):
    """Resolver claims an issue from the queue."""
    db.table("issues").update({
        "assigned_to": current_user["id"],
        "status": "in_progress",
    }).eq("id", issue_id).execute()

    return {"success": True, "issue_id": issue_id, "status": "in_progress"}
