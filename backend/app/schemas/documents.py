from pydantic import BaseModel, ConfigDict

from app.schemas.common import UTCDateTime


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    original_filename: str
    file_type: str
    size_bytes: int
    page_count: int | None
    chunk_count: int
    status: str
    error_message: str | None
    created_at: UTCDateTime
