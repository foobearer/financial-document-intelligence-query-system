"""
src/intelligence/risk_scorer.py — Risk Factor Identification & Scoring
────────────────────────────────────────────────────────────────────────
Extracts risk factors from SEC filings and scores each one by
severity and likelihood. Returns a structured, ranked list.
"""

import json
from src.utils.config import settings
from src.utils.prompts import risk_extraction_prompt
from src.utils.logger import get_logger

log = get_logger(__name__)

SEVERITY_LABELS = {1: "minimal", 2: "low", 3: "moderate", 4: "high", 5: "critical"}


def score_risks(risk_section_text: str) -> list[dict]:
    """
    Extract and score risk factors from the Risk Factors section.

    Args:
        risk_section_text: Text of the Risk Factors section

    Returns:
        List of risk dicts, sorted by severity (highest first).
        Each dict: title, description, category, severity (1-5),
                   likelihood, is_new, severity_label
    """
    if not settings.openai_available:
        return []

    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)

        response = client.chat.completions.create(
            model=settings.openai_model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "user", "content": risk_extraction_prompt(risk_section_text)}
            ],
            max_tokens=2000,
            temperature=0,
        )

        # The prompt asks for an array, wrapped in a JSON object
        raw = json.loads(response.choices[0].message.content)
        # Handle both {"risks": [...]} and direct array
        risks = raw if isinstance(raw, list) else raw.get("risks", raw.get("risk_factors", []))

        # Add severity labels and sort
        for risk in risks:
            severity = risk.get("severity", 3)
            risk["severity_label"] = SEVERITY_LABELS.get(severity, "moderate")

        risks.sort(key=lambda r: r.get("severity", 0), reverse=True)
        log.info("risks.extracted", count=len(risks))
        return risks

    except Exception as e:
        log.error("risks.extraction_failed", error=str(e))
        return []
