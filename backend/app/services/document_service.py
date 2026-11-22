"""Business logic for documents: validate, store, process, list and delete."""

import hashlib
import logging
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import AppError, BadRequestError, ConflictError, NotFoundError, PayloadTooLargeError
from app.models.document import Document, DocumentStatus
from app.models.user import User
from app.services import ingestion_service, vector_store

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf": "pdf", ".docx": "docx", ".txt": "txt"}


def _check_file_type(filename: str) -> str:
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise BadRequestError(f"{filename} can't be uploaded. Use PDF, DOCX or TXT.")
    return ALLOWED_EXTENSIONS[extension]


def _check_content_matches_type(filename: str, file_type: str, content: bytes) -> None:
    # The extension is just part of the name, so we also check the first bytes
    # ("magic numbers") to make sure the content really is that kind of file.
    if file_type == "pdf" and not content.startswith(b"%PDF"):
        raise BadRequestError(f"{filename} doesn't look like a valid PDF file.")
    if file_type == "docx" and not content.startswith(b"PK"):
        raise BadRequestError(f"{filename} doesn't look like a valid Word (.docx) file.")
    if file_type == "txt":
        try:
            content.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise BadRequestError(f"{filename} must be saved as UTF-8 text.") from exc


def _save_file(user_id: int, file_type: str, content: bytes) -> Path:
    # A generated name, never the user's: user-supplied names can contain "../"
    # tricks or clash with other files.
    user_dir = get_settings().upload_dir / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    path = user_dir / f"{uuid4().hex}.{file_type}"
    path.write_bytes(content)
    return path


def upload_document(db: Session, user: User, filename: str | None, content: bytes, total_size: int) -> Document:
    """Validate and store an upload, then process it. `content` may be cut off at limit + 1 byte."""
    name = Path(filename or "").name.strip()
    if not name:
        raise BadRequestError("The uploaded file has no name.")

    file_type = _check_file_type(name)
    max_mb = get_settings().max_upload_mb
    if total_size > max_mb * 1024 * 1024:
        raise PayloadTooLargeError(f"{name} is {total_size / (1024 * 1024):.1f} MB. The limit is {max_mb} MB.")
    if not content:
        raise BadRequestError(f"{name} is empty.")
    _check_content_matches_type(name, file_type, content)

    content_hash = hashlib.sha256(content).hexdigest()
    existing = db.scalars(
        select(Document).where(Document.user_id == user.id, Document.content_hash == content_hash)
    ).first()
    if existing is not None:
        raise ConflictError(f"{existing.original_filename} is already in your library.")

    vector_store.check_ai_configured()  # fail before saving anything if Gemini isn't set up

    path = _save_file(user.id, file_type, content)
    document = Document(
        user_id=user.id,
        original_filename=name,
        stored_path=str(path),
        file_type=file_type,
        size_bytes=len(content),
        content_hash=content_hash,
        status=DocumentStatus.PROCESSING,
    )
    db.add(document)
    try:
        db.commit()
    except IntegrityError as exc:  # the same file uploaded twice at the same moment
        db.rollback()
        path.unlink(missing_ok=True)
        raise ConflictError(f"{name} is already in your library.") from exc
    db.refresh(document)

    _process_document(db, document, path)
    return document


def _process_document(db: Session, document: Document, path: Path) -> None:
    """Extract → chunk → embed → store. Never raises: failures are saved on the document."""
    try:
        result = ingestion_service.ingest_file(
            path,
            file_type=document.file_type,
            document_id=document.id,
            user_id=document.user_id,
            filename=document.original_filename,
        )
        vector_store.add_chunks(result.chunks)
        document.status = DocumentStatus.READY
        document.chunk_count = len(result.chunks)
        document.page_count = result.page_count
        logger.info("Document %s processed: %s chunks", document.id, document.chunk_count)
    except ingestion_service.NoTextFoundError as exc:
        _mark_failed(document, str(exc))
    except AppError as exc:  # Gemini busy or failing
        _mark_failed(document, f"{exc.message} Delete this file and upload it again.")
    except Exception:
        logger.exception("Processing failed for document %s", document.id)
        _mark_failed(document, "This file couldn't be read. It may be damaged or password-protected.")

    if document.status == DocumentStatus.FAILED:
        vector_store.delete_document_vectors(document.id)  # remove any half-written chunks
    db.commit()
    db.refresh(document)


def _mark_failed(document: Document, message: str) -> None:
    document.status = DocumentStatus.FAILED
    document.chunk_count = 0
    document.error_message = message
    logger.warning("Document %s failed: %s", document.id, message)


def list_documents(db: Session, user: User) -> list[Document]:
    return list(
        db.scalars(select(Document).where(Document.user_id == user.id).order_by(Document.created_at.desc(), Document.id.desc()))
    )


def get_document(db: Session, user: User, document_id: int) -> Document:
    # Filtering by user_id means another user's document looks exactly like a
    # missing one (404), so IDs of other people's files aren't revealed.
    document = db.scalars(select(Document).where(Document.id == document_id, Document.user_id == user.id)).first()
    if document is None:
        raise NotFoundError("Document not found.")
    return document


def delete_document(db: Session, user: User, document_id: int) -> None:
    document = get_document(db, user, document_id)
    vector_store.delete_document_vectors(document.id)
    Path(document.stored_path).unlink(missing_ok=True)
    db.delete(document)
    db.commit()
    logger.info("Document %s deleted", document_id)


def fail_interrupted_documents(db: Session) -> None:
    """At startup: documents still 'processing' were cut off by a server restart."""
    stuck = db.scalars(select(Document).where(Document.status == DocumentStatus.PROCESSING)).all()
    for document in stuck:
        _mark_failed(document, "Processing was interrupted. Delete this file and upload it again.")
    if stuck:
        db.commit()
