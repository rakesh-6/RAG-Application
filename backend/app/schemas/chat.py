from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import UTCDateTime

MAX_QUESTION_CHARS = 2000


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=MAX_QUESTION_CHARS)
    conversation_id: int | None = None

    @field_validator("question")
    @classmethod
    def strip_question(cls, question: str) -> str:
        question = question.strip()
        if not question:
            raise ValueError("Question can't be empty")
        return question


class SourceResponse(BaseModel):
    number: int
    document_id: int
    filename: str
    page: int | None
    snippet: str


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    content: str
    sources: list[SourceResponse] = []
    found: bool | None
    standalone_question: str | None
    created_at: UTCDateTime


class AskResponse(BaseModel):
    conversation_id: int
    conversation_title: str
    user_message: MessageResponse
    assistant_message: MessageResponse


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    created_at: UTCDateTime
    updated_at: UTCDateTime
