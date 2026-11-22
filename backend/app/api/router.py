"""Collects every route module into one router, mounted under /api in main.py."""

from fastapi import APIRouter

from app.api.routes import auth, chat, documents, health

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(documents.router)
api_router.include_router(chat.router)
