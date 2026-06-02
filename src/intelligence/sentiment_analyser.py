"""
src/intelligence/sentiment_analyser.py — Per-Section Financial Sentiment
──────────────────────────────────────────────────────────────────────────
Analyses the tone and sentiment of each document section.
Financial sentiment is nuanced — "cautious optimism" is different
from "bullish" which is different from "defensive".
"""

import json
from src.ingestion.section_splitter import DocumentSection
from src.utils.config import settings
from src.utils.prompts import sentiment_prompt
from src.utils.logger import get_logger

log = get_logger(__name__)


def analyse_sentiment(sections: list[DocumentSection]) -> list[dict]:
    """
    Analyse sentiment for each document section.

    Args:
        sections: List of DocumentSection objects

    Returns:
        List of sentiment results, one per section.
        Each result: section, overall_sentiment, confidence,
                     sentiment_score, key_phrases, forward_looking_tone,
                     management_confidence, notable_language
    """
    if not settings.openai_available:
        return []

    results = []
    from openai import OpenAI
    client = OpenAI(api_key=settings.openai_api_key)

    # Prioritise the most informative sections
    priority_sections = ["MD&A", "Prepared Remarks", "Business", "Risk Factors"]
    sorted_sections = sorted(
        sections,
        key=lambda s: (0 if s.name in priority_sections else 1, s.name)
    )

    for section in sorted_sections[:6]:  # Analyse top 6 sections
        if len(section.text) < 200:
            continue

        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",  # Mini is sufficient for sentiment
                response_format={"type": "json_object"},
                messages=[
                    {"role": "user", "content": sentiment_prompt(section.name, section.text)}
                ],
                max_tokens=400,
                temperature=0,
            )
            result = json.loads(response.choices[0].message.content)
            results.append(result)
            log.info("sentiment.section_done",
                     section=section.name,
                     sentiment=result.get("overall_sentiment"))

        except Exception as e:
            log.error("sentiment.section_failed", section=section.name, error=str(e))

    return results


def get_overall_sentiment(section_sentiments: list[dict]) -> dict:
    """
    Aggregate per-section sentiments into an overall document sentiment.

    Weights MD&A and Prepared Remarks more heavily than other sections.
    """
    if not section_sentiments:
        return {"overall": "neutral", "score": 0.0, "confidence": 0.0}

    weights = {"MD&A": 3, "Prepared Remarks": 3, "Business": 2, "Risk Factors": 1}
    total_weight = 0
    weighted_score = 0.0

    for s in section_sentiments:
        weight = weights.get(s.get("section", ""), 1)
        score = s.get("sentiment_score", 0.0)
        weighted_score += score * weight
        total_weight += weight

    avg_score = weighted_score / total_weight if total_weight > 0 else 0.0

    if avg_score > 0.3:
        overall = "bullish"
    elif avg_score > 0.1:
        overall = "cautiously optimistic"
    elif avg_score > -0.1:
        overall = "neutral"
    elif avg_score > -0.3:
        overall = "cautious"
    else:
        overall = "bearish"

    return {
        "overall": overall,
        "score": round(avg_score, 3),
        "confidence": round(sum(s.get("confidence", 0.5) for s in section_sentiments) / len(section_sentiments), 3),
    }
