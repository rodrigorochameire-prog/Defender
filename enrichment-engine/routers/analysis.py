"""
POST /api/analyze-async — Analisa transcricao com Claude Sonnet.
Recebe texto ja pronto (sem download/Whisper), salva resultado no drive_files via Supabase.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from models.schemas import AnalyzeAsyncInput
from services.analysis_service import get_analysis_service

logger = logging.getLogger("enrichment-engine.analysis")
router = APIRouter()


async def _process_analysis_background(input_data: AnalyzeAsyncInput):
    """Background task: analisa transcricao e salva resultado no Supabase."""
    db_record_id = input_data.db_record_id

    logger.info(
        "Analysis started | file=%s | db_id=%d | transcript_len=%d",
        input_data.file_name,
        db_record_id,
        len(input_data.transcript),
    )

    def _update_progress(step: str, progress: int, detail: str = ""):
        """Atualiza enrichment_data.progress para polling do frontend."""
        try:
            from services.supabase_service import get_supabase_service
            supa = get_supabase_service()
            client = supa._get_client()
            # Read current enrichment_data, merge progress
            result = client.table("drive_files").select("enrichment_data").eq("id", db_record_id).single().execute()
            current_data = result.data.get("enrichment_data") or {} if result.data else {}
            current_data["progress"] = {"step": step, "percent": progress, "detail": detail}
            client.table("drive_files").update({
                "enrichment_data": current_data,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", db_record_id).execute()
        except Exception:
            pass  # Non-critical

    try:
        analysis_svc = get_analysis_service()
        if not analysis_svc.available:
            logger.warning("Analysis skipped — ANTHROPIC_API_KEY not configured")
            return

        _update_progress("analyzing", 30, "Analisando com Claude Sonnet...")

        analysis = await analysis_svc.analyze_deposition(
            transcript=input_data.transcript,
            file_name=input_data.file_name,
            speakers=input_data.speakers,
            assistido_nome=input_data.assistido_nome,
        )

        if not analysis:
            logger.warning("Analysis returned None for db_id=%d", db_record_id)
            return

        _update_progress("saving", 90, "Salvando resultado...")

        # Save analysis to drive_files.enrichment_data.analysis via Supabase
        from services.supabase_service import get_supabase_service
        supa = get_supabase_service()
        client = supa._get_client()

        # Read current enrichment_data, add analysis
        result = client.table("drive_files").select("enrichment_data").eq("id", db_record_id).single().execute()
        current_data = result.data.get("enrichment_data") or {} if result.data else {}
        current_data["analysis"] = analysis
        current_data["progress"] = {"step": "completed", "percent": 100, "detail": "Analise concluida"}

        client.table("drive_files").update({
            "enrichment_data": current_data,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", db_record_id).execute()

        logger.info(
            "Analysis COMPLETED | db_id=%d | highlights=%d | pontos_fav=%d",
            db_record_id,
            len(analysis.get("highlights", [])),
            len(analysis.get("pontos_favoraveis", [])),
        )

    except Exception as e:
        logger.error("Analysis FAILED | db_id=%d | error=%s", db_record_id, str(e))
        _update_progress("failed", 0, f"Erro: {str(e)[:200]}")


@router.post("/analyze-async", status_code=202)
async def analyze_transcript_async(
    input_data: AnalyzeAsyncInput,
    background_tasks: BackgroundTasks,
):
    """
    Analise async de transcricao — retorna 202 Accepted imediatamente.
    Analisa com Claude Sonnet em background.
    Resultado salvo diretamente no drive_files.enrichment_data.analysis via Supabase.
    """
    logger.info(
        "Async analysis queued | file=%s | db_id=%d",
        input_data.file_name,
        input_data.db_record_id,
    )

    # Validate analysis service
    try:
        svc = get_analysis_service()
        if not svc.available:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Analysis service not available (ANTHROPIC_API_KEY not configured)",
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Analysis service not available: {str(e)}",
        )

    background_tasks.add_task(_process_analysis_background, input_data)

    return {
        "status": "accepted",
        "message": f"Analise de '{input_data.file_name}' iniciada em background",
        "db_record_id": input_data.db_record_id,
    }
