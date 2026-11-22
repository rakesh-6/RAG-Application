from collections.abc import Callable

from fastapi.testclient import TestClient

from tests.conftest import FakeLLM
from tests.helpers import LEAVE_POLICY_TEXT, upload

ASK_URL = "/api/chat/ask"
CONVERSATIONS_URL = "/api/conversations"
QUESTION = "How many days of annual leave do new employees get?"


def ask(client: TestClient, headers: dict, question: str = QUESTION, conversation_id: int | None = None):
    return client.post(ASK_URL, json={"question": question, "conversation_id": conversation_id}, headers=headers)


def test_answer_includes_sources(client: TestClient, register_and_login: Callable, fake_llm: FakeLLM) -> None:
    headers = register_and_login()
    upload(client, headers, "Leave_Policy.txt", LEAVE_POLICY_TEXT.encode())

    response = ask(client, headers)

    assert response.status_code == 200
    body = response.json()
    answer = body["assistant_message"]
    assert answer["role"] == "assistant"
    assert answer["found"] is True
    assert answer["content"] == FakeLLM.DEFAULT_ANSWER
    assert answer["standalone_question"] is None  # first question: nothing to rewrite
    assert answer["sources"][0]["number"] == 1
    assert answer["sources"][0]["filename"] == "Leave_Policy.txt"
    assert answer["sources"][0]["page"] is None  # TXT files have no pages
    assert answer["sources"][0]["snippet"]
    assert body["user_message"]["content"] == QUESTION
    assert body["conversation_title"] == QUESTION
    # The grounding rules and the retrieved text were sent to the model.
    system_prompt, user_prompt = fake_llm.calls[-1]
    assert "ONLY the numbered context" in system_prompt
    assert "[1] (from Leave_Policy.txt, no page numbers)" in user_prompt


def test_no_documents_means_not_found_without_calling_the_model(
    client: TestClient, register_and_login: Callable, fake_llm: FakeLLM
) -> None:
    headers = register_and_login()

    answer = ask(client, headers).json()["assistant_message"]

    assert answer["found"] is False
    assert answer["content"] == "I couldn't find this in your documents."
    assert answer["sources"] == []
    assert fake_llm.calls == []


def test_model_saying_not_found_is_returned_as_not_found(
    client: TestClient, register_and_login: Callable, fake_llm: FakeLLM
) -> None:
    headers = register_and_login()
    upload(client, headers, "Leave_Policy.txt", LEAVE_POLICY_TEXT.encode())
    fake_llm.answer = "NOT_FOUND"

    answer = ask(client, headers, "What was the company's revenue last year?").json()["assistant_message"]

    assert answer["found"] is False
    assert answer["sources"] == []


def test_follow_up_question_is_rewritten_using_history(
    client: TestClient, register_and_login: Callable, fake_llm: FakeLLM
) -> None:
    headers = register_and_login()
    upload(client, headers, "Leave_Policy.txt", LEAVE_POLICY_TEXT.encode())
    conversation_id = ask(client, headers).json()["conversation_id"]

    body = ask(client, headers, "Can I use it during probation?", conversation_id).json()

    assert body["conversation_id"] == conversation_id
    assert body["assistant_message"]["standalone_question"] == FakeLLM.DEFAULT_REWRITE
    rewrite_prompt = fake_llm.calls[-2][1]
    assert QUESTION in rewrite_prompt  # the history was included
    messages = client.get(f"{CONVERSATIONS_URL}/{conversation_id}/messages", headers=headers).json()
    assert [m["role"] for m in messages] == ["user", "assistant", "user", "assistant"]


def test_users_only_search_their_own_documents(
    client: TestClient, register_and_login: Callable, fake_llm: FakeLLM
) -> None:
    alice = register_and_login("alice@example.com")
    bob = register_and_login("bob@example.com")
    upload(client, alice, "Leave_Policy.txt", LEAVE_POLICY_TEXT.encode())

    answer = ask(client, bob).json()["assistant_message"]

    assert answer["found"] is False  # Bob has no documents, so Alice's chunks were never retrieved
    assert fake_llm.calls == []


