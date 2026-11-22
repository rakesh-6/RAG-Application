"""Turn an uploaded file into clean, page-tagged text chunks.

Pipeline: load (one LangChain Document per PDF page, or one per DOCX/TXT file)
→ clean the text → split into overlapping chunks → attach metadata.
"""

import re
from dataclasses import dataclass
from pathlib import Path

import docx2txt
from langchain_core.documents import Document as LCDocument
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

from app.core.config import get_settings


class NoTextFoundError(Exception):
    """The file was read successfully but contains no usable text."""


@dataclass
class IngestionResult:
    chunks: list[LCDocument]
    page_count: int | None  # None for DOCX/TXT, which have no pages


def load_pages(path: Path, file_type: str) -> list[LCDocument]:
    """Read the file into LangChain Documents: one per PDF page, one for a whole DOCX/TXT."""
    if file_type == "pdf":
        reader = PdfReader(path)
        return [
            LCDocument(page_content=page.extract_text() or "", metadata={"page": index})  # 0-based page index
            for index, page in enumerate(reader.pages)
        ]
    if file_type == "docx":
        return [LCDocument(page_content=docx2txt.process(str(path)) or "")]
    # utf-8-sig also removes the invisible "BOM" character some editors put at the start
    return [LCDocument(page_content=path.read_text(encoding="utf-8-sig"))]


def clean_text(text: str) -> str:
    text = text.replace("\x00", "")
    text = re.sub(r"-\n(\w)", r"\1", text)  # join words hyphenated across lines: "docu-\nment"
    text = re.sub(r"[ \t]+", " ", text)  # collapse runs of spaces and tabs
    text = "\n".join(line.strip() for line in text.splitlines())
    text = re.sub(r"\n{3,}", "\n\n", text)  # at most one blank line between paragraphs
    return text.strip()


def split_into_chunks(
    pages: list[LCDocument], *, document_id: int, user_id: int, filename: str, file_type: str
) -> list[LCDocument]:
    settings = get_settings()
    # Tries to split on paragraphs first, then lines, then sentences, then words,
    # so chunks break at natural boundaries. The overlap keeps context that would
    # otherwise be cut in half at a chunk border.
    splitter = RecursiveCharacterTextSplitter(chunk_size=settings.chunk_size, chunk_overlap=settings.chunk_overlap)

    chunks: list[LCDocument] = []
    for page in pages:
        for piece in splitter.split_text(page.page_content):
            metadata: dict[str, str | int] = {
                "user_id": user_id,
                "document_id": document_id,
                "filename": filename,
                "chunk_index": len(chunks),
            }
            if file_type == "pdf":
                # Chroma metadata can't hold None, so DOCX/TXT chunks simply have no "page" key.
                metadata["page"] = int(page.metadata.get("page", 0)) + 1
            chunks.append(LCDocument(page_content=piece, metadata=metadata))
    return chunks


def ingest_file(path: Path, *, file_type: str, document_id: int, user_id: int, filename: str) -> IngestionResult:
    raw_pages = load_pages(path, file_type)
    page_count = len(raw_pages) if file_type == "pdf" else None

    pages = []
    for page in raw_pages:
        text = clean_text(page.page_content)
        if text:  # drop empty pages (blank or image-only)
            pages.append(LCDocument(page_content=text, metadata=page.metadata))

    if not pages:
        raise NoTextFoundError("No readable text found. Scanned PDFs aren't supported yet.")

    chunks = split_into_chunks(pages, document_id=document_id, user_id=user_id, filename=filename, file_type=file_type)
    return IngestionResult(chunks=chunks, page_count=page_count)
