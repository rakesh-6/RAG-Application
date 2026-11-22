"""Business logic for accounts: registering and logging in."""

import logging

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import DUMMY_PASSWORD_HASH, create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest

logger = logging.getLogger(__name__)

EMAIL_TAKEN_MESSAGE = "An account with this email already exists"
BAD_LOGIN_MESSAGE = "Incorrect email or password"


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalars(select(User).where(User.email == email)).first()


def register_user(db: Session, data: RegisterRequest) -> User:
    if get_user_by_email(db, data.email) is not None:
        raise ConflictError(EMAIL_TAKEN_MESSAGE)

    user = User(email=data.email, hashed_password=hash_password(data.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        # Two sign-ups with the same email at the same moment can both pass the check
        # above; the database's unique constraint catches the second one here.
        db.rollback()
        raise ConflictError(EMAIL_TAKEN_MESSAGE) from exc

    db.refresh(user)
    logger.info("New user registered (id=%s)", user.id)
    return user


def authenticate_user(db: Session, data: LoginRequest) -> User:
    user = get_user_by_email(db, data.email)
    if user is None:
        verify_password(data.password, DUMMY_PASSWORD_HASH)  # same timing as a real check
        raise UnauthorizedError(BAD_LOGIN_MESSAGE)
    if not verify_password(data.password, user.hashed_password):
        raise UnauthorizedError(BAD_LOGIN_MESSAGE)
    return user


def login(db: Session, data: LoginRequest) -> str:
    """Check the credentials and return a new access token."""
    user = authenticate_user(db, data)
    logger.info("User logged in (id=%s)", user.id)
    return create_access_token(user.id, user.email)
