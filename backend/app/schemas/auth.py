from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.schemas.common import UTCDateTime

# bcrypt only uses the first 72 bytes of a password, so we reject longer ones.
BCRYPT_MAX_BYTES = 72


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, examples=["mypassword123"])

    @field_validator("email")
    @classmethod
    def normalize_email(cls, email: str) -> str:
        return email.strip().lower()

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, password: str) -> str:
        if len(password.encode("utf-8")) > BCRYPT_MAX_BYTES:
            raise ValueError(f"Password must be at most {BCRYPT_MAX_BYTES} bytes")
        if not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password):
            raise ValueError("Password must contain at least one letter and one number")
        return password


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, email: str) -> str:
        return email.strip().lower()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Seconds until the token expires")


class UserResponse(BaseModel):
    """What the API returns about a user. Never includes the password hash."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    created_at: UTCDateTime
