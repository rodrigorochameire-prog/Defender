"""
Servico de embeddings para documentos com chunking inteligente.
Usa OpenAI text-embedding-3-small (1536 dimensions).
Armazena na tabela document_embeddings via Supabase REST.
Busca hibrida: semantica (pgvector) + texto (pg_trgm).
"""

import json
import logging
import re
from typing import Optional

import httpx

from config import get_settings

logger = logging.getLogger("enrichment-engine.document-embedding")
settings = get_settings()

CHUNK_SIZE = 500  # ~500 words per chunk
CHUNK_OVERLAP = 50  # ~50 words overlap
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536


class DocumentEmbeddingService:
    """Gera embeddings OpenAI e gerencia busca hibrida via document_embeddings."""

    def __init__(self):
        self.openai_api_key = settings.openai_api_key
        self.supabase_url = settings.supabase_url
        self.supabase_key = settings.supabase_service_role_key

    @property
    def available(self) -> bool:
        return bool(self.openai_api_key and self.supabase_url and self.supabase_key)

    # ── Chunking ────────────────────────────────────────────────

    def chunk_text(self, text: str) -> list[dict]:
        """Split text into overlapping chunks by paragraph boundaries."""
        # Split by double newlines (paragraphs) or speaker changes
        paragraphs = re.split(
            r"\n\n+|\n(?=Speaker \d+:)|(?=\*\*Speaker)",
            text,
        )
        paragraphs = [p.strip() for p in paragraphs if p.strip() and len(p.strip()) > 20]

        chunks: list[dict] = []
        current_chunk: list[str] = []
        current_words = 0

        for para in paragraphs:
            words = len(para.split())

            if current_words + words > CHUNK_SIZE and current_chunk:
                chunk_text = "\n\n".join(current_chunk)
                chunks.append(
                    {
                        "index": len(chunks),
                        "text": chunk_text,
                        "word_count": current_words,
                    }
                )

                # Keep last paragraph for overlap
                if len(current_chunk) > 1:
                    overlap_para = current_chunk[-1]
                    current_chunk = [overlap_para, para]
                    current_words = len(overlap_para.split()) + words
                else:
                    current_chunk = [para]
                    current_words = words
            else:
                current_chunk.append(para)
                current_words += words

        # Don't forget the last chunk
        if current_chunk:
            chunk_text = "\n\n".join(current_chunk)
            chunks.append(
                {
                    "index": len(chunks),
                    "text": chunk_text,
                    "word_count": current_words,
                }
            )

        return chunks

    # ── OpenAI Embeddings ───────────────────────────────────────

    async def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a batch of texts using OpenAI API."""
        if not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY not set")

        # Truncate very long texts (model limit ~8191 tokens)
        truncated = [t[:15000] for t in texts]

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {self.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": EMBEDDING_MODEL,
                    "input": truncated,
                },
            )

            if resp.status_code != 200:
                raise Exception(
                    f"OpenAI embeddings failed: {resp.status_code} {resp.text[:500]}"
                )

            data = resp.json()
            # Sort by index to maintain order
            embeddings_data = sorted(data["data"], key=lambda x: x["index"])
            return [e["embedding"] for e in embeddings_data]

    # ── Embed Document ──────────────────────────────────────────

    async def embed_document(
        self,
        file_id: int,
        assistido_id: Optional[int],
        text: str,
        metadata: Optional[dict] = None,
    ) -> int:
        """Chunk a document, generate embeddings, and store in database."""
        if not self.available:
            raise ValueError("Document embedding service not configured")

        # Chunk the text
        chunks = self.chunk_text(text)
        if not chunks:
            logger.info("No chunks generated for file %d", file_id)
            return 0

        # Generate embeddings in batches of 50
        all_embeddings: list[list[float]] = []
        texts = [c["text"] for c in chunks]

        batch_size = 50
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i : i + batch_size]
            batch_embeddings = await self.generate_embeddings(batch_texts)
            all_embeddings.extend(batch_embeddings)

        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            # Delete existing embeddings for this file
            await client.delete(
                f"{self.supabase_url}/rest/v1/document_embeddings?file_id=eq.{file_id}",
                headers=headers,
            )

            # Insert new embeddings in batches of 10
            inserted = 0
            rows = []
            for chunk, embedding in zip(chunks, all_embeddings):
                row = {
                    "file_id": file_id,
                    "assistido_id": assistido_id,
                    "chunk_index": chunk["index"],
                    "chunk_text": chunk["text"],
                    "embedding": json.dumps(embedding),
                    "metadata": json.dumps(metadata or {}),
                }
                rows.append(row)

            for i in range(0, len(rows), 10):
                batch = rows[i : i + 10]
                resp = await client.post(
                    f"{self.supabase_url}/rest/v1/document_embeddings",
                    headers=headers,
                    json=batch,
                )
                if resp.status_code >= 400:
                    logger.error(
                        "Batch insert error: %d %s",
                        resp.status_code,
                        resp.text[:300],
                    )
                else:
                    inserted += len(batch)

        logger.info("Stored %d chunks for file %d", inserted, file_id)
        return inserted

    # ── Hybrid Search ───────────────────────────────────────────

    async def search(
        self,
        query: str,
        assistido_id: Optional[int] = None,
        threshold: float = 0.3,
        limit: int = 20,
    ) -> list[dict]:
        """Search documents using hybrid semantic + text search via RPC."""
        if not self.available:
            raise ValueError("Document embedding service not configured")

        # Generate query embedding
        embeddings = await self.generate_embeddings([query])
        query_embedding = embeddings[0]

        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.supabase_url}/rest/v1/rpc/search_documents",
                headers=headers,
                json={
                    "query_embedding": json.dumps(query_embedding),
                    "query_text": query,
                    "match_assistido_id": assistido_id,
                    "match_threshold": threshold,
                    "match_count": limit,
                },
            )

            if resp.status_code != 200:
                logger.error("Search error: %d %s", resp.status_code, resp.text[:300])
                return []

            return resp.json()

    # ── Get Status ──────────────────────────────────────────────

    async def get_status(self, file_id: int) -> dict:
        """Get embedding status for a file."""
        if not self.available:
            return {"hasEmbeddings": False, "chunkCount": 0}

        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Prefer": "count=exact",
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{self.supabase_url}/rest/v1/document_embeddings?file_id=eq.{file_id}&select=id",
                headers={
                    **headers,
                    "Range-Unit": "items",
                    "Range": "0-0",
                },
            )

            if resp.status_code >= 400:
                return {"hasEmbeddings": False, "chunkCount": 0}

            # Content-Range header gives the count
            content_range = resp.headers.get("content-range", "")
            count = 0
            if "/" in content_range:
                total = content_range.split("/")[-1]
                if total != "*":
                    count = int(total)

            return {"hasEmbeddings": count > 0, "chunkCount": count}


def get_document_embedding_service() -> DocumentEmbeddingService:
    """Factory for DocumentEmbeddingService."""
    return DocumentEmbeddingService()
