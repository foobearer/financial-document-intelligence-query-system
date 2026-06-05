---
title: FinDocIQ
emoji: 📊
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
---

# FinDocIQ — Financial Document Intelligence & Query System

> **Portfolio Project** by [Joycee Catamora Paragas](https://joycee.dev)  
> **Stack:** Python · LangChain · ChromaDB · OpenAI GPT-4o · FastAPI · React · Vite · Tailwind CSS

---

---

## What This Is and Why It Matters

Financial professionals spend hours manually reading SEC filings, earnings transcripts,
and analyst reports to extract key numbers, identify risks, and compare performance
across periods. FinDocIQ automates all of that.

This is not just a RAG chatbot with a finance skin. It is a **domain-specific
intelligence system** that understands the structure of financial documents and
produces structured, actionable output.

### What it does that generic RAG chatbots don't

| Capability | Generic RAG | FinDocIQ |
|---|---|---|
| Answer questions about documents | ✅ | ✅ |
| Understand SEC filing structure | ❌ | ✅ |
| Extract financial metrics (revenue, EPS, ratios) | ❌ | ✅ |
| Score risk factors by severity | ❌ | ✅ |
| Sentiment analysis per section | ❌ | ✅ |
| Compare two documents (Q1 vs Q2) | ❌ | ✅ |
| Return structured JSON for downstream use | ❌ | ✅ |
| Production REST API | ❌ | ✅ |

---

## The Problem It Solves

An analyst receives a company's 10-K filing — a document that can be 200+ pages.
They need to:

1. Find the revenue, net income, EPS, and debt figures
2. Identify the top risk factors and assess their severity
3. Compare this year's numbers to last year's
4. Get a quick read on management tone — are they cautious or confident?

FinDocIQ does all four in under 60 seconds.

---

## Architecture

```
┌─────────────────────────────────┐
│   React + Vite Frontend (UI)    │  ← The real interface
│   frontend/                     │
└────────────┬────────────────────┘
             │ /api/*
┌────────────▼────────────────────┐
│   FastAPI Backend               │  ← REST API + serves React in production
│   src/api/main.py               │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│   Intelligence Layer            │
│   src/intelligence/             │
│   LangChain · ChromaDB · GPT-4o │
└─────────────────────────────────┘
```

---

## Project Structure

```
findociq/
│
├── README.md
├── requirements.txt             ← Python dependencies
├── .env.example                 ← API key configuration
├── Makefile
├── docker-compose.yml           ← Local dev (frontend + api as separate containers)
├── Dockerfile                   ← Python API image (used by docker-compose)
├── Dockerfile.spaces            ← Single-container build for Hugging Face Spaces
│
├── frontend/                    ← React + Vite + Tailwind UI
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api/client.ts        ← All API calls to /api/*
│   │   ├── components/
│   │   └── types/
│   ├── Dockerfile               ← nginx image for local dev only
│   └── package.json
│
├── src/
│   ├── ingestion/
│   │   ├── pdf_parser.py        ← Extract text + tables from PDFs
│   │   ├── doc_classifier.py    ← Detect: 10-K, 10-Q, 8-K, transcript, report
│   │   └── section_splitter.py  ← Split filing into semantic sections
│   │
│   ├── intelligence/
│   │   ├── rag_engine.py        ← RAG chatbot (ChromaDB + LangChain)
│   │   ├── metric_extractor.py  ← Extract revenue, EPS, ratios, guidance
│   │   ├── risk_scorer.py       ← Identify + score risk factors
│   │   ├── sentiment_analyser.py
│   │   └── comparator.py        ← Cross-document / cross-period comparison
│   │
│   ├── storage/
│   │   ├── vector_store.py      ← ChromaDB vector store management
│   │   └── metadata_store.py    ← SQLite for document metadata
│   │
│   ├── api/
│   │   ├── main.py              ← FastAPI app (all routes under /api/*)
│   │   └── schemas.py           ← Pydantic request/response models
│   │
│   └── utils/
│       ├── prompts.py           ← All LLM prompts in one place
│       └── logger.py
│
└── tests/
    ├── test_ingestion.py
    ├── test_intelligence.py
    └── test_api.py
```

---

## Quick Start (Local Dev)

### Prerequisites
- Python 3.10+
- Node.js 20+
- Docker + Docker Compose
- OpenAI API key — **required** · [get one here](https://platform.openai.com/api-keys)

### Step 1 — Setup

```bash
git clone https://github.com/foobearer/findociq.git
cd findociq
cp .env.example .env
# Edit .env — add your OPENAI_API_KEY
```

### Step 2 — Run with Docker (recommended)

```bash
docker-compose up
```

This starts two containers:

| Container | URL | What it is |
|-----------|-----|------------|
| `frontend-1` | http://localhost:8080 | React UI (nginx) |
| `api-1` | http://localhost:8000 | FastAPI backend |

Open **http://localhost:8080** to use the app. The React frontend proxies `/api/*`
calls to the FastAPI container automatically.

### Step 3 — Run without Docker

```bash
# Terminal 1 — Python API
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn src.api.main:app --reload
# API at http://localhost:8000/api/docs

# Terminal 2 — React frontend
cd frontend
npm install
npm run dev
# UI at http://localhost:3000
```

### Run tests

```bash
pytest tests/ -v
```

---

## Deploying to Hugging Face Spaces (Free)

FinDocIQ ships with `Dockerfile.spaces` — a single-container build that compiles
the React frontend and serves it via FastAPI on port 7860 (HF Spaces default).
No nginx, no second container.

### Steps

1. Go to [huggingface.co/new-space](https://huggingface.co/new-space)
2. Choose **Docker** as the SDK
3. Link your GitHub repo (or push directly to the HF Space repo)
4. Rename `Dockerfile.spaces` → `Dockerfile` in the Space repo
5. In the Space **Settings → Repository secrets**, add:
   ```
   OPENAI_API_KEY=sk-...
   ```
6. HF Spaces builds and deploys automatically

Your app will be live at `https://huggingface.co/spaces/your-username/findociq`.

---

## API Endpoints

All routes are prefixed with `/api`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/health` | Health check |
| `POST` | `/api/documents/upload` | Upload and process a financial document |
| `POST` | `/api/documents/query` | Ask a question about an uploaded document |
| `GET`  | `/api/documents/{id}/metrics` | Extract structured financial metrics |
| `GET`  | `/api/documents/{id}/risks` | Get scored risk factors |
| `GET`  | `/api/documents/{id}/sentiment` | Per-section sentiment analysis |
| `POST` | `/api/documents/compare` | Compare two documents side by side |

Interactive docs available at `/api/docs` when running locally.

---

## Example Usage

```python
import httpx

# Upload a document
with open("apple_10k_2024.pdf", "rb") as f:
    response = httpx.post(
        "http://localhost:8000/api/documents/upload",
        files={"file": f}
    )
doc_id = response.json()["document_id"]

# Ask a question
response = httpx.post(
    "http://localhost:8000/api/documents/query",
    json={"document_id": doc_id, "question": "What were the main revenue drivers?"}
)
print(response.json()["answer"])

# Get structured metrics
metrics = httpx.get(f"http://localhost:8000/api/documents/{doc_id}/metrics")
print(metrics.json())
```

---

## Key Technical Decisions

### Why LangChain for RAG?

LangChain provides battle-tested RAG primitives — text splitting, embedding,
retrieval, and chain composition. Building this from scratch would take weeks;
LangChain lets us focus on the domain-specific intelligence layer.

### Why ChromaDB for the vector store?

ChromaDB runs locally with zero infrastructure — no server to manage, no extra
API costs. It stores embeddings and metadata in a local directory. Embeddings are
generated via OpenAI's `text-embedding-3-small` model.

### Why section-aware splitting?

Generic RAG splits text at arbitrary character boundaries. Financial documents
have semantic structure: Management Discussion & Analysis, Risk Factors, Financial
Statements, Notes to Accounts. Splitting at these boundaries dramatically improves
retrieval quality because the model retrieves coherent sections, not fragments.

### Why serve React from FastAPI in production?

In deployment (HF Spaces), running a separate nginx container alongside FastAPI
requires a process manager or two services. FastAPI can serve the built React
static files directly with a catch-all route — same origin, one container,
zero nginx config.

---

## Sample Documents to Test With

Real public SEC filings are available free at:
- **SEC EDGAR**: https://www.sec.gov/cgi-bin/browse-edgar
- **Apple 10-K**: Search EDGAR for CIK 0000320193
- **Tesla 10-K**: Search EDGAR for CIK 0001318605

Download any 10-K or 10-Q as a PDF and upload it to FinDocIQ.

---

## Licence

MIT — free to use, modify, and share.

---

*Built by [Joycee Catamora Paragas](https://joycee.dev) · [github.com/foobearer](https://github.com/foobearer)*
