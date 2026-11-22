"""Error responses for the Swagger docs, so /docs shows every status code a route can return."""

from typing import Any

from app.schemas.common import ErrorResponse

_DESCRIPTIONS = {
    400: "Invalid input (for example, an unsupported file type)",
    401: "Not logged in, or the token is invalid or expired",
    404: "Not found, or it belongs to another user",
    409: "Already exists",
    413: "File is larger than the upload limit",
    429: "Gemini free-tier rate limit reached: try again in a minute",
    502: "Gemini failed to respond",
    503: "Database unreachable, or GEMINI_API_KEY is not configured",
}


def error_responses(*status_codes: int) -> dict[int | str, dict[str, Any]]:
    return {code: {"model": ErrorResponse, "description": _DESCRIPTIONS[code]} for code in status_codes}
