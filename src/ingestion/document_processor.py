"""
src/ingestion/document_processor.py — Full Ingestion Orchestrator
──────────────────────────────────────────────────────────────────
Orchestrates the complete document processing pipeline:
  1. Parse PDF → extract text and tables
  2. Classify document type
  3. Split into semantic sections
  4. Chunk sections for RAG
  5. Embed and store in ChromaDB
  6. Save metadata to SQLite
  7. Run intelligence extraction (metrics, risks, sentiment)

This is the entry point for all document processing.
Both the FastAPI and Streamlit interfaces call this.
"""

import uuid
from pathlib import Path
from dataclasses import dataclass, field
from src.ingestion.pdf_parser import parse_pdf
from src.ingestion.doc_classifier import classify_document
from src.ingestion.section_splitter import split_into_sections
from src.storage.vector_store import VectorStore
from src.utils.config import settings
from src.utils.logger import get_logger

log = get_logger(__name__)


@dataclass
class ProcessedDocument:
    """Result of the full document processing pipeline."""
    document_id: str
    filename: str
    doc_type: str
    company_name: str | None
    period: str | None
    page_count: int
    chunk_count: int
    sections: list[str] = field(default_factory=list)
    metrics: dict = field(default_factory=dict)
    risks: list[dict] = field(default_factory=list)
    sentiments: list[dict] = field(default_factory=list)
    full_text: str = ""
    status: str = "processed"
    error: str | None = None


def process_document(file_path: Path, run_intelligence: bool = True) -> ProcessedDocument:
    """
    Process a financial document end-to-end.

    Args:
        file_path:        Path to the PDF file
        run_intelligence: If True, also extract metrics, risks, sentiment.
                          Set False for faster ingestion when you only need Q&A.

    Returns:
        ProcessedDocument with all extracted information.
    """
    document_id = str(uuid.uuid4())[:8]
    log.info("pipeline.start", file=file_path.name, doc_id=document_id)

    # Step 1: Parse PDF
    log.info("pipeline.parsing", doc_id=document_id)
    parsed = parse_pdf(file_path)

    # Step 2: Classify document type
    log.info("pipeline.classifying", doc_id=document_id)
    classification = classify_document(parsed.full_text, use_llm=False)

    # Step 3: Split into sections
    log.info("pipeline.splitting", doc_id=document_id)
    sections = split_into_sections(parsed.full_text, classification.doc_type)
    section_names = [s.name for s in sections]

    # Step 4: Chunk sections for RAG
    # We chunk each section separately to preserve semantic boundaries
    log.info("pipeline.chunking", doc_id=document_id, sections=len(sections))
    all_chunks = []
    all_metadatas = []

    for section in sections:
        section_chunks = _chunk_text(
            section.text,
            chunk_size=settings.chunk_size,
            overlap=settings.chunk_overlap,
        )
        for i, chunk in enumerate(section_chunks):
            all_chunks.append(chunk)
            all_metadatas.append({
                "section":    section.name,
                "section_type": section.section_type,
                "chunk_index": i,
                "doc_type":   classification.doc_type,
                "company":    classification.company_name or "",
                "period":     classification.period or "",
            })

    # Step 5: Store embeddings in ChromaDB
    log.info("pipeline.embedding", doc_id=document_id, chunks=len(all_chunks))
    vector_store = VectorStore()
    vector_store.add_document(document_id, all_chunks, all_metadatas)

    result = ProcessedDocument(
        document_id=document_id,
        filename=file_path.name,
        doc_type=classification.doc_type,
        company_name=classification.company_name,
        period=classification.period,
        page_count=parsed.page_count,
        chunk_count=len(all_chunks),
        sections=section_names,
        full_text=parsed.full_text,
    )

    # Step 6: Run intelligence extraction (optional, slower)
    if run_intelligence and settings.openai_available:
        log.info("pipeline.intelligence", doc_id=document_id)

        # Extract financial metrics from financial statements section
        fin_section = next(
            (s for s in sections if s.section_type == "financials"), None
        ) or (sections[0] if sections else None)

        if fin_section:
            from src.intelligence.metric_extractor import extract_metrics
            result.metrics = extract_metrics(fin_section.text)

        # Score risks from risk factors section
        risk_section = next(
            (s for s in sections if s.section_type == "risk_factors"), None
        )
        if risk_section:
            from src.intelligence.risk_scorer import score_risks
            result.risks = score_risks(risk_section.text)

        # Analyse sentiment across key sections
        from src.intelligence.sentiment_analyser import analyse_sentiment
        result.sentiments = analyse_sentiment(sections[:5])

    log.info("pipeline.complete",
             doc_id=document_id,
             chunks=len(all_chunks),
             metrics=bool(result.metrics),
             risks=len(result.risks),
             sentiments=len(result.sentiments))

    return result


def _chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """
    Split text into overlapping chunks.

    Uses LangChain's RecursiveCharacterTextSplitter which tries to
    split at paragraph boundaries first, then sentences, then words.
    This produces more coherent chunks than splitting at fixed positions.
    """
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    return splitter.split_text(text)
