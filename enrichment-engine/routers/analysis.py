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


def _update_progress(db_record_id: int, step: str, progress: int, detail: str = ""):
    """Atualiza enrichment_data.progress para polling do frontend."""
    try:
        from services.supabase_service import get_supabase_service
        supa = get_supabase_service()
        client = supa._get_client()
        result = client.table("drive_files").select("enrichment_data").eq("id", db_record_id).single().execute()
        current_data = result.data.get("enrichment_data") or {} if result.data else {}
        current_data["progress"] = {"step": step, "percent": progress, "detail": detail}
        client.table("drive_files").update({
            "enrichment_data": current_data,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", db_record_id).execute()
    except Exception as e:
        logger.warning("Progress update failed (non-critical) | db_id=%d | error=%s", db_record_id, str(e))


async def _maybe_trigger_cross_analysis(client, db_record_id: int, analysis: dict):
    """
    Check if 2+ Sonnet analyses exist for the same assistido.
    If so, fire cross-analysis in the background.
    """
    try:
        # Get assistido_id for this file
        file_row = client.table("drive_files").select(
            "assistido_id"
        ).eq("id", db_record_id).single().execute()

        if not file_row.data or not file_row.data.get("assistido_id"):
            return

        assistido_id = file_row.data["assistido_id"]

        # Find all drive_files for this assistido that have enrichment_data.analysis
        all_files = client.table("drive_files").select(
            "id, name, enrichment_data"
        ).eq("assistido_id", assistido_id).eq(
            "enrichment_status", "completed"
        ).execute()

        if not all_files.data:
            return

        # Filter files that have a Sonnet analysis
        analyzed_files = []
        for f in all_files.data:
            ed = f.get("enrichment_data") or {}
            if ed.get("analysis") and isinstance(ed["analysis"], dict):
                depoente_info = ed["analysis"].get("depoente", {})
                depoente_name = ""
                if isinstance(depoente_info, dict):
                    classificacoes = depoente_info.get("classificacoes", [])
                    depoente_name = ", ".join(classificacoes) if classificacoes else depoente_info.get("nome", "")
                analyzed_files.append({
                    "file_id": f["id"],
                    "file_name": f.get("name", ""),
                    "depoente": depoente_name,
                    "analysis": ed["analysis"],
                })

        if len(analyzed_files) < 2:
            logger.info(
                "Cross-analysis skip — only %d analyses for assistido=%d",
                len(analyzed_files), assistido_id,
            )
            return

        logger.info(
            "Auto-triggering cross-analysis | assistido_id=%d | num_analyses=%d",
            assistido_id, len(analyzed_files),
        )

        # Get assistido name for context
        assistido_row = client.table("assistidos").select("nome").eq(
            "id", assistido_id
        ).single().execute()
        assistido_nome = assistido_row.data.get("nome") if assistido_row.data else None

        # Fire cross-analysis
        from services.cross_analysis_service import get_cross_analysis_service
        svc = get_cross_analysis_service()
        if not svc.available:
            return

        result = await svc.cross_analyze(
            analyses=analyzed_files,
            assistido_nome=assistido_nome,
        )

        if not result:
            logger.warning("Auto cross-analysis returned None for assistido=%d", assistido_id)
            return

        # Save to cross_analyses table
        from datetime import datetime, timezone as tz
        source_file_ids = [f["file_id"] for f in analyzed_files]

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
            "analysis_count": len(analyzed_files),
            "model_version": "sonnet-cross-v1",
            "updated_at": datetime.now(tz.utc).isoformat(),
        }

        if existing.data:
            client.table("cross_analyses").update(row_data).eq(
                "id", existing.data[0]["id"]
            ).execute()
        else:
            row_data["created_at"] = datetime.now(tz.utc).isoformat()
            client.table("cross_analyses").insert(row_data).execute()

        logger.info(
            "Auto cross-analysis COMPLETED | assistido_id=%d | contradictions=%d",
            assistido_id,
            len(result.get("contradiction_matrix", [])),
        )

    except Exception as e:
        logger.warning(
            "Auto cross-analysis failed (non-critical) | db_id=%d | error=%s",
            db_record_id, str(e),
        )


async def _process_analysis_background(input_data: AnalyzeAsyncInput):
    """Background task: analisa transcricao e salva resultado no Supabase."""
    db_record_id = input_data.db_record_id

    logger.info(
        "Analysis started | file=%s | db_id=%d | transcript_len=%d",
        input_data.file_name,
        db_record_id,
        len(input_data.transcript),
    )

    try:
        analysis_svc = get_analysis_service()
        if not analysis_svc.available:
            logger.warning("Analysis skipped — ANTHROPIC_API_KEY not configured")
            return

        _update_progress(db_record_id, "analyzing", 30, "Analisando com Claude Sonnet...")

        analysis = await analysis_svc.analyze_deposition(
            transcript=input_data.transcript,
            file_name=input_data.file_name,
            speakers=input_data.speakers,
            assistido_nome=input_data.assistido_nome,
        )

        if not analysis:
            logger.warning("Analysis returned None for db_id=%d", db_record_id)
            _update_progress(db_record_id, "failed", 0, "Analise retornou resultado vazio")
            return

        _update_progress(db_record_id, "saving", 90, "Salvando resultado...")

        # Save analysis to drive_files.enrichment_data.analysis via Supabase
        from services.supabase_service import get_supabase_service
        supa = get_supabase_service()
        client = supa._get_client()

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

        # Auto-trigger cross-analysis if 2+ analyses exist for this assistido
        await _maybe_trigger_cross_analysis(client, db_record_id, analysis)

    except Exception as e:
        logger.error("Analysis FAILED | db_id=%d | error=%s", db_record_id, str(e))
        _update_progress(db_record_id, "failed", 0, f"Erro: {str(e)[:200]}")


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
        logger.error("Analysis service init failed: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Analysis service not available",
        )

    background_tasks.add_task(_process_analysis_background, input_data)

    return {
        "status": "accepted",
        "message": f"Analise de '{input_data.file_name}' iniciada em background",
        "db_record_id": input_data.db_record_id,
    }
