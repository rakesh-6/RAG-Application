from fastapi import APIRouter, Request, status

from app.api.deps import CurrentUser, DbSession
from app.api.responses import error_responses
from app.core.config import get_settings
from app.core.exceptions import UnauthorizedError
from app.core.rate_limit import login_limiter
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, responses=error_responses(409)
)
def register(data: RegisterRequest, db: DbSession) -> UserResponse:
    """Create a new account."""
    user = auth_service.register_user(db, data)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse, responses=error_responses(401, 429))
def login(data: LoginRequest, db: DbSession, request: Request) -> TokenResponse:
    """Log in and get an access token. Send it as 'Authorization: Bearer <token>'.

    After 5 failed attempts for the same email from the same IP address, login is
    blocked for 15 minutes (429), which makes guessing passwords impractical.
    """
    # Counting per IP *and* email means an attacker can't lock a real user out from
    # everywhere just by typing wrong passwords for their email.
    client_ip = request.client.host if request.client else "unknown"
    limiter_key = f"{client_ip}|{data.email}"
    login_limiter.check(limiter_key)
    try:
        token = auth_service.login(db, data)
    except UnauthorizedError:
        login_limiter.record_failure(limiter_key)
        raise
    login_limiter.reset(limiter_key)
    return TokenResponse(access_token=token, expires_in=get_settings().jwt_expire_minutes * 60)


@router.get("/me", response_model=UserResponse, responses=error_responses(401))
def read_current_user(user: CurrentUser) -> UserResponse:
    """Return the logged-in user. Requires a valid token."""
    return UserResponse.model_validate(user)
