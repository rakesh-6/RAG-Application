import logging

from fastapi import APIRouter
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.deps import DbSession
from app.core.config import get_settings
from app.core.exceptions import ServiceUnavailableError
from app.schemas.health import HealthResponse

logger = logging.getLogger(__name__)
router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health_check(db: DbSession) -> HealthResponse:
    """Confirm the API is running and can reach the database."""
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        logger.error("Health check failed: database not reachable (%s)", exc)
        raise ServiceUnavailableError("Database is not reachable") from exc

    return HealthResponse(status="ok", database="ok", environment=get_settings().app_env)
