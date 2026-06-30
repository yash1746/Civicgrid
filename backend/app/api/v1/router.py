"""
CivicGrid — API v1 Router
"""
from fastapi import APIRouter
from app.api.v1.endpoints import issues, users, resolver, chatbot

router = APIRouter(prefix="/api/v1")
router.include_router(issues.router)
router.include_router(users.router)
router.include_router(resolver.router)
router.include_router(chatbot.router)
