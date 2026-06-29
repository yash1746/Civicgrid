# ── Python 3.13 Compatibility Monkeypatch ──
import sys
import types

if "imghdr" not in sys.modules:
    imghdr = types.ModuleType("imghdr")

    def what(file, h=None):
        if isinstance(file, str):
            ext = file.split(".")[-1].lower()
            if ext in ["jpg", "jpeg"]:
                return "jpeg"
            return ext
        if h is not None:
            data = h
        elif hasattr(file, "read"):
            pos = file.tell()
            data = file.read(32)
            file.seek(pos)
        else:
            data = file[:32] if isinstance(file, (bytes, bytearray)) else b""
        if data.startswith(b"\x89PNG\r\n\x1a\n"):
            return "png"
        elif data.startswith(b"\xff\xd8"):
            return "jpeg"
        elif data.startswith(b"GIF87a") or data.startswith(b"GIF89a"):
            return "gif"
        return None

    imghdr.what = what
    sys.modules["imghdr"] = imghdr

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.config import settings
from app.api.v1.router import router
from app.database import get_supabase

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# ── APScheduler for Escalation Agent ──────────────────────────────────────
scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info(f"🚀 {settings.APP_NAME} starting up [{settings.APP_ENV}]")

    # Initialize Supabase connection check
    db = get_supabase()
    logger.info("✅ Supabase client ready")

    # Register the escalation agent as a recurring background job
    from app.agents.escalation_agent import EscalationAgent

    async def escalation_job():
        escalation = EscalationAgent(db=get_supabase())
        await escalation.check_and_escalate()

    scheduler.add_job(
        escalation_job,
        trigger="interval",
        minutes=15,
        id="escalation_agent",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("⏰ Escalation Agent scheduler started (every 15 min)")

    yield

    # Shutdown
    scheduler.shutdown(wait=False)
    logger.info(f"🛑 {settings.APP_NAME} shutting down")


# ── FastAPI App ────────────────────────────────────────────────────────────
app = FastAPI(
    title="CivicGrid API",
    description="AI-powered community issue resolution platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────
app.include_router(router)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "env": settings.APP_ENV,
    }
