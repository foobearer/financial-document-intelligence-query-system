"""
src/utils/config.py — Application Configuration
─────────────────────────────────────────────────
All settings loaded from environment variables / .env file.
"""

from functools import lru_cache
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── OpenAI ────────────────────────────────────────────────────────────────
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    # GPT-4o: best quality for financial document understanding
    # gpt-4o-mini: cheaper, still very good for structured extraction

    openai_embedding_model: str = "text-embedding-3-small"
    # text-embedding-3-small: 1536 dimensions, cheap, excellent quality

    # ── Storage ───────────────────────────────────────────────────────────────
    chroma_persist_dir: str = "data/chroma"
    # ChromaDB stores vector embeddings here — persists between restarts

    sqlite_db_path: str = "data/metadata.db"
    # SQLite stores document metadata, section info, extracted metrics

    upload_dir: str = "data/uploads"
    max_file_size_mb: int = Field(50, ge=1, le=200)

    # ── RAG ───────────────────────────────────────────────────────────────────
    chunk_size: int = 1000
    # Characters per chunk. Financial docs need larger chunks than typical
    # text because context is important (a risk factor spans multiple sentences)

    chunk_overlap: int = 200
    # Overlap between chunks ensures sentences at boundaries aren't split

    retrieval_k: int = 5
    # Number of chunks to retrieve per query

    # ── Notifications ─────────────────────────────────────────────────────────
    slack_webhook_url: str = ""

    # ── App ───────────────────────────────────────────────────────────────────
    log_level: str = "INFO"
    app_name: str = "FinDocIQ — Financial Document Intelligence & Query System"

    @property
    def openai_available(self) -> bool:
        return bool(self.openai_api_key and self.openai_api_key.startswith("sk-"))

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
