from datetime import UTC, datetime

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Parent class for every SQLAlchemy model (table) in app/models."""


def utc_now() -> datetime:
    """Default value for created_at/updated_at columns (always UTC)."""
    return datetime.now(UTC)
