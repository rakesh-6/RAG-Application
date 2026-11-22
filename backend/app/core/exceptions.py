"""Application errors and the handlers that turn them into JSON responses.

Services raise these errors; routes don't need try/except. Every error the API
returns has the same shape: {"detail": "<message>"}.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Base class for expected errors. Subclasses set their HTTP status code."""

    status_code: int = 400

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class BadRequestError(AppError):
    status_code = 400


class UnauthorizedError(AppError):
    """Missing, invalid or expired login token, or wrong email/password."""

    status_code = 401


class NotFoundError(AppError):
    status_code = 404


class ConflictError(AppError):
    status_code = 409


class PayloadTooLargeError(AppError):
    status_code = 413


class AIServiceBusyError(AppError):
    """Gemini returned 'too many requests' (free-tier rate limit)."""

    status_code = 429

    def __init__(self, message: str = "The AI service is busy right now. Try again in a minute.") -> None:
        super().__init__(message)


class AIServiceError(AppError):
    """Gemini failed for another reason (bad key, network, server error)."""

    status_code = 502

    def __init__(self, message: str = "The AI service failed to respond. Please try again.") -> None:
        super().__init__(message)


class ServiceUnavailableError(AppError):
    status_code = 503


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    # The HTTP standard says a 401 should tell the client which login scheme to use.
    headers = {"WWW-Authenticate": "Bearer"} if exc.status_code == 401 else None
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message}, headers=headers)


async def unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
    # Log the full traceback for us, but never send internal details to the client.
    logger.exception("Unexpected error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(Exception, unexpected_error_handler)
