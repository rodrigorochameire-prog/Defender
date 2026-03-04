"""
POST /api/cross-analyze — Análise cruzada de múltiplos depoimentos com Claude Sonnet.
Compara análises individuais para encontrar contradições, corroborações e lacunas.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from models.schemas import CrossAnalyzeInput
from services.cross_analysis_service import get_cross_analysis_service

logger = logging.getLogger("enrichment-engine.cross-analysis-router")
router = APIRouter()


def _update_cross_progress(assistido_id: int, step: str, progress: int, detail: str = ""):
    """Atualiza progresso da cross-analysis (opcional, para polling do frontend)."""
    try:
        from services.supabase_service import get_supabase_service
        supa = get_supabase_service()
        client = supa._get_client()

        # Check if cross_analyses record exists
        result = client.table("cross_analyses").select("id").eq(
            "assistido_id", assistido_id
        ).order("created_at", desc=True).limit(1).execute()

        if result.data:
            record_id = result.data[0]["id"]
            client.table("cross_analyses").update({
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", record_id).execute()
    except Exception as e:
        logger.warning(
            "Cross-analysis progress update failed (non-critical) | assistido_id=%d | error=%s",
            assistido_id, str(e),
        )


async def _process_cross_analysis_background(input_data: CrossAnalyzeInput):
    """Background task: executa cross-analysis e salva resultado no Supabase."""
    assistido_id = input_data.assistido_id

    logger.info(
        "Cross-analysis started | assistido_id=%d | num_analyses=%d",
        assistido_id,
        len(input_data.analyses),
    )

    try:
        svc = get_cross_analysis_service()
        if not svc.available:
            logger.warning("Cross-analysis skipped — ANTHROPIC_API_KEY not configured")
            return

        result = await svc.cross_analyze(
            analyses=[a.model_dump() for a in input_data.analyses],
            assistido_nome=input_data.assistido_nome,
        )

        if not result:
            logger.warning("Cross-analysis returned None for assistido_id=%d", assistido_id)
            return

        # Save to cross_analyses table via Supabase
        from services.supabase_service import get_supabase_service
        supa = get_supabase_service()
        client = supa._get_client()

        source_file_ids = [a.file_id for a in input_data.analyses]

        # Upsert: update existing or create new
        existing = client.table("cross_analyses").select("id").eq(
            "assistido_id", assistido_id
        ).order("created_at", desc=True).limit(1).execute()

        row_data = {
            "assistido_id": assistido_id,
            "contradiction_matrix": result.get("contradiction_matrix", []),
            "tese_consolidada": result.get("tese_consolidada", {}),
            "timeline_fatos": result.get("timeline_fatos", []),
            "mapa_atores": result.get("mapa_atores", []),
            "providencias_agregadas": result.get("providencias_agregadas", []),
            "source_file_ids": source_file_ids,
            "analysis_count": len(input_data.analyses),
            "model_version": "sonnet-cross-v1",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        if existing.data:
            client.table("cross_analyses").update(row_data).eq(
                "id", existing.data[0]["id"]
            ).execute()
            logger.info("Cross-analysis UPDATED | assistido_id=%d | id=%d", assistido_id, existing.data[0]["id"])
        else:
            row_data["created_at"] = datetime.now(timezone.utc).isoformat()
            client.table("cross_analyses").insert(row_data).execute()
            logger.info("Cross-analysis CREATED | assistido_id=%d", assistido_id)

        logger.info(
            "Cross-analysis COMPLETED | assistido_id=%d | contradictions=%d | timeline=%d",
            assistido_id,
            len(result.get("contradiction_matrix", [])),
            len(result.get("timeline_fatos", [])),
        )

    except Exception as e:
        logger.error("Cross-analysis FAILED | assistido_id=%d | error=%s", assistido_id, str(e))


@router.post("/cross-analyze", status_code=202)
async def cross_analyze_async(
    input_data: CrossAnalyzeInput,
    background_tasks: BackgroundTasks,
):
    """
    Análise cruzada async de múltiplos depoimentos — retorna 202 Accepted.
    Compara análises individuais em background com Claude Sonnet.
    Resultado salvo na tabela cross_analyses via Supabase.
    """
    logger.info(
        "Cross-analysis queued | assistido_id=%d | num_analyses=%d",
        input_data.assistido_id,
        len(input_data.analyses),
    )

    if len(input_data.analyses) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cross-analysis requer pelo menos 2 análises individuais",
        )

    try:
        svc = get_cross_analysis_service()
        if not svc.available:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Cross-analysis service not available",
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cross-analysis service not available",
        )

    background_tasks.add_task(_process_cross_analysis_background, input_data)

    return {
        "status": "accepted",
        "message": f"Cross-analysis de {len(input_data.analyses)} depoimentos iniciada",
        "assistido_id": input_data.assistido_id,
    }
