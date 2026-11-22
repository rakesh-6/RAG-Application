"""Password hashing (bcrypt) and login tokens (JWT)."""

from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.core.config import get_settings
from app.core.exceptions import UnauthorizedError

MIN_SECRET_LENGTH = 32


def hash_password(password: str) -> str:
    # gensalt() adds a random salt, so two users with the same password get different hashes.
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))


# Used when the email doesn't exist, so a failed login takes the same time either way
# and attackers can't tell which emails have accounts by measuring response time.
DUMMY_PASSWORD_HASH = hash_password("not-a-real-password")


def _secret_key() -> str:
    return get_settings().jwt_secret_key.get_secret_value()


def check_jwt_secret_is_set() -> None:
    """Called at startup: refuse to run with a missing or weak signing secret."""
    if len(_secret_key()) < MIN_SECRET_LENGTH:
        raise RuntimeError(
            f"JWT_SECRET_KEY in backend/.env must be at least {MIN_SECRET_LENGTH} characters. "
            'Generate one with: py -3.12 -c "import secrets; print(secrets.token_urlsafe(48))"'
        )


def create_access_token(user_id: int, expires_delta: timedelta | None = None) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    expires_at = now + (expires_delta or timedelta(minutes=settings.jwt_expire_minutes))
    payload = {"sub": str(user_id), "iat": now, "exp": expires_at}
    return jwt.encode(payload, _secret_key(), algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> int:
    """Return the user ID inside a valid token, or raise UnauthorizedError."""
    try:
        # Passing an explicit algorithms list stops attackers choosing a weaker
        # algorithm (or "none") in the token header.
        payload = jwt.decode(token, _secret_key(), algorithms=[get_settings().jwt_algorithm])
        return int(payload["sub"])
    except jwt.ExpiredSignatureError as exc:
        raise UnauthorizedError("Token has expired, please log in again") from exc
    except (jwt.InvalidTokenError, KeyError, ValueError) as exc:
        raise UnauthorizedError("Invalid authentication token") from exc
