from collections.abc import Callable
from datetime import timedelta

import jwt
import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password, verify_password
from tests.conftest import TEST_PASSWORD

REGISTER_URL = "/api/auth/register"
LOGIN_URL = "/api/auth/login"
ME_URL = "/api/auth/me"


# ---------- password hashing ----------

def test_password_hash_is_not_the_password_and_verifies() -> None:
    hashed = hash_password("password123")

    assert hashed != "password123"
    assert verify_password("password123", hashed)
    assert not verify_password("wrong-password1", hashed)


def test_same_password_gives_different_hashes() -> None:
    assert hash_password("password123") != hash_password("password123")


# ---------- register ----------

def test_register_creates_user_without_returning_password(client: TestClient) -> None:
    response = client.post(REGISTER_URL, json={"email": "alice@example.com", "password": TEST_PASSWORD})

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "alice@example.com"
    assert set(body) == {"id", "email", "created_at"}


def test_register_normalizes_email_to_lowercase(client: TestClient) -> None:
    response = client.post(REGISTER_URL, json={"email": "  Alice@Example.COM ", "password": TEST_PASSWORD})

    assert response.json()["email"] == "alice@example.com"


def test_register_rejects_duplicate_email(client: TestClient) -> None:
    client.post(REGISTER_URL, json={"email": "alice@example.com", "password": TEST_PASSWORD})

    response = client.post(REGISTER_URL, json={"email": "ALICE@example.com", "password": TEST_PASSWORD})

    assert response.status_code == 409
    assert response.json() == {"detail": "An account with this email already exists"}


@pytest.mark.parametrize(
    "payload",
    [
        {"email": "not-an-email", "password": TEST_PASSWORD},
        {"email": "alice@example.com", "password": "short1"},
        {"email": "alice@example.com", "password": "onlyletters"},
        {"email": "alice@example.com", "password": "12345678"},
        {"email": "alice@example.com", "password": "a1" * 40},  # longer than 72 bytes
        {"email": "alice@example.com"},
    ],
)
def test_register_rejects_invalid_input(client: TestClient, payload: dict) -> None:
    response = client.post(REGISTER_URL, json=payload)

    assert response.status_code == 422


# ---------- login ----------

def test_login_returns_token(client: TestClient) -> None:
    client.post(REGISTER_URL, json={"email": "alice@example.com", "password": TEST_PASSWORD})

    response = client.post(LOGIN_URL, json={"email": "alice@example.com", "password": TEST_PASSWORD})

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == 3600
    assert body["access_token"]


def test_login_with_wrong_password_and_unknown_email_give_same_error(client: TestClient) -> None:
    client.post(REGISTER_URL, json={"email": "alice@example.com", "password": TEST_PASSWORD})

    wrong_password = client.post(LOGIN_URL, json={"email": "alice@example.com", "password": "wrong-pass1"})
    unknown_email = client.post(LOGIN_URL, json={"email": "bob@example.com", "password": TEST_PASSWORD})

    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json() == {"detail": "Incorrect email or password"}
    assert wrong_password.headers["www-authenticate"] == "Bearer"


# ---------- protected route /me ----------

def test_me_returns_current_user(client: TestClient, register_and_login: Callable) -> None:
    headers = register_and_login("alice@example.com")

    response = client.get(ME_URL, headers=headers)

    assert response.status_code == 200
    assert response.json()["email"] == "alice@example.com"


def test_me_without_token_returns_401(client: TestClient) -> None:
    response = client.get(ME_URL)

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


def test_me_with_garbage_token_returns_401(client: TestClient) -> None:
    response = client.get(ME_URL, headers={"Authorization": "Bearer not-a-real-token"})

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid authentication token"}


def test_me_with_expired_token_returns_401(client: TestClient) -> None:
    expired = create_access_token(user_id=1, expires_delta=timedelta(minutes=-1))

    response = client.get(ME_URL, headers={"Authorization": f"Bearer {expired}"})

    assert response.status_code == 401
    assert response.json() == {"detail": "Token has expired, please log in again"}


def test_me_with_token_signed_by_another_secret_returns_401(client: TestClient) -> None:
    forged = jwt.encode({"sub": "1"}, "attacker-secret-key-that-is-long-enough-123", algorithm="HS256")

    response = client.get(ME_URL, headers={"Authorization": f"Bearer {forged}"})

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid authentication token"}


def test_me_with_token_for_deleted_user_returns_401(client: TestClient) -> None:
    token_for_missing_user = create_access_token(user_id=9999)

    response = client.get(ME_URL, headers={"Authorization": f"Bearer {token_for_missing_user}"})

    assert response.status_code == 401
    assert response.json() == {"detail": "User no longer exists"}
