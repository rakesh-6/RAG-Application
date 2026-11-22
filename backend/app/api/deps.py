"""Dependencies shared by routes. Use them as type hints, e.g. `user: CurrentUser`."""

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import UnauthorizedError
from app.core.security import decode_access_token
from app.database.session import get_db
from app.models.user import User

# auto_error=False lets us return our own JSON 401 instead of FastAPI's default.
# This also adds the "Authorize" button to Swagger UI at /docs.
bearer_scheme = HTTPBearer(auto_error=False)

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User:
    """Read the 'Authorization: Bearer <token>' header and return the logged-in user."""
    if credentials is None:
        raise UnauthorizedError("Not authenticated")

    user_id = decode_access_token(credentials.credentials)
    user = db.get(User, user_id)
    if user is None:
        raise UnauthorizedError("User no longer exists")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
