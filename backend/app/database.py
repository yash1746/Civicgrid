"""
CivicGrid — Supabase Client
Single shared Supabase client (service role) for backend operations.
"""
from supabase import create_client, Client
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Service-role client (bypasses RLS for backend agents)
_supabase_client: Client | None = None


def get_supabase() -> Client:
    """Return the shared Supabase service-role client."""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY,
        )
        logger.info("Supabase client initialized.")
    return _supabase_client


# Convenience alias for dependency injection
def get_db() -> Client:
    return get_supabase()
