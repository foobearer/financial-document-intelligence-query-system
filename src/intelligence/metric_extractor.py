"""
src/intelligence/metric_extractor.py — Financial Metric Extraction
────────────────────────────────────────────────────────────────────
Extracts structured financial metrics from document text using GPT-4o.

This is what separates FinDocIQ from a generic RAG chatbot.
Instead of asking "what was the revenue?" and getting a sentence,
you get a structured JSON object you can programmatically use.
"""

import json
import re
from src.utils.config import settings
from src.utils.prompts import metric_extraction_prompt
from src.utils.logger import get_logger

log = get_logger(__name__)


def extract_metrics(text: str) -> dict:
    """
    Extract structured financial metrics from document text.

    Args:
        text: Document text (ideally the financial statements section)

    Returns:
        Dict with revenue, net_income, EPS, margins, ratios, etc.
        All monetary values in millions USD unless noted.
        Null for any metric not found in the document.
    """
    if not settings.openai_available:
        return _fallback_regex_extraction(text)

    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)

        response = client.chat.completions.create(
            model=settings.openai_model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "user", "content": metric_extraction_prompt(text)}
            ],
            max_tokens=1000,
            temperature=0,  # Zero temperature for deterministic extraction
        )

        metrics = json.loads(response.choices[0].message.content)
        log.info("metrics.extracted", company=metrics.get("company_name"),
                 period=metrics.get("document_period"))
        return metrics

    except Exception as e:
        log.error("metrics.extraction_failed", error=str(e))
        return _fallback_regex_extraction(text)


def _fallback_regex_extraction(text: str) -> dict:
    """
    Basic regex-based metric extraction when OpenAI is unavailable.
    Less accurate but always works.
    """
    log.info("metrics.using_regex_fallback")
    metrics = {
        "revenue": None, "net_income": None, "eps_diluted": None,
        "gross_margin": None, "operating_margin": None,
        "document_period": None, "company_name": None, "filing_type": None,
    }

    # Revenue patterns
    revenue_match = re.search(
        r"(?:net\s+)?revenue[s]?\s*[:\$]?\s*\$?([\d,]+(?:\.\d+)?)\s*(?:million|billion|M|B)?",
        text, re.IGNORECASE
    )
    if revenue_match:
        val = float(revenue_match.group(1).replace(",", ""))
        metrics["revenue"] = {"value": val, "unit": "million USD"}

    # EPS patterns
    eps_match = re.search(
        r"(?:diluted\s+)?(?:earnings|EPS)\s+per\s+(?:diluted\s+)?share\s*[:\$]?\s*\$?([\d\.]+)",
        text, re.IGNORECASE
    )
    if eps_match:
        metrics["eps_diluted"] = {"value": float(eps_match.group(1)), "unit": "USD"}

    return metrics
