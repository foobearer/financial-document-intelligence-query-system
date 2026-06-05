"""
src/api/main.py — FinDocIQ FastAPI Production API
───────────────────────────────────────────────────
Run:  uvicorn src.api.main:app --reload
Docs: http://localhost:8000/docs

All API routes are mounted under /api/* so the React frontend
can be served from the same origin in production (HF Spaces, etc.)
without a separate nginx proxy.
"""

import json
import dataclasses
from datetime import datetime, timezone
from pathlib import Path
from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import httpx

from src.api.schemas import (
    UploadResponse, QueryRequest, QueryResponse,
    CompareRequest, HealthResponse,
)
from src.utils.config import settings
from src.utils.logger import get_logger

log = get_logger(__name__)

# Directory where each document's data is persisted as a JSON file
_DOC_STORE_DIR = Path("data/documents")
_DOC_STORE_DIR.mkdir(parents=True, exist_ok=True)


# ── Persistence helpers ───────────────────────────────────────────────────────

def _doc_path(document_id: str) -> Path:
    return _DOC_STORE_DIR / f"{document_id}.json"


def _save_doc(doc) -> None:
    """Persist a ProcessedDocument to disk as JSON."""
    try:
        _doc_path(doc.document_id).write_text(
            json.dumps(dataclasses.asdict(doc), ensure_ascii=False),
            encoding="utf-8",
        )
    except Exception as e:
        log.warning("doc_store.save_failed", doc_id=doc.document_id, error=str(e))


def _load_docs() -> dict:
    """Load all persisted documents from disk into memory on startup."""
    from src.ingestion.document_processor import ProcessedDocument
    store = {}
    for path in _DOC_STORE_DIR.glob("*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            store[data["document_id"]] = ProcessedDocument(**data)
        except Exception as e:
            log.warning("doc_store.load_failed", path=str(path), error=str(e))
    if store:
        log.info("doc_store.loaded", count=len(store))
    return store


# In-memory store, pre-populated from disk on every startup
_documents: dict = _load_docs()


# ── Slack notification ────────────────────────────────────────────────────────

def _parse_user_agent(ua: str) -> str:
    browser = "Unknown browser"
    os_name = "Unknown OS"
    if "Chrome" in ua and "Edg" not in ua:
        browser = "Chrome"
    elif "Firefox" in ua:
        browser = "Firefox"
    elif "Safari" in ua and "Chrome" not in ua:
        browser = "Safari"
    elif "Edg" in ua:
        browser = "Edge"
    if "Windows" in ua:
        os_name = "Windows"
    elif "Macintosh" in ua or "Mac OS" in ua:
        os_name = "macOS"
    elif "Linux" in ua:
        os_name = "Linux"
    elif "iPhone" in ua or "iPad" in ua:
        os_name = "iOS"
    elif "Android" in ua:
        os_name = "Android"
    return f"{browser} on {os_name}"


async def _notify_slack(doc, client_ip: str, user_agent: str) -> None:
    if not settings.slack_webhook_url:
        return

    location = "Unknown"
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            geo = await client.get(f"http://ip-api.com/json/{client_ip}?fields=city,regionName,country,status")
            if geo.status_code == 200:
                data = geo.json()
                if data.get("status") == "success":
                    location = f"{data.get('city', '')}, {data.get('regionName', '')}, {data.get('country', '')}"
    except Exception:
        pass

    try:
        device = _parse_user_agent(user_agent)
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        payload = {
            "text": (
                f"📄 *New document uploaded on FinDocIQ*\n"
                f"{'─' * 35}\n"
                f"*File:* {doc.filename}\n"
                f"*Type:* {doc.doc_type or 'Unknown'}\n"
                f"*Company:* {doc.company_name or 'Unknown'}\n"
                f"*Pages:* {doc.page_count}  |  *Chunks:* {doc.chunk_count}\n\n"
                f"🌍 *Location:* {location}\n"
                f"🖥  *Device:* {device}\n"
                f"🕐 *Time:* {timestamp}"
            )
        }
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(settings.slack_webhook_url, json=payload)
    except Exception:
        pass


# ── App setup ─────────────────────────────────────────────────────────────────

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

# All API routes live under /api so they coexist with the React frontend
# on the same origin without a reverse proxy.
router = APIRouter(prefix="/api")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/health", response_model=HealthResponse, tags=["System"])
async def health():
    return HealthResponse(openai_configured=settings.openai_available)


@router.post("/documents/upload", response_model=UploadResponse, tags=["Documents"])
async def upload_document(request: Request, background_tasks: BackgroundTasks, file: UploadFile = File(..., description="PDF financial document")):
    """
    Upload and process a financial document.
    Extracts text, creates embeddings, runs intelligence extraction.
    Returns a document_id for subsequent queries.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    tmp_path = upload_dir / file.filename

    with open(tmp_path, "wb") as f:
        content = await file.read()
        if len(content) > settings.max_file_size_bytes:
            raise HTTPException(status_code=413, detail=f"File too large. Max {settings.max_file_size_mb}MB.")
        f.write(content)

    try:
        from src.ingestion.document_processor import process_document
        doc = process_document(tmp_path, run_intelligence=True)
        _documents[doc.document_id] = doc
        _save_doc(doc)  # persist to disk so server restarts don't lose it

        client_ip = request.headers.get("x-forwarded-for", request.client.host).split(",")[0].strip()
        user_agent = request.headers.get("user-agent", "")
        background_tasks.add_task(_notify_slack, doc, client_ip, user_agent)

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


@router.post("/documents/query", response_model=QueryResponse, tags=["Intelligence"])
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


@router.get("/documents/{document_id}/metrics", tags=["Intelligence"])
async def get_metrics(document_id: str):
    """Extract structured financial metrics (revenue, EPS, margins, ratios)."""
    doc = _documents.get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if not doc.metrics:
        from src.intelligence.metric_extractor import extract_metrics
        doc.metrics = extract_metrics(doc.full_text)
        _save_doc(doc)
    return {"document_id": document_id, "metrics": doc.metrics}


@router.get("/documents/{document_id}/risks", tags=["Intelligence"])
async def get_risks(document_id: str):
    """Get scored and ranked risk factors from the document."""
    doc = _documents.get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"document_id": document_id, "risks": doc.risks, "total": len(doc.risks)}


@router.get("/documents/{document_id}/sentiment", tags=["Intelligence"])
async def get_sentiment(document_id: str):
    """Get per-section sentiment analysis and overall document tone."""
    from src.intelligence.sentiment_analyser import get_overall_sentiment
    doc = _documents.get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    overall = get_overall_sentiment(doc.sentiments)
    return {
        "document_id": document_id,
        "overall":     overall,
        "by_section":  doc.sentiments,
    }


@router.post("/documents/compare", tags=["Intelligence"])
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


app.include_router(router)


# ── React frontend (production) ───────────────────────────────────────────────
# Serves the built React app when frontend/dist exists (i.e. in production /
# HF Spaces). In local Docker dev the frontend container handles this instead.

_DIST = Path("frontend/dist")

if _DIST.exists():
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        file = _DIST / full_path
        if file.exists() and file.is_file():
            return FileResponse(file)
        return FileResponse(_DIST / "index.html")