def test_only_cited_sources_are_returned(client: TestClient, register_and_login: Callable, fake_llm: FakeLLM) -> None:
    headers = register_and_login()
    upload(client, headers, "Leave_Policy.txt", LEAVE_POLICY_TEXT.encode())  # several chunks (CHUNK_SIZE=200)
    fake_llm.answer = "Unused days lapse on 31 December [2]."

    answer = ask(client, headers).json()["assistant_message"]

    assert [s["number"] for s in answer["sources"]] == [2]  # passages the answer didn't use are left out


def test_old_answers_keep_their_sources_after_the_document_is_deleted(
    client: TestClient, register_and_login: Callable
) -> None:
    headers = register_and_login()
    doc_id = upload(client, headers, "Leave_Policy.txt", LEAVE_POLICY_TEXT.encode()).json()["id"]
    conversation_id = ask(client, headers).json()["conversation_id"]

    client.delete(f"/api/documents/{doc_id}", headers=headers)

    messages = client.get(f"{CONVERSATIONS_URL}/{conversation_id}/messages", headers=headers).json()
    assert messages[1]["sources"][0]["filename"] == "Leave_Policy.txt"
    new_answer = ask(client, headers).json()["assistant_message"]
    assert new_answer["found"] is False  # but new questions can't use the deleted document


def test_conversations_list_messages_and_delete(client: TestClient, register_and_login: Callable) -> None:
    headers = register_and_login()
    upload(client, headers, "Leave_Policy.txt", LEAVE_POLICY_TEXT.encode())
    first = ask(client, headers, "First question?").json()["conversation_id"]
    second = ask(client, headers, "Second question?").json()["conversation_id"]

    conversations = client.get(CONVERSATIONS_URL, headers=headers).json()
    assert [c["id"] for c in conversations] == [second, first]  # most recent first

    messages = client.get(f"{CONVERSATIONS_URL}/{first}/messages", headers=headers).json()
    assert messages[1]["sources"][0]["filename"] == "Leave_Policy.txt"

    assert client.delete(f"{CONVERSATIONS_URL}/{first}", headers=headers).status_code == 204
    assert client.get(f"{CONVERSATIONS_URL}/{first}/messages", headers=headers).status_code == 404
    assert [c["id"] for c in client.get(CONVERSATIONS_URL, headers=headers).json()] == [second]


def test_cannot_use_another_users_conversation(client: TestClient, register_and_login: Callable) -> None:
    alice = register_and_login("alice@example.com")
    bob = register_and_login("bob@example.com")
    conversation_id = ask(client, alice).json()["conversation_id"]

    assert client.get(f"{CONVERSATIONS_URL}/{conversation_id}/messages", headers=bob).status_code == 404
    assert ask(client, bob, "Hi?", conversation_id).status_code == 404
    assert client.delete(f"{CONVERSATIONS_URL}/{conversation_id}", headers=bob).status_code == 404


def test_rate_limit_returns_429_and_saves_nothing(
    client: TestClient, register_and_login: Callable, fake_llm: FakeLLM
) -> None:
    headers = register_and_login()
    upload(client, headers, "Leave_Policy.txt", LEAVE_POLICY_TEXT.encode())
    fake_llm.error = Exception("429 RESOURCE_EXHAUSTED: quota exceeded")

    response = ask(client, headers)

    assert response.status_code == 429
    assert response.json() == {"detail": "The AI service is busy right now. Try again in a minute."}
    assert client.get(CONVERSATIONS_URL, headers=headers).json() == []


def test_other_model_errors_return_502(client: TestClient, register_and_login: Callable, fake_llm: FakeLLM) -> None:
    headers = register_and_login()
    upload(client, headers, "Leave_Policy.txt", LEAVE_POLICY_TEXT.encode())
    fake_llm.error = Exception("connection reset")

    response = ask(client, headers)

    assert response.status_code == 502
    assert response.json() == {"detail": "The AI service failed to respond. Please try again."}


def test_blank_question_is_rejected(client: TestClient, register_and_login: Callable) -> None:
    headers = register_and_login()

    assert ask(client, headers, "   ").status_code == 422


def test_ask_requires_login(client: TestClient) -> None:
    assert ask(client, {}).status_code == 401
