"""Turn errors from Gemini (via LangChain) into our own clear API errors."""

import logging
from collections.abc import Iterator
from contextlib import contextmanager

from app.core.config import get_settings
from app.core.exceptions import AIServiceBusyError, AIServiceError, AppError, ServiceUnavailableError

logger = logging.getLogger(__name__)


def check_ai_configured() -> None:
    """The app runs without a Gemini key (login still works), but AI features need one."""
    if not get_settings().gemini_api_key.get_secret_value():
        raise ServiceUnavailableError(
            "The AI service isn't set up yet: add GEMINI_API_KEY to backend/.env and restart the server."
        )


def is_rate_limit_error(exc: BaseException) -> bool:
    # Different Google client versions raise different exception classes for
    # "too many requests", so we check the status code and the message text.
    if getattr(exc, "code", None) == 429 or getattr(exc, "status_code", None) == 429:
        return True
    text = str(exc)
    return "429" in text or "RESOURCE_EXHAUSTED" in text or "rate limit" in text.lower()


@contextmanager
def ai_call(action: str) -> Iterator[None]:
    """Wrap every Gemini call: `with ai_call("embedding chunks"): ...`"""
    try:
        yield
    except AppError:
        raise
    except Exception as exc:
        if is_rate_limit_error(exc):
            logger.warning("Gemini rate limit hit while %s", action)
            raise AIServiceBusyError() from exc
        logger.exception("Gemini call failed while %s", action)
        raise AIServiceError() from exc
