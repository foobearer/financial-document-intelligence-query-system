"""
src/ingestion/pdf_parser.py — PDF Text and Table Extraction
─────────────────────────────────────────────────────────────
Extracts text and tables from PDF financial documents.

Why two libraries?
  - PyPDF2: fast, good for text-heavy pages
  - pdfplumber: slower but much better at extracting tables
  We use pdfplumber first for tables, PyPDF2 as fallback for text.

Financial PDFs are notoriously difficult — some are image-based scans,
some have complex multi-column layouts, some have embedded tables.
This module handles all cases gracefully.
"""

from pathlib import Path
from dataclasses import dataclass, field
from src.utils.logger import get_logger

log = get_logger(__name__)

@dataclass
class ParsedDocument:
    """
    Structured output of PDF parsing.

    pages:    List of raw text per page
    tables:   List of extracted tables as list-of-lists
    metadata: PDF metadata (author, creation date, etc.)
    full_text: All text joined — used for embedding
    """
    pages: list[str] = field(default_factory=list)
    tables: list[list[list[str]]] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)
    full_text: str = ""
    page_count: int = 0
    extraction_method: str = "unknown"
    
def parse_pdf(file_path: Path) -> ParsedDocument:
    """
    Extract text and tables from a PDF file.

    Tries pdfplumber first (better quality), falls back to PyPDF2.
    Handles encrypted, image-based, and malformed PDFs gracefully.

    Args:
        file_path: Path to the PDF file

    Returns:
        ParsedDocument with pages, tables, and metadata

    Raises:
        ValueError: If file is not a PDF or cannot be parsed at all
    """
    
    if not file_path.exists():
        raise FileNotFoundError(f"PDF not found: {file_path}")
    if file_path.suffix.lower() not in (".pdf",):
        raise ValueError(f"Expected a PDF file, got: {file_path.suffix}")

    log.info("pdf.parsing.start", path=str(file_path))

    # Try pdfplumber first — better for financial docs with tables
    try:
        return _parse_with_pdfplumber(file_path)
    except Exception as e:
        log.warning("pdf.pdfplumber.failed", error=str(e), fallback="pypdf2")

    # Fallback to PyPDF2
    try:
        return _parse_with_pypdf2(file_path)
    except Exception as e:
        log.error("pdf.pypdf2.failed", error=str(e))
        raise ValueError(f"Could not parse PDF: {file_path.name}. Error: {e}") from e
    

def _parse_with_pdfplumber(file_path: Path) -> ParsedDocument:
    """Extract text and tables using pdfplumber."""
    import pdfplumber

    pages_text = []
    tables = []

    with pdfplumber.open(str(file_path)) as pdf:
        metadata = pdf.metadata or {}

        for page in pdf.pages:
            # Extract text — pdfplumber preserves layout better
            text = page.extract_text(x_tolerance=3, y_tolerance=3) or ""
            pages_text.append(text)

            # Extract tables from this page
            page_tables = page.extract_tables()
            for table in (page_tables or []):
                if table and len(table) > 1:
                    # Clean up None values and strip whitespace
                    cleaned = [
                        [str(cell).strip() if cell else "" for cell in row]
                        for row in table
                    ]
                    tables.append(cleaned)

    full_text = "\n\n".join(pages_text)
    log.info("pdf.pdfplumber.done",
             pages=len(pages_text), tables=len(tables), chars=len(full_text))

    return ParsedDocument(
        pages=pages_text,
        tables=tables,
        metadata=metadata,
        full_text=full_text,
        page_count=len(pages_text),
        extraction_method="pdfplumber",
    )

def _parse_with_pypdf2(file_path: Path) -> ParsedDocument:
    """Extract text using PyPDF2 (fallback, no table extraction)."""
    import PyPDF2

    pages_text = []

    with open(file_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        metadata = reader.metadata or {}

        for page in reader.pages:
            text = page.extract_text() or ""
            pages_text.append(text)

    full_text = "\n\n".join(pages_text)
    log.info("pdf.pypdf2.done", pages=len(pages_text), chars=len(full_text))

    return ParsedDocument(
        pages=pages_text,
        tables=[],
        metadata=dict(metadata),
        full_text=full_text,
        page_count=len(pages_text),
        extraction_method="pypdf2",
    )