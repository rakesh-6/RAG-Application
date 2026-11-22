"""Small builders for test files and requests."""

import io
import zipfile

from fastapi.testclient import TestClient
from httpx import Response
from pypdf import PdfWriter

LEAVE_POLICY_TEXT = (
    "Annual leave policy.\n\n"
    "Full-time employees are entitled to 18 days of paid annual leave per calendar year, "
    "accrued at 1.5 days for each completed month of service.\n\n"
    "Employees on probation may use accrued leave after 30 days of service, subject to manager approval.\n\n"
    "A maximum of 10 unused leave days may be carried forward. Remaining days lapse on 31 December."
)


def upload(client: TestClient, headers: dict[str, str], filename: str, content: bytes) -> Response:
    return client.post("/api/documents", files={"file": (filename, content, "application/octet-stream")}, headers=headers)


def blank_pdf() -> bytes:
    """A valid PDF with one empty page (no text), like a scanned document."""
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def simple_docx(text: str) -> bytes:
    """The smallest .docx that Word readers accept: a zip with word/document.xml."""
    xml = (
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body><w:p><w:r><w:t>{text}</w:t></w:r></w:p></w:body></w:document>"
    )
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("word/document.xml", xml)
    return buffer.getvalue()
