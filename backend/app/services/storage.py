"""
CivicGrid — Supabase Storage Service
Handles media uploads to Supabase Storage buckets.
"""
import logging
import mimetypes
import uuid
from typing import Optional
from supabase import Client
from app.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    def __init__(self, db: Client):
        self.db = db

    async def upload_issue_media(
        self,
        file_bytes: bytes,
        filename: str,
        issue_id: Optional[str] = None,
        content_type: Optional[str] = None,
    ) -> Optional[str]:
        """Upload issue photo/video to Supabase Storage. Returns public URL."""
        return await self._upload(
            bucket=settings.ISSUE_MEDIA_BUCKET,
            file_bytes=file_bytes,
            filename=filename,
            folder=issue_id or "pending",
            content_type=content_type,
        )

    async def upload_proof_media(
        self,
        file_bytes: bytes,
        filename: str,
        issue_id: str,
        content_type: Optional[str] = None,
    ) -> Optional[str]:
        """Upload proof-of-work photo/video to Supabase Storage. Returns public URL."""
        return await self._upload(
            bucket=settings.PROOF_MEDIA_BUCKET,
            file_bytes=file_bytes,
            filename=filename,
            folder=issue_id,
            content_type=content_type,
        )

    async def _upload(
        self,
        bucket: str,
        file_bytes: bytes,
        filename: str,
        folder: str,
        content_type: Optional[str] = None,
    ) -> Optional[str]:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
        unique_name = f"{folder}/{uuid.uuid4().hex}.{ext}"
        ct = content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"

        try:
            response = self.db.storage.from_(bucket).upload(
                path=unique_name,
                file=file_bytes,
                file_options={"content-type": ct},
            )
            # Build public URL
            public_url = (
                f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{unique_name}"
            )
            logger.info(f"StorageService: uploaded {unique_name} to bucket '{bucket}'")
            return public_url

        except Exception as e:
            logger.error(f"StorageService._upload error: {e}", exc_info=True)
            return None
