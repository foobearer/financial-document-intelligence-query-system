# FinDocIQ — Financial Document Intelligence & Query System

> **Portfolio Project** by [Joycee Catamora Paragas](https://joycee.dev)  
> **Stack:** Python · LangChain · ChromaDB · OpenAI · FastAPI · Streamlit

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

## Project Structure

```
findociq/
│
├── README.md                        ← You are here
├── requirements.txt                 ← All dependencies pinned
├── .env.example                     ← API key configuration
├── Makefile                         ← One-command shortcuts
├── docker-compose.yml
│
├── src/
│   ├── ingestion/
│   │   ├── __init__.py
│   │   ├── pdf_parser.py            ← Extract text + tables from PDFs
│   │   ├── doc_classifier.py        ← Detect: 10-K, 10-Q, 8-K, transcript, report
│   │   └── section_splitter.py      ← Split filing into semantic sections
│   │
│   ├── intelligence/
│   │   ├── __init__.py
│   │   ├── rag_engine.py            ← RAG chatbot (ChromaDB + LangChain)
│   │   ├── metric_extractor.py      ← Extract revenue, EPS, ratios, guidance
│   │   ├── risk_scorer.py           ← Identify + score risk factors
│   │   ├── sentiment_analyser.py    ← Per-section financial sentiment
│   │   └── comparator.py            ← Cross-document / cross-period comparison
│   │
│   ├── storage/
│   │   ├── __init__.py
│   │   ├── vector_store.py          ← ChromaDB vector store management
│   │   └── metadata_store.py        ← SQLite for document metadata
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── main.py                  ← FastAPI app
│   │   └── schemas.py               ← Pydantic request/response models
│   │
│   └── utils/
│       ├── __init__.py
│       ├── prompts.py               ← All LLM prompts in one place
│       └── logger.py
│
├── streamlit_app/
│   └── app.py                       ← Interactive Streamlit demo
│
├── tests/
│   ├── test_ingestion.py
│   ├── test_intelligence.py
│   └── test_api.py
│
└── data/
    └── sample_docs/                 ← Sample PDFs for testing
        └── README.md
```

---

## Quick Start

### Prerequisites
- Python 3.10+
- OpenAI API key (get one at https://platform.openai.com/api-keys)
- ~500MB disk space for ChromaDB and model cache

### Step 1 — Setup

```bash
git clone https://github.com/foobearer/findociq.git
cd findociq
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env — add your OPENAI_API_KEY
```

### Step 2 — Run the Streamlit demo (easiest)

```bash
streamlit run streamlit_app/app.py
# Opens at http://localhost:8501
```

Upload any SEC filing PDF and start analysing.

### Step 3 — Run the FastAPI production API

```bash
uvicorn src.api.main:app --reload
# API at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### Step 4 — Run tests

```bash
pytest tests/ -v
```

### Docker (everything at once)

```bash
cp .env.example .env   # add your API key
docker-compose up
# Streamlit: http://localhost:8501
# FastAPI:   http://localhost:8000
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/documents/upload` | Upload and process a financial document |
| `POST` | `/documents/query` | Ask a question about uploaded documents |
| `GET`  | `/documents/{id}/metrics` | Extract structured financial metrics |
| `GET`  | `/documents/{id}/risks` | Get scored risk factors |
| `GET`  | `/documents/{id}/sentiment` | Per-section sentiment analysis |
| `POST` | `/documents/compare` | Compare two documents side by side |
| `GET`  | `/health` | Health check |

---

## Example Usage

### Upload and query a 10-K

```python
import httpx

# Upload the document
with open("apple_10k_2024.pdf", "rb") as f:
    response = httpx.post(
        "http://localhost:8000/documents/upload",
        files={"file": f}
    )
doc_id = response.json()["document_id"]

# Ask a question
response = httpx.post(
    "http://localhost:8000/documents/query",
    json={"document_id": doc_id, "question": "What were the main revenue drivers?"}
)
print(response.json()["answer"])

# Get structured metrics
metrics = httpx.get(f"http://localhost:8000/documents/{doc_id}/metrics")
print(metrics.json())
# {
#   "revenue": {"value": 383285, "unit": "million USD", "period": "FY2023"},
#   "net_income": {"value": 96995, "unit": "million USD", "period": "FY2023"},
#   "eps_diluted": {"value": 6.13, "unit": "USD"},
#   "gross_margin": {"value": 0.441, "unit": "ratio"},
#   ...
# }
```

---

## Key Technical Decisions

### Why LangChain for RAG?

LangChain provides battle-tested RAG primitives — text splitting, embedding,
retrieval, and chain composition. Building this from scratch would take weeks;
LangChain lets us focus on the domain-specific intelligence layer.

### Why ChromaDB for the vector store?

ChromaDB runs locally with zero infrastructure — no server to manage, no API
costs. It stores embeddings and metadata in a local directory. For a portfolio
project, this is ideal: anyone can clone the repo and run it immediately.

### Why section-aware splitting?

Generic RAG splits text at arbitrary character boundaries. Financial documents
have semantic structure: Management Discussion & Analysis, Risk Factors, Financial
Statements, Notes to Accounts. Splitting at these boundaries dramatically improves
retrieval quality because the model retrieves coherent sections, not fragments.

### Why two interfaces?

Streamlit is the fastest way to demo the system visually — great for portfolio
presentations and interviews. FastAPI is what you'd actually ship in production.
Having both shows you understand the difference between a demo and a system.

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
