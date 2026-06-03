"""
src/api/main.py — FinDocIQ FastAPI Production API
───────────────────────────────────────────────────
Run:  uvicorn src.api.main:app --reload
Docs: http://localhost:8000/docs
"""

import shutil
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.api.schemas import (
    UploadResponse, QueryRequest, QueryResponse,
    CompareRequest, HealthResponse,
)
from src.utils.config import settings
from src.utils.logger import get_logger

log = get_logger(__name__)

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description=(
        "Financial Document Intelligence & Query System. "
        "Upload SEC filings, earnings transcripts, and analyst reports. "
        "Get structured metrics, risk scores, sentiment analysis, and Q&A.\n\n"
        "Built by [Joycee Catamora Paragas](https://joycee.dev)"
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory document store for this session
# In production, replace with a database
_documents: dict[str, object] = {}


@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health():
    return HealthResponse(openai_configured=settings.openai_available)


@app.post("/documents/upload", response_model=UploadResponse, tags=["Documents"])
async def upload_document(file: UploadFile = File(..., description="PDF financial document")):
    """
    Upload and process a financial document.
    Extracts text, creates embeddings, runs intelligence extraction.
    Returns a document_id for subsequent queries.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_size = 0
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    tmp_path = upload_dir / file.filename

    with open(tmp_path, "wb") as f:
        content = await file.read()
        file_size = len(content)
        if file_size > settings.max_file_size_bytes:
            raise HTTPException(status_code=413, detail=f"File too large. Max {settings.max_file_size_mb}MB.")
        f.write(content)

    try:
        from src.ingestion.document_processor import process_document
        doc = process_document(tmp_path, run_intelligence=True)
        _documents[doc.document_id] = doc

        return UploadResponse(
            document_id=doc.document_id,
            filename=doc.filename,
            doc_type=doc.doc_type,
            company_name=doc.company_name,
            period=doc.period,
            page_count=doc.page_count,
            chunk_count=doc.chunk_count,
            sections=doc.sections,
            status=doc.status,
        )
    except Exception as e:
        log.error("upload.failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/documents/query", response_model=QueryResponse, tags=["Intelligence"])
async def query_document(request: QueryRequest):
    """
    Ask a question about an uploaded document.
    Uses RAG to retrieve relevant sections and GPT-4o to generate the answer.
    """
    from src.intelligence.rag_engine import RAGEngine
    engine = RAGEngine()
    result = engine.answer(
        document_id=request.document_id,
        question=request.question,
        section_filter=request.section_filter,
    )
    return QueryResponse(**result)


@app.get("/documents/{document_id}/metrics", tags=["Intelligence"])
async def get_metrics(document_id: str):
    """Extract structured financial metrics (revenue, EPS, margins, ratios)."""
    doc = _documents.get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if not doc.metrics:
        # Run on-demand if not already extracted
        from src.intelligence.metric_extractor import extract_metrics
        doc.metrics = extract_metrics(doc.full_text)
    return {"document_id": document_id, "metrics": doc.metrics}


@app.get("/documents/{document_id}/risks", tags=["Intelligence"])
async def get_risks(document_id: str):
    """Get scored and ranked risk factors from the document."""
    doc = _documents.get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"document_id": document_id, "risks": doc.risks, "total": len(doc.risks)}


@app.get("/documents/{document_id}/sentiment", tags=["Intelligence"])
async def get_sentiment(document_id: str):
    """Get per-section sentiment analysis and overall document tone."""
    from src.intelligence.sentiment_analyser import get_overall_sentiment
    doc = _documents.get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    overall = get_overall_sentiment(doc.sentiments)
    return {
        "document_id":     document_id,
        "overall":         overall,
        "by_section":      doc.sentiments,
    }


@app.post("/documents/compare", tags=["Intelligence"])
async def compare_documents(request: CompareRequest):
    """Compare two documents side by side — surfaces key changes."""
    doc1 = _documents.get(request.document_id_1)
    doc2 = _documents.get(request.document_id_2)

    if not doc1:
        raise HTTPException(status_code=404, detail=f"Document {request.document_id_1} not found.")
    if not doc2:
        raise HTTPException(status_code=404, detail=f"Document {request.document_id_2} not found.")

    from src.intelligence.comparator import compare_documents as do_compare
    result = do_compare(
        doc1_text=doc1.full_text,
        doc2_text=doc2.full_text,
        doc1_label=request.label_1 or doc1.filename,
        doc2_label=request.label_2 or doc2.filename,
    )
    return result
