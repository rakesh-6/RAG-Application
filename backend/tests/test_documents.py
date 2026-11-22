from collections.abc import Callable
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from langchain_chroma import Chroma

from app.core.config import get_settings
from app.core.exceptions import AIServiceBusyError
from app.services import ai_errors, vector_store
from tests.helpers import LEAVE_POLICY_TEXT, blank_pdf, simple_docx, upload

DOCS_URL = "/api/documents"


def vector_count(store: Chroma, document_id: int) -> int:
    return len(store.get(where={"document_id": document_id})["ids"])


# ---------- successful uploads ----------

def test_upload_txt_is_processed_and_stored(client: TestClient, register_and_login: Callable, fake_ai: Chroma) -> None:
    headers = register_and_login()

    response = upload(client, headers, "Leave_Policy.txt", LEAVE_POLICY_TEXT.encode())

    assert response.status_code == 201
    doc = response.json()
    assert doc["original_filename"] == "Leave_Policy.txt"
    assert doc["file_type"] == "txt"
    assert doc["status"] == "ready"
    assert doc["page_count"] is None
    assert doc["chunk_count"] > 1  # CHUNK_SIZE is 200 in tests
    assert doc["created_at"].endswith("Z")  # UTC, so browsers show the right local time
    assert vector_count(fake_ai, doc["id"]) == doc["chunk_count"]


def test_upload_docx_is_processed(client: TestClient, register_and_login: Callable) -> None:
    headers = register_and_login()

    response = upload(client, headers, "Handbook.docx", simple_docx("Employees get 18 days of annual leave."))

    assert response.status_code == 201
    assert response.json()["status"] == "ready"


def test_pdf_without_text_is_marked_failed(client: TestClient, register_and_login: Callable, fake_ai: Chroma) -> None:
    headers = register_and_login()

    response = upload(client, headers, "Scanned_Contract.pdf", blank_pdf())

    assert response.status_code == 201
    doc = response.json()
    assert doc["status"] == "failed"
    assert doc["chunk_count"] == 0
    assert "No readable text found" in doc["error_message"]
    assert vector_count(fake_ai, doc["id"]) == 0


