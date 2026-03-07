"""
POST /api/embed  — Indexa documento em chunks + embeddings (background).
POST /api/search — Busca hibrida semantica + texto em document_embeddings.
GET  /api/embed-status/{file_id} — Verifica status de embedding de um arquivo.
"""

import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from pydantic import BaseModel, Field

logger = logging.getLogger("enrichment-engine.semantic-search")
router = APIRouter()


# ── Schemas ─────────────────────────────────────────────────────


class EmbedInput(BaseModel):
    file_id: int = Field(..., description="ID do arquivo na tabela drive_files")
    assistido_id: Optional[int] = Field(None, description="ID do assistido")
    text: str = Field(..., min_length=20, description="Texto para indexar")
    metadata: Optional[dict] = Field(None, description="Metadados extras")


class SearchInput(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000)
    assistido_id: Optional[int] = None
    threshold: float = Field(0.3, ge=0.0, le=1.0)
    limit: int = Field(20, ge=1, le=50)


class SearchResultItem(BaseModel):
    id: int
    file_id: int
    assistido_id: Optional[int] = None
    chunk_index: int = 0
    chunk_text: str
    metadata: dict = Field(default_factory=dict)
    semantic_similarity: float = 0.0
    text_similarity: float = 0.0
    combined_score: float = 0.0


# ── Background Task ────────────────────────────────────────────


async def _process_embedding(data: EmbedInput):
    """Background task: chunk + embed + store."""
    from services.document_embedding_service import get_document_embedding_service

    service = get_document_embedding_service()
    try:
        count = await service.embed_document(
            file_id=data.file_id,
            assistido_id=data.assistido_id,
            text=data.text,
            metadata=data.metadata,
        )
        logger.info("Embedded %d chunks for file %d", count, data.file_id)
    except Exception as e:
        logger.error("Embedding failed for file %d: %s", data.file_id, str(e))


# ── Endpoints ───────────────────────────────────────────────────


@router.post("/embed", status_code=202)
async def embed_document(
    data: EmbedInput,
    background_tasks: BackgroundTasks,
):
    """Indexa documento em background: chunk + embed + store."""
    from services.document_embedding_service import get_document_embedding_service

    service = get_document_embedding_service()
    if not service.available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document embedding service not configured (missing OPENAI_API_KEY or Supabase credentials)",
        )

    logger.info(
        "Embed queued | file_id=%d | text_len=%d",
        data.file_id,
        len(data.text),
    )

    background_tasks.add_task(_process_embedding, data)

    return {
        "status": "processing",
        "message": "Embedding iniciado",
        "file_id": data.file_id,
    }


@router.post("/search")
async def search_documents(data: SearchInput):
    """Busca hibrida semantica + texto em document_embeddings."""
    from services.document_embedding_service import get_document_embedding_service

    service = get_document_embedding_service()
    if not service.available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document embedding service not configured",
        )

    logger.info(
        "Search | query='%s' | assistido=%s | limit=%d",
        data.query[:50],
        data.assistido_id,
        data.limit,
    )

    try:
        results = await service.search(
            query=data.query,
            assistido_id=data.assistido_id,
            threshold=data.threshold,
            limit=data.limit,
        )
        return {"results": results, "count": len(results)}
    except Exception as e:
        logger.error("Search failed: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/embed-status/{file_id}")
async def get_embed_status(file_id: int):
    """Verifica se um arquivo tem embeddings indexados."""
    from services.document_embedding_service import get_document_embedding_service

    service = get_document_embedding_service()
    if not service.available:
        return {"hasEmbeddings": False, "chunkCount": 0, "fileId": file_id}

    try:
        result = await service.get_status(file_id)
        return {**result, "fileId": file_id}
    except Exception as e:
        logger.error("Status check failed for file %d: %s", file_id, str(e))
        return {"hasEmbeddings": False, "chunkCount": 0, "fileId": file_id}
