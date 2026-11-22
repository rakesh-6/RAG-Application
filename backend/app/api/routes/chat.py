from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.api.responses import error_responses
from app.schemas.chat import AskRequest, AskResponse, ConversationResponse, MessageResponse
from app.services import chat_service

router = APIRouter(tags=["chat"], responses=error_responses(401))


@router.post("/chat/ask", response_model=AskResponse, responses=error_responses(404, 429, 502, 503))
def ask_question(data: AskRequest, user: CurrentUser, db: DbSession) -> AskResponse:
    """Ask a question about my documents. Leave out `conversation_id` to start a new conversation."""
    return chat_service.ask(db, user, data)


@router.get("/conversations", response_model=list[ConversationResponse])
def list_conversations(user: CurrentUser, db: DbSession) -> list[ConversationResponse]:
    """My conversations, most recently used first."""
    return [ConversationResponse.model_validate(c) for c in chat_service.list_conversations(db, user)]


@router.get(
    "/conversations/{conversation_id}/messages", response_model=list[MessageResponse], responses=error_responses(404)
)
def list_messages(conversation_id: int, user: CurrentUser, db: DbSession) -> list[MessageResponse]:
    conversation = chat_service.get_conversation(db, user, conversation_id)
    return [MessageResponse.model_validate(m) for m in conversation.messages]


@router.delete(
    "/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT, responses=error_responses(404)
)
def delete_conversation(conversation_id: int, user: CurrentUser, db: DbSession) -> None:
    chat_service.delete_conversation(db, user, conversation_id)
