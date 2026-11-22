from typing import Annotated

from fastapi import APIRouter, File, UploadFile, status

from app.api.deps import CurrentUser, DbSession
from app.api.responses import error_responses
from app.core.config import get_settings
from app.schemas.documents import DocumentResponse
from app.services import document_service

router = APIRouter(prefix="/documents", tags=["documents"], responses=error_responses(401))


@router.post(
    "",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    responses=error_responses(400, 409, 413, 503),
)
def upload_document(user: CurrentUser, db: DbSession, file: Annotated[UploadFile, File()]) -> DocumentResponse:
    """Upload a PDF, DOCX or TXT file. It is processed before the response is sent:
    check `status` ("ready" or "failed") and `error_message` in the response."""
    limit = get_settings().max_upload_mb * 1024 * 1024
    # Read at most one byte more than the limit: enough to know a file is too big
    # without loading a huge file into memory.
    content = file.file.read(limit + 1)
    total_size = file.size if file.size is not None else len(content)
    document = document_service.upload_document(db, user, file.filename, content, total_size)
    return DocumentResponse.model_validate(document)


@router.get("", response_model=list[DocumentResponse])
def list_documents(user: CurrentUser, db: DbSession) -> list[DocumentResponse]:
    """List my documents, newest first."""
    return [DocumentResponse.model_validate(d) for d in document_service.list_documents(db, user)]


@router.get("/{document_id}", response_model=DocumentResponse, responses=error_responses(404))
def get_document(document_id: int, user: CurrentUser, db: DbSession) -> DocumentResponse:
    return DocumentResponse.model_validate(document_service.get_document(db, user, document_id))


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT, responses=error_responses(404))
def delete_document(document_id: int, user: CurrentUser, db: DbSession) -> None:
    """Delete the document, its stored file and all its vectors."""
    document_service.delete_document(db, user, document_id)
