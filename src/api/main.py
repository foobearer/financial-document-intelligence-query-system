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