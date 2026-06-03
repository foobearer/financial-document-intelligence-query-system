"""
src/intelligence/rag_engine.py — RAG Chatbot
──────────────────────────────────────────────
The conversational Q&A engine. Uses ChromaDB for retrieval
and GPT-4o for answer generation with conversation memory.
"""

import json
from src.utils.config import settings
from src.utils.prompts import rag_system_prompt
from src.storage.vector_store import VectorStore
from src.utils.logger import get_logger

log = get_logger(__name__)


class RAGEngine:
    """
    Retrieval-Augmented Generation chatbot for financial documents.

    How it works:
      1. Retrieve: find the k most relevant chunks for the question
      2. Augment: prepend those chunks to the GPT-4o prompt as context
      3. Generate: GPT-4o answers using only the retrieved context
    """

    def __init__(self):
        self._vector_store = VectorStore()
        self._conversation_history: list[dict] = []

    def answer(
        self,
        document_id: str,
        question: str,
        section_filter: str | None = None,
        use_history: bool = True,
    ) -> dict:
        """
        Answer a question about a document.

        Args:
            document_id:    Which document to query
            question:       The user's question
            section_filter: Optionally restrict to a specific section
                            e.g. "Risk Factors", "MD&A"
            use_history:    Include conversation history for follow-up questions

        Returns:
            {"answer": str, "sources": list[dict], "model": str}
        """
        if not settings.openai_available:
            return {
                "answer": "OpenAI API key required for Q&A. Set OPENAI_API_KEY in .env",
                "sources": [],
                "model": "none",
            }

        # Retrieve relevant chunks
        where = {"section": section_filter} if section_filter else None
        chunks = self._vector_store.query(
            document_id=document_id,
            query_text=question,
            n_results=settings.retrieval_k,
            where=where,
        )

        if not chunks:
            return {
                "answer": "No relevant content found. Please upload a document first.",
                "sources": [],
                "model": settings.openai_model,
            }

        # Build context from retrieved chunks
        context = "\n\n---\n\n".join(
            f"[{c['metadata'].get('section', 'Unknown')}]\n{c['text']}"
            for c in chunks
        )

        # Build messages with optional conversation history
        messages = [{"role": "system", "content": rag_system_prompt()}]

        if use_history and self._conversation_history:
            messages.extend(self._conversation_history[-6:])  # Last 3 exchanges

        messages.append({
            "role": "user",
            "content": f"Context from document:\n\n{context}\n\nQuestion: {question}"
        })

        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            max_tokens=1500,
            temperature=0.1,  # Low temp for factual financial answers
        )

        answer = response.choices[0].message.content

        # Update conversation history
        self._conversation_history.extend([
            {"role": "user",      "content": question},
            {"role": "assistant", "content": answer},
        ])

        return {
            "answer": answer,
            "sources": [
                {"section": c["metadata"].get("section"), "relevance": round(1 - c["distance"], 3)}
                for c in chunks
            ],
            "model": settings.openai_model,
        }

    def reset_history(self) -> None:
        """Clear conversation history for a new session."""
        self._conversation_history = []
