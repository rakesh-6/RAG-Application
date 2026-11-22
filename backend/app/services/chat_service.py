"""Question answering (the "G" in RAG) and conversation history."""

import logging
import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.database.base import utc_now
from app.models.conversation import Conversation, Message, MessageRole
from app.models.user import User
from app.schemas.chat import AskRequest, AskResponse, MessageResponse
from app.services import llm_service, retrieval_service
from app.services.retrieval_service import RetrievedChunk

logger = logging.getLogger(__name__)

NOT_FOUND_MARKER = "NOT_FOUND"
NOT_FOUND_ANSWER = "I couldn't find this in your documents."
HISTORY_MESSAGES = 6  # how many earlier messages are used to understand follow-ups
SNIPPET_CHARS = 300

REWRITE_SYSTEM_PROMPT = """You rewrite follow-up questions so they can be understood without the chat history.
Use the conversation to replace words like "it", "they" or "that" with what they refer to.
If the question is already clear on its own, return it unchanged.
Return only the rewritten question, nothing else."""

ANSWER_SYSTEM_PROMPT = f"""You are a helpful assistant that answers questions using ONLY the numbered context passages from the user's documents.

Rules:
1. Use only facts stated in the context. Never use outside knowledge and never guess.
2. After each fact, cite the passage it came from with its number in square brackets, like [1] or [2].
3. If the context does not contain enough information to answer, reply with exactly {NOT_FOUND_MARKER} and nothing else.
4. Answer in clear, plain sentences. Do not use Markdown formatting.
5. Keep the answer short: at most a few sentences or a short list."""


# ---------- conversations ----------

def list_conversations(db: Session, user: User) -> list[Conversation]:
    query = select(Conversation).where(Conversation.user_id == user.id).order_by(Conversation.updated_at.desc())
    return list(db.scalars(query))


def get_conversation(db: Session, user: User, conversation_id: int) -> Conversation:
    conversation = db.scalars(
        select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == user.id)
    ).first()
    if conversation is None:
        raise NotFoundError("Conversation not found.")
    return conversation


def delete_conversation(db: Session, user: User, conversation_id: int) -> None:
    db.delete(get_conversation(db, user, conversation_id))  # messages are deleted by the cascade
    db.commit()


def _make_title(question: str) -> str:
    return question if len(question) <= 60 else question[:57].rstrip() + "..."


# ---------- question answering ----------

def _rewrite_as_standalone(question: str, history: list[Message]) -> str:
    if not history:
        return question
    transcript = "\n".join(f"{m.role.capitalize()}: {m.content}" for m in history)
    rewritten = llm_service.complete(
        REWRITE_SYSTEM_PROMPT,
        f"Conversation:\n{transcript}\n\nFollow-up question: {question}\n\nStandalone question:",
    ).strip()
    return rewritten or question


def _build_context(chunks: list[RetrievedChunk]) -> str:
    parts = []
    for number, chunk in enumerate(chunks, start=1):
        location = f"page {chunk.page}" if chunk.page is not None else "no page numbers"
        parts.append(f"[{number}] (from {chunk.filename}, {location})\n{chunk.text}")
    return "\n\n".join(parts)


def _cited_sources(answer: str, chunks: list[RetrievedChunk]) -> list[dict]:
    cited = {int(n) for n in re.findall(r"\[(\d+)\]", answer)}
    numbers = sorted(n for n in cited if 1 <= n <= len(chunks)) or list(range(1, len(chunks) + 1))
    sources = []
    for number in numbers:
        chunk = chunks[number - 1]
        snippet = chunk.text if len(chunk.text) <= SNIPPET_CHARS else chunk.text[:SNIPPET_CHARS].rstrip() + "…"
        sources.append(
            {"number": number, "document_id": chunk.document_id, "filename": chunk.filename, "page": chunk.page, "snippet": snippet}
        )
    return sources


def _generate_answer(question: str, chunks: list[RetrievedChunk]) -> tuple[str, bool, list[dict]]:
    """Return (answer, found, sources)."""
    if not chunks:  # nothing to search: don't even ask the model
        return NOT_FOUND_ANSWER, False, []

    raw = llm_service.complete(ANSWER_SYSTEM_PROMPT, f"Context:\n{_build_context(chunks)}\n\nQuestion: {question}").strip()
    if not raw or raw.startswith(NOT_FOUND_MARKER):
        return NOT_FOUND_ANSWER, False, []
    return raw, True, _cited_sources(raw, chunks)


def ask(db: Session, user: User, data: AskRequest) -> AskResponse:
    if data.conversation_id is not None:
        conversation = get_conversation(db, user, data.conversation_id)
        history = conversation.messages[-HISTORY_MESSAGES:]
    else:
        conversation = Conversation(user_id=user.id, title=_make_title(data.question))
        history = []

    # Gemini is called before anything is saved, so a failed call leaves no half-saved chat.
    standalone_question = _rewrite_as_standalone(data.question, history)
    chunks = retrieval_service.retrieve(user.id, standalone_question)
    answer, found, sources = _generate_answer(standalone_question, chunks)

    user_message = Message(role=MessageRole.USER, content=data.question, sources=[])
    assistant_message = Message(
        role=MessageRole.ASSISTANT,
        content=answer,
        sources=sources,
        found=found,
        standalone_question=standalone_question if standalone_question != data.question else None,
    )
    conversation.messages.extend([user_message, assistant_message])
    conversation.updated_at = utc_now()
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    logger.info("Answered question in conversation %s (found=%s, sources=%s)", conversation.id, found, len(sources))

    return AskResponse(
        conversation_id=conversation.id,
        conversation_title=conversation.title,
        user_message=MessageResponse.model_validate(user_message),
        assistant_message=MessageResponse.model_validate(assistant_message),
    )
