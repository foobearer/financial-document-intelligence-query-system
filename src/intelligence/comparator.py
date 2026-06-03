"""
src/intelligence/comparator.py — Cross-Period Document Comparison
──────────────────────────────────────────────────────────────────
Compares two financial documents (e.g. Q1 2024 vs Q1 2025).

This is one of the most valuable features for financial analysts —
instead of reading two 200-page documents and manually noting
differences, FinDocIQ surfaces the key changes automatically.
"""

import json
from src.utils.config import settings
from src.utils.prompts import comparison_prompt
from src.utils.logger import get_logger

log = get_logger(__name__)


def compare_documents(
    doc1_text: str,
    doc2_text: str,
    doc1_label: str = "Document 1",
    doc2_label: str = "Document 2",
) -> dict:
    """
    Compare two financial documents and surface key differences.

    Args:
        doc1_text:  Text of the first document (e.g. older period)
        doc2_text:  Text of the second document (e.g. newer period)
        doc1_label: Human-readable label for doc1 (e.g. "Q1 2024 10-Q")
        doc2_label: Human-readable label for doc2 (e.g. "Q1 2025 10-Q")

    Returns:
        Structured comparison with revenue change, risk changes,
        sentiment shift, new themes, and analyst note.
    """
    if not settings.openai_available:
        return {"error": "OpenAI API key required for document comparison."}

    # Use first 3000 chars of each doc as summary for the comparison
    # (full docs would exceed token limits)
    doc1_summary = doc1_text[:3000]
    doc2_summary = doc2_text[:3000]

    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)

        response = client.chat.completions.create(
            model=settings.openai_model,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "user",
                    "content": comparison_prompt(doc1_summary, doc2_summary, doc1_label, doc2_label)
                }
            ],
            max_tokens=1500,
            temperature=0.1,
        )

        result = json.loads(response.choices[0].message.content)
        result["doc1_label"] = doc1_label
        result["doc2_label"] = doc2_label
        log.info("comparison.done", doc1=doc1_label, doc2=doc2_label)
        return result

    except Exception as e:
        log.error("comparison.failed", error=str(e))
        return {"error": str(e), "doc1_label": doc1_label, "doc2_label": doc2_label}
