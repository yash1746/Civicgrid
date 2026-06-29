"""
CivicGrid — Application Configuration
Uses Pydantic BaseSettings to load environment variables.
"""
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, field_validator
from typing import List
import json


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────
    APP_NAME: str = "CivicGrid"
    APP_ENV: str = "development"
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # ── Supabase ──────────────────────────────────
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # ── Google Gemini ─────────────────────────────
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-1.5-pro"

    # ── Storage Buckets ───────────────────────────
    ISSUE_MEDIA_BUCKET: str = "issue-media"
    PROOF_MEDIA_BUCKET: str = "proof-media"

    # ── Email ─────────────────────────────────────
    SENDGRID_API_KEY: str = ""
    EMAIL_FROM: str = "noreply@civicgrid.io"
    EMAIL_FROM_NAME: str = "CivicGrid Alerts"

    # ── Twitter/X ─────────────────────────────────
    TWITTER_API_KEY: str = ""
    TWITTER_API_SECRET: str = ""
    TWITTER_ACCESS_TOKEN: str = ""
    TWITTER_ACCESS_SECRET: str = ""
    TWITTER_BEARER_TOKEN: str = ""

    # ── Instagram ─────────────────────────────────
    INSTAGRAM_ACCESS_TOKEN: str = ""
    INSTAGRAM_ACCOUNT_ID: str = ""

    # ── SLA (hours) ───────────────────────────────
    SLA_HOURS_LOW: int = 72
    SLA_HOURS_MEDIUM: int = 48
    SLA_HOURS_HIGH: int = 24
    SLA_HOURS_CRITICAL: int = 4

    # ── CORS ──────────────────────────────────────
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:5174",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v

    # ── SLA Helper ────────────────────────────────
    def sla_hours_for_severity(self, severity_score: int) -> int:
        if severity_score >= 9:
            return self.SLA_HOURS_CRITICAL
        elif severity_score >= 7:
            return self.SLA_HOURS_HIGH
        elif severity_score >= 4:
            return self.SLA_HOURS_MEDIUM
        return self.SLA_HOURS_LOW

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
