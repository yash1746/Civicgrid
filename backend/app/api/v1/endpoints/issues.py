"""
CivicGrid — Issues API Endpoints
Handles media + geolocation ingestion and the Proof-of-Work flow.
"""
import logging
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from supabase import Client
from app.database import get_db
from app.core.dependencies import get_current_user, require_citizen
from app.agents.orchestrator import MASOrchestrator
from app.services.storage import StorageService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/issues", tags=["Issues"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/webm"}
ALLOWED_MEDIA_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES
MAX_FILE_SIZE_MB = 50


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/v1/issues/report
# Main ingestion endpoint — accepts media + geo coordinates from frontend
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/report", status_code=status.HTTP_201_CREATED)
async def report_issue(
    # ── Media files (1-5 photos/videos) ──────────────────────────────────
    media: Annotated[list[UploadFile], File(description="Issue photos or short video clips")],
    # ── Geo coordinates (CRITICAL: provided by frontend native extraction) ─
    latitude: Annotated[float, Form(description="GPS latitude from EXIF or Geolocation API")],
    longitude: Annotated[float, Form(description="GPS longitude from EXIF or Geolocation API")],
    # ── Issue metadata ────────────────────────────────────────────────────
    title: Annotated[str, Form(min_length=5, max_length=200)],
    description: Annotated[Optional[str], Form(max_length=2000)] = None,
    address_text: Annotated[Optional[str], Form(max_length=500)] = None,
    # ── Auth ──────────────────────────────────────────────────────────────
    current_user: dict = Depends(require_citizen),
    db: Client = Depends(get_db),
):
    """
    Primary issue ingestion endpoint.

    CRITICAL CONSTRAINT:
    - latitude/longitude MUST be extracted natively by the frontend
      (EXIF metadata or browser Geolocation API).
    - This endpoint NEVER calls any AI/LLM to determine location.
    - Location data is trusted as-provided from the client.
    """
    # Validate coordinates
    if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid GPS coordinates provided.",
        )

    if not media or len(media) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one media file is required.",
        )

    # Validate and read primary media file (first file used for Vision Agent)
    primary_file = media[0]
    if primary_file.content_type not in ALLOWED_MEDIA_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File type '{primary_file.content_type}' not supported.",
        )

    primary_bytes = await primary_file.read()
    if len(primary_bytes) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {MAX_FILE_SIZE_MB}MB.",
        )

    # Determine mime type for Vision Agent
    primary_mime = primary_file.content_type
    if primary_file.content_type in ALLOWED_VIDEO_TYPES:
        # For videos, use first frame analysis prompt variant
        primary_mime = primary_file.content_type

    # Upload all media files to Supabase Storage
    storage = StorageService(db)
    media_urls = []

    # Upload primary
    primary_url = await storage.upload_issue_media(
        file_bytes=primary_bytes,
        filename=primary_file.filename or "media.jpg",
        content_type=primary_file.content_type,
    )
    if primary_url:
        media_urls.append(primary_url)

    # Upload additional files
    for extra_file in media[1:5]:  # Cap at 5 files
        extra_bytes = await extra_file.read()
        url = await storage.upload_issue_media(
            file_bytes=extra_bytes,
            filename=extra_file.filename or "media.jpg",
            content_type=extra_file.content_type,
        )
        if url:
            media_urls.append(url)

    # Run MAS pipeline
    orchestrator = MASOrchestrator(db)
    result = await orchestrator.process_new_issue(
        media_bytes=primary_bytes,
        media_mime=primary_mime,
        lat=latitude,
        lng=longitude,
        reporter_id=current_user["id"],
        title=title,
        description=description,
        media_urls=media_urls,
        address_text=address_text,
    )

    return {
        "success": True,
        "data": result,
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/issues/nearby
# Map endpoint — PostGIS spatial query
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/nearby")
async def get_nearby_issues(
    lat: float,
    lng: float,
    radius_m: int = 1000,
    category: Optional[str] = None,
    db: Client = Depends(get_db),
):
    """Fetch open issues within radius_m of coordinates. Used by the citizen map."""
    try:
        response = db.rpc(
            "nearby_issues",
            {
                "lat": lat,
                "lng": lng,
                "radius_m": min(radius_m, 5000),  # Cap at 5km
                "cat": category,
            },
        ).execute()
        return {"success": True, "data": response.data or []}
    except Exception as e:
        logger.error(f"GET /nearby error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch nearby issues.")


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/issues/{issue_id}
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{issue_id}")
async def get_issue(issue_id: str, db: Client = Depends(get_db)):
    response = (
        db.table("issues")
        .select("*, issue_co_reporters(user_id, reported_at)")
        .eq("id", issue_id)
        .single()
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Issue not found.")
    return {"success": True, "data": response.data}


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /api/v1/issues/{issue_id}/status
# ─────────────────────────────────────────────────────────────────────────────
@router.patch("/{issue_id}/status")
async def update_issue_status(
    issue_id: str,
    new_status: Annotated[str, Form()],
    current_user: dict = Depends(require_citizen),
    db: Client = Depends(get_db),
):
    from app.agents.notification_agent import NotificationAgent
    valid_statuses = ["open", "assigned", "in_progress", "resolved", "closed"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=422, detail=f"Invalid status: {new_status}")

    db.table("issues").update({"status": new_status}).eq("id", issue_id).execute()

    notifier = NotificationAgent(db)
    await notifier.notify_status_change(issue_id, new_status)

    return {"success": True, "issue_id": issue_id, "status": new_status}


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/v1/issues/{issue_id}/proof
# Proof-of-Work upload — Resolver submits before/after media
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/{issue_id}/proof")
async def submit_proof_of_work(
    issue_id: str,
    proof_media: Annotated[
        list[UploadFile],
        File(description="After-photos/video showing completed fix"),
    ],
    current_user: dict = Depends(require_citizen),
    db: Client = Depends(get_db),
):
    """
    Resolver submits proof-of-work. The MAS Vision Agent compares before/after
    media and validates the resolution before closing the ticket.
    """
    # Fetch original issue for before-image
    issue_resp = (
        db.table("issues")
        .select("id, media_urls, status")
        .eq("id", issue_id)
        .single()
        .execute()
    )
    issue = issue_resp.data
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found.")

    if issue["status"] == "resolved":
        raise HTTPException(status_code=400, detail="Issue already resolved.")

    if not issue["media_urls"]:
        raise HTTPException(status_code=400, detail="Original issue media not found.")

    if not proof_media:
        raise HTTPException(status_code=422, detail="Proof media is required.")

    # Read before image (original issue first media)
    import httpx
    async with httpx.AsyncClient() as client:
        before_resp = await client.get(issue["media_urls"][0])
        before_bytes = before_resp.content
        before_mime = before_resp.headers.get("content-type", "image/jpeg")

    # Read after image (proof submission)
    after_file = proof_media[0]
    after_bytes = await after_file.read()
    after_mime = after_file.content_type or "image/jpeg"

    # Upload proof media
    storage = StorageService(db)
    proof_urls = []
    for pf in proof_media[:5]:
        pf_bytes = after_bytes if pf == after_file else await pf.read()
        url = await storage.upload_proof_media(
            file_bytes=pf_bytes,
            filename=pf.filename or "proof.jpg",
            issue_id=issue_id,
            content_type=pf.content_type,
        )
        if url:
            proof_urls.append(url)

    # Run proof validation pipeline
    orchestrator = MASOrchestrator(db)
    result = await orchestrator.process_proof_of_work(
        issue_id=issue_id,
        before_bytes=before_bytes,
        after_bytes=after_bytes,
        before_mime=before_mime,
        after_mime=after_mime,
        resolver_id=current_user["id"],
        proof_media_urls=proof_urls,
    )

    return {"success": True, "data": result}
