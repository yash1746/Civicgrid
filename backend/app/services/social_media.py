"""
CivicGrid — Social Media Service
Twitter/X (Tweepy) and Instagram (Graph API) posting for escalated issues.
"""
import logging
import asyncio
from typing import Optional
import tweepy
from app.config import settings

logger = logging.getLogger(__name__)


class SocialMediaService:
    def __init__(self):
        self._twitter_client: Optional[tweepy.Client] = None

    def _get_twitter(self) -> Optional[tweepy.Client]:
        if not settings.TWITTER_BEARER_TOKEN:
            return None
        if self._twitter_client is None:
            self._twitter_client = tweepy.Client(
                bearer_token=settings.TWITTER_BEARER_TOKEN,
                consumer_key=settings.TWITTER_API_KEY,
                consumer_secret=settings.TWITTER_API_SECRET,
                access_token=settings.TWITTER_ACCESS_TOKEN,
                access_token_secret=settings.TWITTER_ACCESS_SECRET,
                wait_on_rate_limit=True,
            )
        return self._twitter_client

    async def post_to_twitter(
        self,
        caption: str,
        media_url: Optional[str] = None,
    ) -> dict:
        """Post escalation tweet. Returns {success, post_id, error}."""
        if not settings.TWITTER_API_KEY:
            logger.warning("SocialMediaService: Twitter not configured — skipping")
            return {"success": False, "post_id": None, "error": "Twitter not configured"}

        try:
            client = self._get_twitter()
            # Truncate to Twitter's 280 char limit
            text = caption[:280]
            # Note: Media upload requires tweepy v1.1 API for media_upload
            # then pass media_ids=[media_id] to create_tweet
            response = await asyncio.to_thread(client.create_tweet, text=text)
            post_id = str(response.data["id"])
            logger.info(f"SocialMediaService: tweeted post_id={post_id}")
            return {"success": True, "post_id": post_id, "error": None}

        except Exception as e:
            logger.error(f"SocialMediaService.post_to_twitter error: {e}")
            return {"success": False, "post_id": None, "error": str(e)}

    async def post_to_instagram(
        self,
        caption: str,
        media_url: Optional[str] = None,
    ) -> dict:
        """
        Post escalation to Instagram via Graph API.
        Requires a public media_url for the image container.
        """
        if not settings.INSTAGRAM_ACCESS_TOKEN or not media_url:
            logger.warning(
                "SocialMediaService: Instagram not configured or no media_url — skipping"
            )
            return {"success": False, "post_id": None, "error": "Instagram not configured"}

        try:
            import httpx

            # Step 1: Create media container
            container_url = (
                f"https://graph.facebook.com/v19.0/"
                f"{settings.INSTAGRAM_ACCOUNT_ID}/media"
            )
            async with httpx.AsyncClient() as client:
                container_resp = await client.post(container_url, params={
                    "image_url": media_url,
                    "caption": caption[:2200],
                    "access_token": settings.INSTAGRAM_ACCESS_TOKEN,
                })
                container_resp.raise_for_status()
                container_id = container_resp.json()["id"]

                # Step 2: Publish container
                publish_url = (
                    f"https://graph.facebook.com/v19.0/"
                    f"{settings.INSTAGRAM_ACCOUNT_ID}/media_publish"
                )
                publish_resp = await client.post(publish_url, params={
                    "creation_id": container_id,
                    "access_token": settings.INSTAGRAM_ACCESS_TOKEN,
                })
                publish_resp.raise_for_status()
                post_id = publish_resp.json()["id"]

            logger.info(f"SocialMediaService: posted to Instagram post_id={post_id}")
            return {"success": True, "post_id": post_id, "error": None}

        except Exception as e:
            logger.error(f"SocialMediaService.post_to_instagram error: {e}")
            return {"success": False, "post_id": None, "error": str(e)}
