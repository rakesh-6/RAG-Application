"""Application settings, loaded from environment variables and backend/.env."""

from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    # Absolute .env path so the app finds it no matter which folder you start it from.
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    app_name: str = "RAG AI Knowledge Assistant"
    app_env: str = "development"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:5173"

    # Storage
    data_dir: Path = BACKEND_DIR / "data"
    database_url: str = ""

    # Auth
    jwt_secret_key: SecretStr = SecretStr("")
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # Uploads
    max_upload_mb: int = 10

    # Gemini and RAG
    gemini_api_key: SecretStr = SecretStr("")
    gemini_chat_model: str = "gemini-2.5-flash"
    gemini_embedding_model: str = "models/gemini-embedding-001"
    chunk_size: int = 1000
    chunk_overlap: int = 200
    top_k: int = 5

    @property
    def cors_origin_list(self) -> list[str]:
        # Browsers send the origin without a trailing "/", so "https://x.onrender.com/" would never match.
        return [origin.strip().rstrip("/") for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def sqlalchemy_url(self) -> str:
        if self.database_url:
            return self.database_url
        return f"sqlite:///{(self.data_dir / 'app.db').as_posix()}"

    @property
    def upload_dir(self) -> Path:
        return self.data_dir / "uploads"

    @property
    def chroma_dir(self) -> Path:
        return self.data_dir / "chroma_db"


@lru_cache
def get_settings() -> Settings:
    """Read settings once and reuse the same object everywhere."""
    return Settings()
