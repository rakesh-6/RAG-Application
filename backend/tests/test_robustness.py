"""Error handling, recovery and API documentation."""

from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

from app.database.session import SessionLocal
from app.main import app
from app.models.document import Document, DocumentStatus
from app.services import ai_errors, document_service


def test_unexpected_error_returns_generic_500_without_internal_details(
    client: TestClient, register_and_login: Callable, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = register_and_login()

    def crash(db, user):
        raise RuntimeError("secret internal detail: connection string xyz")

    monkeypatch.setattr(document_service, "list_documents", crash)
    # By default TestClient re-raises server errors; turn that off to see what a real client gets.
    response = TestClient(app, raise_server_exceptions=False).get("/api/documents", headers=headers)

    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error"}
    assert "secret" not in response.text


def test_documents_stuck_in_processing_are_marked_failed_on_startup(
    client: TestClient, register_and_login: Callable
) -> None:
    headers = register_and_login()
    user_id = client.get("/api/auth/me", headers=headers).json()["id"]
    with SessionLocal() as db:  # simulate a server crash in the middle of processing
        db.add(
            Document(
                user_id=user_id,
                original_filename="Half_done.pdf",
                stored_path="missing.pdf",
                file_type="pdf",
                size_bytes=10,
                content_hash="abc",
                status=DocumentStatus.PROCESSING,
            )
        )
        db.commit()

    with TestClient(app):  # a server restart runs the startup code again
        pass

    doc = client.get("/api/documents", headers=headers).json()[0]
    assert doc["status"] == "failed"
    assert doc["error_message"] == "Processing was interrupted. Delete this file and upload it again."


@pytest.mark.parametrize(
    ("error", "expected"),
    [
        (type("E", (Exception,), {"code": 429})("quota"), True),
        (type("E", (Exception,), {"status_code": 429})("quota"), True),
        (Exception("429 RESOURCE_EXHAUSTED: You exceeded your current quota"), True),
        (Exception("Rate limit exceeded"), True),
        (Exception("400 API key not valid"), False),
        (ConnectionError("connection reset"), False),
    ],
)
def test_rate_limit_errors_are_recognised(error: Exception, expected: bool) -> None:
    assert ai_errors.is_rate_limit_error(error) is expected


def test_api_docs_list_every_endpoint_and_its_errors(client: TestClient) -> None:
    schema = client.get("/openapi.json").json()
    paths = schema["paths"]

    expected = {
        "/api/health": {"get"},
        "/api/auth/register": {"post"},
        "/api/auth/login": {"post"},
        "/api/auth/me": {"get"},
        "/api/documents": {"get", "post"},
        "/api/documents/{document_id}": {"get", "delete"},
        "/api/chat/ask": {"post"},
        "/api/conversations": {"get"},
        "/api/conversations/{conversation_id}/messages": {"get"},
        "/api/conversations/{conversation_id}": {"delete"},
    }
    assert {path: set(methods) for path, methods in paths.items()} == expected
    upload_errors = set(paths["/api/documents"]["post"]["responses"])
    assert {"400", "401", "409", "413", "503"} <= upload_errors
    assert {"401", "429", "502", "503"} <= set(paths["/api/chat/ask"]["post"]["responses"])
