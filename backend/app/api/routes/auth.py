from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.core.config import get_settings
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: DbSession) -> UserResponse:
    """Create a new account."""
    user = auth_service.register_user(db, data)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: DbSession) -> TokenResponse:
    """Log in and get an access token. Send it as 'Authorization: Bearer <token>'."""
    token = auth_service.login(db, data)
    return TokenResponse(access_token=token, expires_in=get_settings().jwt_expire_minutes * 60)


@router.get("/me", response_model=UserResponse)
def read_current_user(user: CurrentUser) -> UserResponse:
    """Return the logged-in user. Requires a valid token."""
    return UserResponse.model_validate(user)
