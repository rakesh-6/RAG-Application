"""Protections added for running on a public server (and free hosting that resets its data)."""

from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.exceptions import TooManyRequestsError
from app.core.rate_limit import LoginAttemptLimiter
from app.database.session import SessionLocal
from app.models.user import User
from tests.conftest import TEST_PASSWORD

LOGIN_URL = "/api/auth/login"


def login(client: TestClient, email: str, password: str):
    return client.post(LOGIN_URL, json={"email": email, "password": password})


# ---------- login attempt limiting ----------

def test_login_is_blocked_after_five_failed_attempts(client: TestClient, register_and_login: Callable) -> None:
    register_and_login("alice@example.com")
    for _ in range(5):
        assert login(client, "alice@example.com", "wrong-pass1").status_code == 401

    response = login(client, "alice@example.com", TEST_PASSWORD)  # even the right password is blocked now

    assert response.status_code == 429
    assert response.json() == {"detail": "Too many failed login attempts. Try again in 15 minutes."}
    assert 0 < int(response.headers["retry-after"]) <= 15 * 60


def test_successful_login_resets_the_failure_count(client: TestClient, register_and_login: Callable) -> None:
    register_and_login("alice@example.com")
    for _ in range(4):
        login(client, "alice@example.com", "wrong-pass1")
    assert login(client, "alice@example.com", TEST_PASSWORD).status_code == 200

    for _ in range(4):
        login(client, "alice@example.com", "wrong-pass1")

    assert login(client, "alice@example.com", TEST_PASSWORD).status_code == 200


def test_blocking_one_email_does_not_block_others(client: TestClient, register_and_login: Callable) -> None:
    register_and_login("alice@example.com")
    register_and_login("bob@example.com")
    for _ in range(5):
        login(client, "alice@example.com", "wrong-pass1")

    assert login(client, "bob@example.com", TEST_PASSWORD).status_code == 200


def test_failures_are_forgotten_after_the_window() -> None:
    now = [1000.0]
    limiter = LoginAttemptLimiter(max_failures=2, window_seconds=60, clock=lambda: now[0])
    limiter.record_failure("ip|alice@example.com")
    limiter.record_failure("ip|alice@example.com")
    with pytest.raises(TooManyRequestsError):
        limiter.check("ip|alice@example.com")

    now[0] += 61

    limiter.check("ip|alice@example.com")  # no error: the window has passed


# ---------- tokens survive a database reset safely ----------

def test_old_token_cannot_log_into_a_new_account_that_reuses_the_id(
    client: TestClient, register_and_login: Callable
) -> None:
    alice_headers = register_and_login("alice@example.com")
    alice_id = client.get("/api/auth/me", headers=alice_headers).json()["id"]

    with SessionLocal() as db:  # simulate free hosting wiping the database
        db.query(User).delete()
        db.commit()
    register_and_login("mallory@example.com")
    with SessionLocal() as db:
        assert db.query(User).filter_by(email="mallory@example.com").one().id == alice_id  # same ID reused

    response = client.get("/api/auth/me", headers=alice_headers)

    assert response.status_code == 401
    assert response.json() == {"detail": "User no longer exists"}


# ---------- configuration ----------

def test_cors_origins_ignore_trailing_slashes() -> None:
    settings = Settings(cors_origins="https://rag-web.onrender.com/, http://localhost:5173")

    assert settings.cors_origin_list == ["https://rag-web.onrender.com", "http://localhost:5173"]
