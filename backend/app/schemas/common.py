from datetime import UTC, datetime
from typing import Annotated

from pydantic import AfterValidator


def _ensure_utc(value: datetime) -> datetime:
    # SQLite forgets the timezone, but we always store UTC, so we add it back.
    # The JSON then ends in "Z" (UTC) and browsers convert it to local time correctly.
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


UTCDateTime = Annotated[datetime, AfterValidator(_ensure_utc)]
