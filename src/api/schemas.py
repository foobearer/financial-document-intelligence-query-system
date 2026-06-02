"""
src/api/schemas.py — Pydantic Request/Response Models
"""

from pydantic import BaseModel, Field
from typing import Optional


class UploadResponse(BaseModel):
    document_id: str
    filename: str
    doc_type: str
    company_name: Optional[str] = None
    period: Optional[str] = None
    page_count: int
    chunk_count: int
    sections: list[str]
    status: str


class QueryRequest(BaseModel):
    document_id: str
    question: str = Field(..., min_length=3, max_length=1000)
    section_filter: Optional[str] = None


class QueryResponse(BaseModel):
    answer: str
    sources: list[dict]
    model: str


class CompareRequest(BaseModel):
    document_id_1: str
    document_id_2: str
    label_1: Optional[str] = "Document 1"
    label_2: Optional[str] = "Document 2"


class HealthResponse(BaseModel):
    status: str = "ok"
    openai_configured: bool
    version: str = "1.0.0"
