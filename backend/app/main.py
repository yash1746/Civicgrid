"""
CivicGrid — FastAPI Application Entry Point
"""
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
