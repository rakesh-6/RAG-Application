"""Semantic search: find the chunks most similar to a question, only in the user's documents."""

from dataclasses import dataclass

from app.core.config import get_settings
from app.services import vector_store
from app.services.ai_errors import ai_call


@dataclass
class RetrievedChunk:
    document_id: int
    filename: str
    page: int | None
    chunk_index: int
    text: str
    distance: float  # smaller = more similar


def retrieve(user_id: int, query: str, k: int | None = None) -> list[RetrievedChunk]:
    store = vector_store.get_store()
    with ai_call("embedding the question"):
        # The filter is what keeps users' data separate: only chunks tagged with
        # this user's ID are searched.
        results = store.similarity_search_with_score(query, k=k or get_settings().top_k, filter={"user_id": user_id})

    return [
        RetrievedChunk(
            document_id=int(doc.metadata["document_id"]),
            filename=str(doc.metadata["filename"]),
            page=int(doc.metadata["page"]) if "page" in doc.metadata else None,
            chunk_index=int(doc.metadata.get("chunk_index", 0)),
            text=doc.page_content,
            distance=float(score),
        )
        for doc, score in results
    ]
