"""FastAPI entry point. Run with: uvicorn app.main:app --reload"""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401  (registers all tables on Base.metadata)
from app.api.router import api_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.core.security import check_jwt_secret_is_set
from app.database.base import Base
from app.database.session import SessionLocal, engine
from app.services import document_service

logger = logging.getLogger(__name__)

API_DESCRIPTION = """
Upload PDF, DOCX and TXT documents and ask questions about them. Answers come only
from your documents, with the file name and page number of every source.

**Try it here:**
1. `POST /api/auth/register` to create an account.
2. `POST /api/auth/login` and copy the `access_token`.
3. Click **Authorize** (top right) and paste the token.
4. Upload a document with `POST /api/documents`, then ask with `POST /api/chat/ask`.

Errors come back as `{"detail": "<message>"}`. Validation errors (422) use FastAPI's standard format, where `detail` is a list of problems.
"""

OPENAPI_TAGS = [
    {"name": "health", "description": "Is the API up, and can it reach the database?"},
    {"name": "auth", "description": "Register, log in (JWT access token) and read the current user."},
    {"name": "documents", "description": "Upload, list and delete documents. Uploads are processed (text → chunks → embeddings) before the response."},
    {"name": "chat", "description": "Ask questions (retrieval-augmented generation) and manage conversation history."},
]


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Runs once when the server starts (before yield) and once when it stops."""
    settings = get_settings()
    check_jwt_secret_is_set()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.chroma_dir.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        document_service.fail_interrupted_documents(db)
    logger.info("Startup complete (env=%s)", settings.app_env)
    yield
    engine.dispose()


def create_app() -> FastAPI:
    settings = get_settings()
    setup_logging(settings.log_level)

    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        description=API_DESCRIPTION,
        openapi_tags=OPENAPI_TAGS,
        lifespan=lifespan,
    )

    # Allow only our frontend's URL(s) to call the API from a browser.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(app)
    app.include_router(api_router, prefix="/api")
    return app


app = create_app()
