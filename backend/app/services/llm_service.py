"""The one place that talks to the Gemini chat model. Tests replace `complete` with a fake."""

from functools import lru_cache

from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import get_settings
from app.services.ai_errors import ai_call, check_ai_configured


@lru_cache
def _chat_model() -> ChatGoogleGenerativeAI:
    check_ai_configured()
    settings = get_settings()
    return ChatGoogleGenerativeAI(
        model=settings.gemini_chat_model,
        google_api_key=settings.gemini_api_key,
        temperature=0.2,  # low = factual and consistent, which suits answering from documents
        max_retries=2,
    )


def complete(system_prompt: str, user_prompt: str) -> str:
    with ai_call("generating an answer"):
        response = _chat_model().invoke([("system", system_prompt), ("human", user_prompt)])
    return response.text
