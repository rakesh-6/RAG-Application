"""Shared test setup.

Tests use a temporary data folder (and so a temporary SQLite file), never your
real backend/data. Environment variables win over .env, so we set them here
before the app is imported. Gemini is always replaced by fakes: tests never
call the real API (free, fast, and they work offline).
"""

import os
import shutil
import tempfile
from collections.abc import Callable, Iterator
from pathlib import Path
from uuid import uuid4

TEST_DATA_DIR = Path(tempfile.mkdtemp(prefix="rag-tests-"))
os.environ["DATA_DIR"] = str(TEST_DATA_DIR)
os.environ["DATABASE_URL"] = ""
os.environ["APP_ENV"] = "test"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"
os.environ["JWT_SECRET_KEY"] = "test-only-secret-key-that-is-long-enough-123456"
os.environ["JWT_EXPIRE_MINUTES"] = "60"
os.environ["GEMINI_API_KEY"] = ""  # even if your .env has a real key, tests never use it
os.environ["CHUNK_SIZE"] = "200"
os.environ["CHUNK_OVERLAP"] = "20"
os.environ["MAX_UPLOAD_MB"] = "10"

import chromadb  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from langchain_chroma import Chroma  # noqa: E402
from langchain_core.embeddings import DeterministicFakeEmbedding  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.core.rate_limit import login_limiter  # noqa: E402
from app.database.base import Base  # noqa: E402
from app.database.session import engine  # noqa: E402
from app.main import app  # noqa: E402
from app.services import llm_service, vector_store  # noqa: E402
from app.services.ai_errors import ai_call  # noqa: E402

TEST_PASSWORD = "password123"


class FakeLLM:
    """Stands in for Gemini. Records every call; tests can set `answer` or `error`."""

    DEFAULT_ANSWER = "New full-time employees get 18 days of paid annual leave per year [1]."
    DEFAULT_REWRITE = "Can new employees use annual leave during probation?"

    def __init__(self) -> None:
        self.calls: list[tuple[str, str]] = []
        self.answer: str | None = None
        self.error: Exception | None = None

    def complete(self, system_prompt: str, user_prompt: str) -> str:
        self.calls.append((system_prompt, user_prompt))
        if self.error is not None:
            with ai_call("test"):  # same error translation as the real llm_service.complete
                raise self.error
        if "Standalone question:" in user_prompt:
            return self.DEFAULT_REWRITE
        return self.answer if self.answer is not None else self.DEFAULT_ANSWER


@pytest.fixture(autouse=True)
def fake_ai(monkeypatch: pytest.MonkeyPatch) -> Chroma:
    """Every test gets an in-memory Chroma collection with fake (but deterministic) embeddings."""
    store = Chroma(
        collection_name=f"test-{uuid4().hex}",
        client=chromadb.EphemeralClient(settings=chromadb.config.Settings(anonymized_telemetry=False)),
        embedding_function=DeterministicFakeEmbedding(size=64),
        collection_metadata={"hnsw:space": "cosine"},
    )
    monkeypatch.setattr(vector_store, "get_store", lambda with_embeddings=True: store)
    monkeypatch.setattr(vector_store, "check_ai_configured", lambda: None)
    return store


@pytest.fixture(autouse=True)
def fake_llm(monkeypatch: pytest.MonkeyPatch) -> FakeLLM:
    llm = FakeLLM()
    monkeypatch.setattr(llm_service, "complete", llm.complete)
    return llm


@pytest.fixture
def client() -> Iterator[TestClient]:
    # "with" runs the app's startup/shutdown (creates folders and tables).
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    # Empty every table so each test starts with a clean database.
    with engine.begin() as connection:
        for table in reversed(Base.metadata.sorted_tables):
            connection.execute(table.delete())
    shutil.rmtree(get_settings().upload_dir, ignore_errors=True)  # and remove uploaded files
    login_limiter.clear()  # failed logins from one test must not block the next


@pytest.fixture
def register_and_login(client: TestClient) -> Callable[[str], dict[str, str]]:
    """Create a user and return the headers needed to call protected routes as them."""

    def _register_and_login(email: str = "alice@example.com") -> dict[str, str]:
        client.post("/api/auth/register", json={"email": email, "password": TEST_PASSWORD})
        response = client.post("/api/auth/login", json={"email": email, "password": TEST_PASSWORD})
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    return _register_and_login


@pytest.fixture(scope="session", autouse=True)
def remove_test_data_dir() -> Iterator[None]:
    yield
    engine.dispose()  # release the SQLite file so Windows lets us delete it
    shutil.rmtree(TEST_DATA_DIR, ignore_errors=True)
