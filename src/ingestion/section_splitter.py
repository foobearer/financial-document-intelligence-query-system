"""
src/ingestion/section_splitter.py — Semantic Section Detection
───────────────────────────────────────────────────────────────
Splits financial documents into meaningful sections before chunking.

Why section-aware splitting matters:
  Generic RAG splits at arbitrary character boundaries. A chunk might start
  in the middle of a risk factor and end in the middle of another.

  Section-aware splitting keeps "Risk Factor: Competition" as one unit.
  When you ask "what are the biggest risks?", the retriever finds complete,
  coherent risk descriptions — not fragments.

  This is the single biggest quality improvement over generic RAG for
  financial documents.

SEC 10-K sections (standardised by the SEC):
  Item 1   — Business
  Item 1A  — Risk Factors
  Item 1B  — Unresolved Staff Comments
  Item 2   — Properties
  Item 3   — Legal Proceedings
  Item 7   — MD&A (Management Discussion & Analysis) ← most important
  Item 7A  — Quantitative Disclosures About Market Risk
  Item 8   — Financial Statements
  Item 9A  — Controls and Procedures
"""

import re
from dataclasses import dataclass, field
from src.utils.logger import get_logger

log = get_logger(__name__)


@dataclass
class DocumentSection:
    """A single semantic section from a financial document."""
    name: str                        # e.g. "Risk Factors"
    item_number: str | None          # e.g. "1A" for SEC filings
    text: str                        # Raw section text
    start_char: int = 0             # Character offset in original document
    end_char: int = 0
    section_type: str = "general"   # risk_factors, mda, financials, business, etc.


# SEC 10-K/10-Q section patterns
_SEC_SECTION_PATTERNS = [
    (r"item\s+1\b(?!a|b)[.\s]*business", "Business", "1", "business"),
    (r"item\s+1a[.\s]*risk\s+factors", "Risk Factors", "1A", "risk_factors"),
    (r"item\s+1b[.\s]*unresolved\s+staff", "Unresolved Staff Comments", "1B", "general"),
    (r"item\s+2[.\s]*properties", "Properties", "2", "general"),
    (r"item\s+3[.\s]*legal\s+proceedings", "Legal Proceedings", "3", "legal"),
    (r"item\s+7\b(?!a)[.\s]*management.s?\s+discussion", "MD&A", "7", "mda"),
    (r"item\s+7a[.\s]*quantitative\s+and\s+qualitative", "Market Risk", "7A", "risk_factors"),
    (r"item\s+8[.\s]*financial\s+statements", "Financial Statements", "8", "financials"),
    (r"item\s+9a[.\s]*controls\s+and\s+procedures", "Controls", "9A", "general"),
]

# Earnings transcript sections
_TRANSCRIPT_SECTION_PATTERNS = [
    (r"prepared\s+remarks|management\s+remarks|opening\s+remarks", "Prepared Remarks", None, "management_remarks"),
    (r"question.and.answer|q&a\s+session|questions?\s+and\s+answers?", "Q&A Session", None, "qa"),
    (r"forward.looking\s+statements?", "Forward-Looking Statements", None, "disclaimer"),
]


def split_into_sections(text: str, doc_type: str) -> list[DocumentSection]:
    """
    Split a financial document into semantic sections.

    Args:
        text:     Full document text
        doc_type: Document type from doc_classifier

    Returns:
        List of DocumentSection objects, ordered by position in document.
        Falls back to paragraph-based splitting if no sections found.
    """
    if doc_type in ("10-K", "10-Q"):
        sections = _split_sec_filing(text)
    elif doc_type == "earnings_transcript":
        sections = _split_transcript(text)
    else:
        sections = _split_by_paragraphs(text)

    if not sections:
        log.warning("sections.none_found", doc_type=doc_type, fallback="paragraphs")
        sections = _split_by_paragraphs(text)

    log.info("sections.found", count=len(sections), doc_type=doc_type)
    return sections


def _split_sec_filing(text: str) -> list[DocumentSection]:
    """Split a 10-K or 10-Q into standardised SEC sections."""
    sections = []
    text_lower = text.lower()

    # Find positions of each section header
    found_positions: list[tuple[int, str, str, str, str]] = []
    for pattern, name, item_num, section_type in _SEC_SECTION_PATTERNS:
        for match in re.finditer(pattern, text_lower):
            found_positions.append(
                (match.start(), name, item_num, section_type, match.group())
            )

    if not found_positions:
        return []

    # Sort by position
    found_positions.sort(key=lambda x: x[0])

    # Create sections from found positions
    for i, (start_pos, name, item_num, section_type, _) in enumerate(found_positions):
        # Section ends where next section begins
        end_pos = found_positions[i + 1][0] if i + 1 < len(found_positions) else len(text)

        section_text = text[start_pos:end_pos].strip()
        if len(section_text) < 100:  # Skip empty/tiny sections
            continue

        sections.append(DocumentSection(
            name=name,
            item_number=item_num,
            text=section_text,
            start_char=start_pos,
            end_char=end_pos,
            section_type=section_type,
        ))

    return sections


def _split_transcript(text: str) -> list[DocumentSection]:
    """Split an earnings transcript into prepared remarks and Q&A."""
    sections = []
    text_lower = text.lower()
    found = []

    for pattern, name, item_num, section_type in _TRANSCRIPT_SECTION_PATTERNS:
        match = re.search(pattern, text_lower)
        if match:
            found.append((match.start(), name, item_num, section_type))

    if not found:
        return []

    found.sort(key=lambda x: x[0])
    for i, (start_pos, name, item_num, section_type) in enumerate(found):
        end_pos = found[i + 1][0] if i + 1 < len(found) else len(text)
        section_text = text[start_pos:end_pos].strip()
        if len(section_text) > 100:
            sections.append(DocumentSection(
                name=name, item_number=item_num, text=section_text,
                start_char=start_pos, end_char=end_pos, section_type=section_type
            ))

    return sections


def _split_by_paragraphs(text: str, min_length: int = 500) -> list[DocumentSection]:
    """
    Fallback: split by double newlines into paragraph groups.
    Groups consecutive paragraphs until we hit min_length characters.
    """
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]
    sections = []
    current_text = ""
    section_num = 1

    for para in paragraphs:
        current_text += "\n\n" + para
        if len(current_text) >= min_length:
            sections.append(DocumentSection(
                name=f"Section {section_num}",
                item_number=None,
                text=current_text.strip(),
                section_type="general",
            ))
            section_num += 1
            current_text = ""

    if current_text.strip():
        sections.append(DocumentSection(
            name=f"Section {section_num}",
            item_number=None,
            text=current_text.strip(),
            section_type="general",
        ))

    return sections
