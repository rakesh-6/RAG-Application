"""ChromaDB vector store with Gemini embeddings.

An embedding is a list of numbers that captures a text's meaning; texts with
similar meaning get similar numbers. We store one embedding per chunk, then find
the chunks closest to a question's embedding.
"""

import logging
from functools import lru_cache

import chromadb
from langchain_chroma import Chroma
from langchain_core.documents import Document as LCDocument
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from app.core.config import get_settings
from app.services.ai_errors import ai_call, check_ai_configured

logger = logging.getLogger(__name__)

COLLECTION_NAME = "document_chunks"
ADD_BATCH_SIZE = 64  # chunks embedded per request: fewer requests for the free-tier rate limit

__all__ = ["add_chunks", "check_ai_configured", "delete_document_vectors", "get_store"]


@lru_cache
def _embeddings() -> GoogleGenerativeAIEmbeddings:
    check_ai_configured()
    settings = get_settings()
    return GoogleGenerativeAIEmbeddings(model=settings.gemini_embedding_model, google_api_key=settings.gemini_api_key)


@lru_cache
def _chroma_client() -> chromadb.ClientAPI:
    # Embedded ChromaDB: runs inside our process and saves to disk. No separate server needed.
    return chromadb.PersistentClient(
        path=str(get_settings().chroma_dir),
        settings=chromadb.config.Settings(anonymized_telemetry=False),
    )


def get_store(with_embeddings: bool = True) -> Chroma:
    """Deleting needs no embeddings, so it works even without a Gemini key."""
    return Chroma(
        collection_name=COLLECTION_NAME,
        client=_chroma_client(),
        embedding_function=_embeddings() if with_embeddings else None,
        collection_metadata={"hnsw:space": "cosine"},  # cosine distance suits text embeddings
    )


def add_chunks(chunks: list[LCDocument]) -> None:
    store = get_store()
    # Predictable IDs ("<document_id>-<chunk_index>") make chunks easy to find and debug.
    ids = [f"{c.metadata['document_id']}-{c.metadata['chunk_index']}" for c in chunks]
    for start in range(0, len(chunks), ADD_BATCH_SIZE):
        with ai_call("embedding document chunks"):
            store.add_documents(chunks[start : start + ADD_BATCH_SIZE], ids=ids[start : start + ADD_BATCH_SIZE])


def delete_document_vectors(document_id: int) -> None:
    get_store(with_embeddings=False).delete(where={"document_id": document_id})
