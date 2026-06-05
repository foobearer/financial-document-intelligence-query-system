from __future__ import annotations

"""
src/ingestion/doc_classifier.py — Financial Document Type Detection
────────────────────────────────────────────────────────────────────
Detects what kind of financial document we're dealing with before
we process it. Different document types need different section
splitting strategies and extraction prompts.

We use a two-step approach:
  1. Heuristic detection (fast, free) — look for keywords
  2. LLM classification (slower, costs tokens) — for ambiguous cases
"""

import re
from dataclasses import dataclass
from src.utils.logger import get_logger

log = get_logger(__name__)

# Document type constants
DOC_10K = "10-K"
DOC_10Q = "10-Q"
DOC_8K = "8-K"
DOC_TRANSCRIPT = "earnings_transcript"
DOC_ANALYST = "analyst_report"
DOC_ANNUAL = "annual_report"
DOC_UNKNOWN = "unknown"


@dataclass
class DocumentClassification:
    doc_type: str
    company_name: str | None
    period: str | None
    fiscal_year: str | None
    confidence: float
    method: str  # "heuristic" or "llm"


# Heuristic patterns for each document type
_PATTERNS = {
    DOC_10K: [
        r"annual report on form 10-k",
        r"form 10-k\b",
        r"10-k\s+annual",
        r"item 1\.\s+business.*item 1a\.\s+risk factors",
    ],
    DOC_10Q: [
        r"quarterly report on form 10-q",
        r"form 10-q\b",
        r"10-q\s+quarterly",
    ],
    DOC_8K: [
        r"current report on form 8-k",
        r"form 8-k\b",
        r"pursuant to section 13 or 15\(d\)",
    ],
    DOC_TRANSCRIPT: [
        r"earnings call transcript",
        r"earnings conference call",
        r"question.and.answer session",
        r"operator:",
        r"moderator:",
    ],
    DOC_ANALYST: [
        r"equity research",
        r"initiating coverage",
        r"price target",
        r"buy|sell|hold\s+rating",
        r"analyst.*report",
    ],
}


def classify_document(text: str, use_llm: bool = False) -> DocumentClassification:
    """
    Classify a financial document by type.

    Args:
        text:    Full document text (or first few pages)
        use_llm: If True and heuristics are uncertain, use LLM for classification

    Returns:
        DocumentClassification with type, company, period, and confidence
    """
    # Use first 3000 chars for classification — type is usually in the header
    sample = text[:3000].lower()

    # Try heuristic matching first
    scores: dict[str, int] = {}
    for doc_type, patterns in _PATTERNS.items():
        score = sum(1 for p in patterns if re.search(p, sample, re.IGNORECASE))
        if score > 0:
            scores[doc_type] = score

    if scores:
        best_type = max(scores, key=scores.get)
        confidence = min(0.95, scores[best_type] * 0.3)
        company = _extract_company_name(text)
        period = _extract_period(text)

        log.info("doc.classified.heuristic", type=best_type, confidence=confidence)
        return DocumentClassification(
            doc_type=best_type,
            company_name=company,
            period=period,
            fiscal_year=_extract_fiscal_year(text),
            confidence=confidence,
            method="heuristic",
        )

    # Fall back to LLM if enabled and heuristics failed
    if use_llm:
        return _classify_with_llm(text[:1000])

    log.warning("doc.classified.unknown")
    return DocumentClassification(
        doc_type=DOC_UNKNOWN,
        company_name=_extract_company_name(text),
        period=None,
        fiscal_year=None,
        confidence=0.1,
        method="heuristic",
    )


def _extract_company_name(text: str) -> str | None:
    """Extract company name from document header using common patterns."""
    patterns = [
        r"(?:company name|registrant):\s*([A-Z][^\n]{2,50})",
        r"([A-Z][A-Z\s,\.]+(?:INC|CORP|LLC|LTD|CO\.?|COMPANY)\.?)\s*\n",
    ]
    for pattern in patterns:
        match = re.search(pattern, text[:2000], re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None


def _extract_period(text: str) -> str | None:
    """Extract the reporting period (e.g. Q1 2024, FY2023)."""
    patterns = [
        r"(?:for (?:the )?(?:fiscal )?(?:year|quarter|period)[\s\w]*?ended?)\s+([A-Z][a-z]+ \d{1,2},? \d{4})",
        r"(?:three|nine|twelve) months ended\s+([A-Z][a-z]+ \d{1,2},? \d{4})",
        r"(?:Q[1-4]|FY)\s*\d{4}",
    ]
    for pattern in patterns:
        match = re.search(pattern, text[:3000], re.IGNORECASE)
        if match:
            return match.group(0 if "Q[1-4]" in pattern else 1).strip()
    return None


def _extract_fiscal_year(text: str) -> str | None:
    """Extract fiscal year."""
    match = re.search(r"(?:fiscal|fy)\s*(\d{4})", text[:3000], re.IGNORECASE)
    return match.group(1) if match else None


def _classify_with_llm(text_sample: str) -> DocumentClassification:
    """Use GPT-4o-mini for document classification when heuristics fail."""
    from src.utils.config import settings
    from src.utils.prompts import document_classifier_prompt
    import json

    if not settings.openai_available:
        return DocumentClassification(
            doc_type=DOC_UNKNOWN, company_name=None, period=None,
            fiscal_year=None, confidence=0.0, method="fallback"
        )

    from openai import OpenAI
    client = OpenAI(api_key=settings.openai_api_key)

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[{"role": "user", "content": document_classifier_prompt(text_sample)}],
        max_tokens=200,
    )
    raw = json.loads(response.choices[0].message.content)
    log.info("doc.classified.llm", type=raw.get("doc_type"))

    return DocumentClassification(
        doc_type=raw.get("doc_type", DOC_UNKNOWN),
        company_name=raw.get("company_name"),
        period=raw.get("period"),
        fiscal_year=raw.get("fiscal_year"),
        confidence=raw.get("confidence", 0.7),
        method="llm",
    )
