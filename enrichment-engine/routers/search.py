"""
POST /search/semantic — Busca semântica via pgvector.
POST /search/index — Indexa entidade no pgvector.
"""

import logging

from fastapi import APIRouter, HTTPException, status

from models.search_schemas import (
    SemanticSearchInput,
    SemanticSearchOutput,
    SearchResultItem,
    IndexEntityInput,
)
from services.embedding_service import EmbeddingService
from services.supabase_service import get_supabase_service

logger = logging.getLogger("enrichment-engine.search")
router = APIRouter(prefix="/search")


def get_embedding_service():
    """Cria EmbeddingService com raw Supabase client."""
    supabase_svc = get_supabase_service()
    return EmbeddingService(supabase_svc._get_client())


@router.post("/semantic", response_model=SemanticSearchOutput)
async def semantic_search(input_data: SemanticSearchInput):
    """Busca semântica via pgvector em todas as entidades."""
    logger.info(
        "Semantic search | query='%s' filters=%s limit=%d",
        input_data.query[:50],
        input_data.filters,
        input_data.limit,
    )

    try:
        service = get_embedding_service()
        results = await service.search(
            query=input_data.query,
            filters=input_data.filters,
            limit=input_data.limit,
        )

        return SemanticSearchOutput(
            results=[SearchResultItem(**r) for r in results],
            total=len(results),
            query=input_data.query,
        )

    except Exception as e:
        logger.error("Semantic search failed: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Semantic search failed: {str(e)}",
        )


@router.post("/index")
async def index_entity(input_data: IndexEntityInput):
    """Indexa uma entidade no pgvector."""
    logger.info(
        "Index entity | type=%s id=%d",
        input_data.entity_type,
        input_data.entity_id,
    )

    try:
        service = get_embedding_service()
        success = await service.index_entity(
            entity_type=input_data.entity_type,
            entity_id=input_data.entity_id,
            text=input_data.text,
            assistido_id=input_data.assistido_id,
            processo_id=input_data.processo_id,
            metadata=input_data.metadata,
        )
        return {
            "success": success,
            "entity_type": input_data.entity_type,
            "entity_id": input_data.entity_id,
        }

    except Exception as e:
        logger.error("Index entity failed: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Index entity failed: {str(e)}",
        )
