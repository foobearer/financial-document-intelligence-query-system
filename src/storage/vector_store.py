"""
src/storage/vector_store.py — ChromaDB Vector Store
──────────────────────────────────────────────────────
Manages document embeddings in ChromaDB.

The RAG pipeline works like this:
  1. Document text is split into chunks
  2. Each chunk is converted to a vector (embedding) by OpenAI
  3. Vectors are stored in ChromaDB alongside the original text
  4. At query time, the question is embedded the same way
  5. ChromaDB finds the chunks whose vectors are closest to the question
  6. Those chunks are passed to GPT-4o as context

Why ChromaDB?
  - Runs locally (no cloud subscription needed)
  - Persists to disk — survives restarts
  - Fast approximate nearest-neighbour search
  - Simple Python API
"""

from pathlib import Path
from src.utils.config import settings
from src.utils.logger import get_logger

log = get_logger(__name__)


class VectorStore:
    """
    Manages ChromaDB collections for document embeddings.

    One collection per document, named by document_id.
    This keeps different documents' embeddings separated and
    allows efficient per-document retrieval.
    """

    def __init__(self):
        import chromadb
        persist_dir = Path(settings.chroma_persist_dir)
        persist_dir.mkdir(parents=True, exist_ok=True)

        self._client = chromadb.PersistentClient(path=str(persist_dir))
        log.info("vector_store.init", persist_dir=str(persist_dir))

    def _get_embedding_function(self):
        """
        Return the embedding function — OpenAI if available, local otherwise.

        OpenAI text-embedding-3-small: 1536 dimensions, very high quality.
        SentenceTransformers fallback: runs locally, no API cost.
        """
        if settings.openai_available:
            from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction
            return OpenAIEmbeddingFunction(
                api_key=settings.openai_api_key,
                model_name=settings.openai_embedding_model,
            )
        else:
            from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
            return SentenceTransformerEmbeddingFunction(
                model_name="all-MiniLM-L6-v2"
            )

    def add_document(self, document_id: str, chunks: list[str], metadatas: list[dict]) -> None:
        """
        Store document chunks and their embeddings.

        Args:
            document_id: Unique identifier for the document
            chunks:      List of text chunks (after splitting)
            metadatas:   List of metadata dicts (one per chunk)
                         e.g. {"section": "Risk Factors", "page": 42}
        """
        collection = self._client.get_or_create_collection(
            name=f"doc_{document_id}",
            embedding_function=self._get_embedding_function(),
            metadata={"hnsw:space": "cosine"},  # Cosine similarity for text
        )

        # ChromaDB requires string IDs
        ids = [f"{document_id}_chunk_{i}" for i in range(len(chunks))]

        # Add in batches of 100 to avoid API rate limits
        batch_size = 100
        for i in range(0, len(chunks), batch_size):
            collection.add(
                documents=chunks[i:i + batch_size],
                metadatas=metadatas[i:i + batch_size],
                ids=ids[i:i + batch_size],
            )
            log.info("vector_store.batch_added",
                     doc_id=document_id, batch=i // batch_size + 1,
                     total_chunks=len(chunks))

        log.info("vector_store.document_added",
                 doc_id=document_id, total_chunks=len(chunks))

    def query(
        self,
        document_id: str,
        query_text: str,
        n_results: int | None = None,
        where: dict | None = None,
    ) -> list[dict]:
        """
        Find the most relevant chunks for a query.

        Args:
            document_id: Which document to search
            query_text:  The user's question
            n_results:   How many chunks to return (default: settings.retrieval_k)
            where:       Optional metadata filter e.g. {"section": "Risk Factors"}

        Returns:
            List of {"text": str, "metadata": dict, "distance": float} dicts
            Ordered by relevance (closest first)
        """
        n_results = n_results or settings.retrieval_k

        try:
            collection = self._client.get_collection(
                name=f"doc_{document_id}",
                embedding_function=self._get_embedding_function(),
            )
        except Exception:
            log.warning("vector_store.collection_not_found", doc_id=document_id)
            return []

        results = collection.query(
            query_texts=[query_text],
            n_results=min(n_results, collection.count()),
            where=where,
            include=["documents", "metadatas", "distances"],
        )

        return [
            {
                "text":     results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "distance": results["distances"][0][i],
            }
            for i in range(len(results["documents"][0]))
        ]

    def delete_document(self, document_id: str) -> None:
        """Remove all embeddings for a document."""
        try:
            self._client.delete_collection(f"doc_{document_id}")
            log.info("vector_store.deleted", doc_id=document_id)
        except Exception as e:
            log.warning("vector_store.delete_failed", doc_id=document_id, error=str(e))

    def list_documents(self) -> list[str]:
        """Return list of all document IDs in the store."""
        collections = self._client.list_collections()
        return [c.name.replace("doc_", "") for c in collections]
