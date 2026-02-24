"""
Serviço de embeddings vetoriais para busca semântica.
Usa text-embedding-004 (Gemini) com 768 dimensões.
Armazena em pgvector via Supabase.
"""

import logging
from typing import Optional

from config import get_settings
from google import genai

logger = logging.getLogger("enrichment-engine.embedding")
settings = get_settings()


class EmbeddingService:
    """Gera embeddings e gerencia busca semântica via pgvector."""

    def __init__(self, supabase_client):
        """
        Args:
            supabase_client: Raw Supabase client (from supabase-py create_client).
                             Use get_supabase_service()._get_client() to obtain.
        """
        self.supabase = supabase_client
        self._client = None

    def _get_client(self):
        if not self._client:
            self._client = genai.Client(api_key=settings.gemini_api_key)
        return self._client

    async def generate_embedding(self, text: str) -> list[float]:
        """Gera embedding de 768 dimensões para um texto."""
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")

        # Truncar texto longo (embedding model tem limite)
        truncated = text[:8000]

        client = self._get_client()
        result = client.models.embed_content(
            model=f"models/{settings.embedding_model}",
            contents=[truncated],
        )
        return result.embeddings[0].values

    def _chunk_text(self, text: str, max_tokens: int = 500, overlap: int = 50) -> list[str]:
        """Split texto em chunks por parágrafos, respeitando max_tokens."""
        paragraphs = text.split("\n\n")
        chunks = []
        current_chunk = []
        current_len = 0

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            para_tokens = len(para.split())

            if current_len + para_tokens > max_tokens and current_chunk:
                chunks.append("\n\n".join(current_chunk))
                # Overlap: keep last paragraph
                if overlap > 0 and current_chunk:
                    last = current_chunk[-1]
                    current_chunk = [last]
                    current_len = len(last.split())
                else:
                    current_chunk = []
                    current_len = 0

            current_chunk.append(para)
            current_len += para_tokens

        if current_chunk:
            chunks.append("\n\n".join(current_chunk))

        return chunks if chunks else [text[:2000]]

    async def index_document(
        self,
        doc_id: int,
        markdown: str,
        assistido_id: Optional[int] = None,
        processo_id: Optional[int] = None,
        metadata: Optional[dict] = None,
    ) -> int:
        """Indexa um documento em chunks com embeddings."""
        chunks = self._chunk_text(markdown)
        count = 0

        # Limpar embeddings anteriores deste documento
        self.supabase.table("embeddings").delete().match(
            {"entity_type": "documento", "entity_id": doc_id}
        ).execute()

        for i, chunk in enumerate(chunks):
            try:
                embedding = await self.generate_embedding(chunk)
                self.supabase.table("embeddings").insert({
                    "entity_type": "documento",
                    "entity_id": doc_id,
                    "assistido_id": assistido_id,
                    "processo_id": processo_id,
                    "chunk_index": i,
                    "content_text": chunk[:5000],
                    "embedding": embedding,
                    "metadata": metadata or {},
                }).execute()
                count += 1
            except Exception as e:
                logger.error("Failed to index chunk %d of doc %d: %s", i, doc_id, e)

        logger.info("Indexed %d chunks for documento %d", count, doc_id)
        return count

    async def index_entity(
        self,
        entity_type: str,
        entity_id: int,
        text: str,
        assistido_id: Optional[int] = None,
        processo_id: Optional[int] = None,
        metadata: Optional[dict] = None,
    ) -> bool:
        """Indexa uma entidade curta (anotacao, movimentacao, case_fact)."""
        if not text or len(text.strip()) < 10:
            return False

        try:
            embedding = await self.generate_embedding(text)

            # Upsert: limpar anterior
            self.supabase.table("embeddings").delete().match(
                {"entity_type": entity_type, "entity_id": entity_id}
            ).execute()

            self.supabase.table("embeddings").insert({
                "entity_type": entity_type,
                "entity_id": entity_id,
                "assistido_id": assistido_id,
                "processo_id": processo_id,
                "chunk_index": 0,
                "content_text": text[:5000],
                "embedding": embedding,
                "metadata": metadata or {},
            }).execute()
            return True
        except Exception as e:
            logger.error("Failed to index %s %d: %s", entity_type, entity_id, e)
            return False

    async def search(
        self,
        query: str,
        filters: Optional[dict] = None,
        limit: int = 20,
    ) -> list[dict]:
        """Busca semântica via pgvector RPC."""
        query_embedding = await self.generate_embedding(query)
        filters = filters or {}

        rpc_params = {
            "query_embedding": query_embedding,
            "match_limit": limit,
        }

        if filters.get("assistido_id"):
            rpc_params["filter_assistido_id"] = filters["assistido_id"]
        if filters.get("processo_id"):
            rpc_params["filter_processo_id"] = filters["processo_id"]
        if filters.get("entity_types"):
            rpc_params["filter_entity_types"] = filters["entity_types"]

        result = self.supabase.rpc("search_embeddings", rpc_params).execute()
        return result.data or []