def test_rate_limit_during_embedding_marks_document_failed(
    client: TestClient, register_and_login: Callable, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = register_and_login()

    def busy(chunks):
        raise AIServiceBusyError()

    monkeypatch.setattr(vector_store, "add_chunks", busy)

    doc = upload(client, headers, "Leave_Policy.txt", LEAVE_POLICY_TEXT.encode()).json()

    assert doc["status"] == "failed"
    assert doc["error_message"].startswith("The AI service is busy")


# ---------- validation ----------

@pytest.mark.parametrize(
    ("filename", "content", "status", "message"),
    [
        ("Slides.pptx", b"anything", 400, "Slides.pptx can't be uploaded. Use PDF, DOCX or TXT."),
        ("notes.txt", b"", 400, "notes.txt is empty."),
        ("fake.pdf", b"this is not a pdf", 400, "fake.pdf doesn't look like a valid PDF file."),
        ("fake.docx", b"plain text", 400, "fake.docx doesn't look like a valid Word (.docx) file."),
        ("latin.txt", "café".encode("latin-1"), 400, "latin.txt must be saved as UTF-8 text."),
    ],
)
def test_invalid_uploads_are_rejected(
    client: TestClient, register_and_login: Callable, filename: str, content: bytes, status: int, message: str
) -> None:
    headers = register_and_login()

    response = upload(client, headers, filename, content)

    assert response.status_code == status
    assert response.json() == {"detail": message}


def test_file_over_size_limit_is_rejected(
    client: TestClient, register_and_login: Callable, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = register_and_login()
    monkeypatch.setattr(get_settings(), "max_upload_mb", 1)

    response = upload(client, headers, "big.txt", b"a" * (1024 * 1024 + 10))

    assert response.status_code == 413
    assert response.json() == {"detail": "big.txt is 1.0 MB. The limit is 1 MB."}


def test_duplicate_upload_is_rejected(client: TestClient, register_and_login: Callable) -> None:
    headers = register_and_login()
    upload(client, headers, "Leave_Policy.txt", LEAVE_POLICY_TEXT.encode())

    response = upload(client, headers, "copy_of_policy.txt", LEAVE_POLICY_TEXT.encode())

    assert response.status_code == 409
    assert response.json() == {"detail": "Leave_Policy.txt is already in your library."}


def test_two_users_can_upload_the_same_file(client: TestClient, register_and_login: Callable) -> None:
    alice = register_and_login("alice@example.com")
    bob = register_and_login("bob@example.com")

    assert upload(client, alice, "policy.txt", LEAVE_POLICY_TEXT.encode()).status_code == 201
    assert upload(client, bob, "policy.txt", LEAVE_POLICY_TEXT.encode()).status_code == 201


def test_upload_without_gemini_key_returns_503_and_saves_nothing(
    client: TestClient, register_and_login: Callable, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = register_and_login()
    monkeypatch.setattr(vector_store, "check_ai_configured", ai_errors.check_ai_configured)  # the real check

    response = upload(client, headers, "Leave_Policy.txt", LEAVE_POLICY_TEXT.encode())

    assert response.status_code == 503
    assert "GEMINI_API_KEY" in response.json()["detail"]
    assert client.get(DOCS_URL, headers=headers).json() == []


def test_upload_requires_login(client: TestClient) -> None:
    response = upload(client, {}, "Leave_Policy.txt", LEAVE_POLICY_TEXT.encode())

    assert response.status_code == 401


# ---------- list, get, delete ----------

def test_list_shows_only_my_documents_newest_first(client: TestClient, register_and_login: Callable) -> None:
    alice = register_and_login("alice@example.com")
    bob = register_and_login("bob@example.com")
    upload(client, alice, "first.txt", b"First document about holidays.")
    upload(client, alice, "second.txt", b"Second document about laptops.")
    upload(client, bob, "bobs.txt", b"Bob's private notes.")

    names = [d["original_filename"] for d in client.get(DOCS_URL, headers=alice).json()]

    assert names == ["second.txt", "first.txt"]


def test_cannot_read_or_delete_another_users_document(client: TestClient, register_and_login: Callable) -> None:
    alice = register_and_login("alice@example.com")
    bob = register_and_login("bob@example.com")
    doc_id = upload(client, alice, "private.txt", b"Alice's private notes.").json()["id"]

    assert client.get(f"{DOCS_URL}/{doc_id}", headers=bob).status_code == 404
    assert client.delete(f"{DOCS_URL}/{doc_id}", headers=bob).status_code == 404
    assert client.get(f"{DOCS_URL}/{doc_id}", headers=alice).status_code == 200


def test_delete_removes_record_file_and_vectors(client: TestClient, register_and_login: Callable, fake_ai: Chroma) -> None:
    headers = register_and_login()
    doc = upload(client, headers, "Leave_Policy.txt", LEAVE_POLICY_TEXT.encode()).json()
    stored_files = list(Path(get_settings().upload_dir).rglob("*.txt"))
    assert len(stored_files) == 1
    assert vector_count(fake_ai, doc["id"]) > 0

    response = client.delete(f"{DOCS_URL}/{doc['id']}", headers=headers)

    assert response.status_code == 204
    assert client.get(DOCS_URL, headers=headers).json() == []
    assert not stored_files[0].exists()
    assert vector_count(fake_ai, doc["id"]) == 0


def test_stored_file_uses_generated_name(client: TestClient, register_and_login: Callable) -> None:
    headers = register_and_login()

    upload(client, headers, "../../evil.txt", b"Trying to escape the upload folder.")

    stored = list(Path(get_settings().upload_dir).rglob("*.txt"))
    assert len(stored) == 1
    assert stored[0].name != "evil.txt"
    assert Path(get_settings().upload_dir) in stored[0].parents
