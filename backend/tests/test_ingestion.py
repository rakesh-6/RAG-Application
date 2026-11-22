from langchain_core.documents import Document as LCDocument

from app.services.ingestion_service import clean_text, split_into_chunks


def test_clean_text_fixes_spacing_and_hyphenation() -> None:
    raw = "Annual   leave\tpolicy\n\n\n\nEmploy-\nees get 18 days.\x00  "

    assert clean_text(raw) == "Annual leave policy\n\nEmployees get 18 days."


def test_pdf_chunks_keep_one_based_page_numbers_and_metadata() -> None:
    pages = [
        LCDocument(page_content="Text on the first page.", metadata={"page": 0}),
        LCDocument(page_content="Text on the second page.", metadata={"page": 1}),
    ]

    chunks = split_into_chunks(pages, document_id=7, user_id=3, filename="Handbook.pdf", file_type="pdf")

    assert [c.metadata["page"] for c in chunks] == [1, 2]
    assert [c.metadata["chunk_index"] for c in chunks] == [0, 1]
    assert chunks[0].metadata["user_id"] == 3
    assert chunks[0].metadata["document_id"] == 7
    assert chunks[0].metadata["filename"] == "Handbook.pdf"


def test_txt_chunks_have_no_page_number() -> None:
    chunks = split_into_chunks([LCDocument(page_content="Some notes.")], document_id=1, user_id=1, filename="n.txt", file_type="txt")

    assert "page" not in chunks[0].metadata


def test_long_text_is_split_with_overlap() -> None:
    text = " ".join(f"Sentence number {i} about leave rules." for i in range(40))  # about 1,400 characters

    chunks = split_into_chunks([LCDocument(page_content=text)], document_id=1, user_id=1, filename="n.txt", file_type="txt")

    assert len(chunks) > 1
    assert all(len(c.page_content) <= 200 for c in chunks)  # CHUNK_SIZE is 200 in tests
