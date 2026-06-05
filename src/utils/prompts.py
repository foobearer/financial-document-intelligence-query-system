"""
src/utils/prompts.py — All LLM Prompts in One Place
─────────────────────────────────────────────────────
Centralising prompts here is a key engineering discipline.

Why this matters:
  - Easy to iterate on prompts without hunting through the codebase
  - Can A/B test different prompt versions
  - Clear separation between logic and language
  - Prompts are the most important "parameters" in an LLM system

Every prompt is a function that returns a formatted string.
This makes them testable and reusable.
"""


def rag_system_prompt() -> str:
    """System prompt for the RAG Q&A chatbot."""
    return """You are FinDocIQ, an expert financial document analyst with deep knowledge
of SEC filings, earnings transcripts, and financial reports.

You answer questions about financial documents with precision and clarity.
When referencing specific figures, always include the time period and units.
If information is not in the provided context, say so clearly — never hallucinate.
Format numbers clearly: use commas for thousands, specify currency, and note YoY changes.

Tone: professional, precise, helpful."""


def metric_extraction_prompt(text: str) -> str:
    """Extract structured financial metrics from document text."""
    return f"""You are a financial data extraction system. Extract financial metrics from the
text below and return ONLY a valid JSON object.

If a metric is not present in the text, set its value to null.
All monetary values should be in millions USD unless the text specifies otherwise.
All ratios should be as decimals (0.45 not 45%).

Required JSON structure:
{{
  "revenue": {{"value": number_or_null, "unit": "million USD", "period": "string_or_null", "yoy_change_pct": number_or_null}},
  "net_income": {{"value": number_or_null, "unit": "million USD", "period": "string_or_null", "yoy_change_pct": number_or_null}},
  "eps_diluted": {{"value": number_or_null, "unit": "USD", "period": "string_or_null"}},
  "gross_margin": {{"value": number_or_null, "unit": "ratio"}},
  "operating_margin": {{"value": number_or_null, "unit": "ratio"}},
  "debt_to_equity": {{"value": number_or_null, "unit": "ratio"}},
  "cash_and_equivalents": {{"value": number_or_null, "unit": "million USD"}},
  "free_cash_flow": {{"value": number_or_null, "unit": "million USD"}},
  "guidance_revenue": {{"value": number_or_null, "unit": "million USD", "period": "string_or_null", "is_range": false, "range_low": null, "range_high": null}},
  "shares_outstanding": {{"value": number_or_null, "unit": "million shares"}},
  "document_period": "string_or_null",
  "company_name": "string_or_null",
  "filing_type": "string_or_null"
}}

Text to analyse:
{text[:25000]}"""


def risk_extraction_prompt(text: str) -> str:
    """Extract and score risk factors from a financial document."""
    return f"""You are a financial risk analyst. Extract risk factors from the text below
and return ONLY a valid JSON object with a single key "risks" containing an array.

For each risk factor:
- "title": short name (5 words max)
- "description": 1-2 sentence summary of the risk
- "category": one of: market_risk, regulatory_risk, operational_risk, financial_risk,
  geopolitical_risk, technology_risk, competition_risk, macroeconomic_risk
- "severity": integer 1-5 where 5 = most severe (based on language used and potential impact)
- "likelihood": one of: low, medium, high (based on how the company frames it)
- "is_new": boolean — true if this appears to be newly added vs a standard recurring risk

Return ONLY this JSON structure:
{{
  "risks": [
    {{
      "title": "string",
      "description": "string",
      "category": "string",
      "severity": integer_1_to_5,
      "likelihood": "low|medium|high",
      "is_new": boolean
    }}
  ]
}}

Text to analyse:
{text[:20000]}"""


def sentiment_prompt(section_name: str, text: str) -> str:
    """Analyse sentiment of a specific document section."""
    return f"""You are a financial analyst specialising in management tone analysis.
Analyse the sentiment of the '{section_name}' section below.

Return ONLY a valid JSON object:
{{
  "section": "{section_name}",
  "overall_sentiment": "bullish|cautious|neutral|bearish",
  "confidence": float_0_to_1,
  "sentiment_score": float_negative_1_to_positive_1,
  "key_phrases": ["up to 5 phrases that drove this sentiment"],
  "forward_looking_tone": "optimistic|neutral|cautious|negative",
  "management_confidence": "high|medium|low",
  "notable_language": "any unusually strong positive or negative language, or null"
}}

Section text:
{text[:3000]}"""


def comparison_prompt(doc1_summary: str, doc2_summary: str, doc1_label: str, doc2_label: str) -> str:
    """Compare two financial documents."""
    return f"""You are a financial analyst comparing two documents.
Provide a structured comparison.

Return ONLY a valid JSON object:
{{
  "summary": "2-3 sentence executive summary of key differences",
  "revenue_change": {{"direction": "up|down|flat|unknown", "magnitude": "string_or_null", "commentary": "string"}},
  "profitability_change": {{"direction": "up|down|flat|unknown", "commentary": "string"}},
  "risk_profile_change": {{"direction": "improved|deteriorated|stable|unknown", "commentary": "string"}},
  "new_risks": ["risks in {doc2_label} not in {doc1_label}"],
  "resolved_risks": ["risks in {doc1_label} no longer in {doc2_label}"],
  "guidance_change": {{"direction": "raised|lowered|maintained|none|unknown", "commentary": "string"}},
  "sentiment_shift": {{"from": "string", "to": "string", "commentary": "string"}},
  "key_themes": ["up to 5 major themes or changes"],
  "analyst_note": "one paragraph overall assessment"
}}

{doc1_label}:
{doc1_summary[:2000]}

{doc2_label}:
{doc2_summary[:2000]}"""


def document_classifier_prompt(text_sample: str) -> str:
    """Classify the type of financial document."""
    return f"""Classify the following financial document excerpt.

Return ONLY a valid JSON object:
{{
  "doc_type": "10-K|10-Q|8-K|earnings_transcript|analyst_report|annual_report|unknown",
  "company_name": "string_or_null",
  "period": "string_or_null",
  "fiscal_year": "string_or_null",
  "confidence": float_0_to_1
}}

Document excerpt (first 1000 chars):
{text_sample[:1000]}"""
