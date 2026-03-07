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


async def _maybe_trigger_diarization(client, db_record_id: int):
    """
    Auto-trigger speaker identification after analysis completes.
    Only runs if no labels exist yet for this file.
    """
    try:
        # Get file info
        file_row = client.table("drive_files").select(
            "assistido_id, enrichment_data"
        ).eq("id", db_record_id).single().execute()

        if not file_row.data or not file_row.data.get("assistido_id"):
            return

        assistido_id = file_row.data["assistido_id"]
        enrichment_data = file_row.data.get("enrichment_data") or {}

        # Get transcription text
        transcription = (
            enrichment_data.get("transcript")
            or enrichment_data.get("transcript_plain")
            or enrichment_data.get("markdown_content")
            or ""
        )

        if not transcription or len(transcription) < 100:
            return

        # Check if labels already exist for this file
        existing = client.table("speaker_labels").select("id").eq(
            "file_id", db_record_id
        ).execute()
        if existing.data:
            logger.info(
                "Diarization skip — labels already exist for file=%d",
                db_record_id,
            )
            return

        # Get existing manual labels for this assistido (from other files)
        existing_labels = []
        manual_resp = client.table("speaker_labels").select(
            "speaker_key, label, role"
        ).eq("assistido_id", assistido_id).eq("is_manual", True).execute()
        if manual_resp.data:
            existing_labels = manual_resp.data

        logger.info(
            "Auto-triggering diarization | file_id=%d | assistido_id=%d",
            db_record_id, assistido_id,
        )

        from services.diarization_service import get_diarization_service
        service = get_diarization_service()
        if not service.available:
            return

        speakers = await service.identify_speakers(
            transcription_text=transcription,
            existing_labels=existing_labels if existing_labels else None,
        )

        if not speakers:
            logger.info("Auto-diarization returned no speakers for file=%d", db_record_id)
            return

        for speaker in speakers:
            row = {
                "assistido_id": assistido_id,
                "file_id": db_record_id,
                "speaker_key": speaker["speaker_key"],
                "label": speaker.get("label", speaker["speaker_key"]),
                "role": speaker.get("role", "outro"),
                "confidence": speaker.get("confidence", 0.5),
                "is_manual": False,
            }
            client.table("speaker_labels").insert(row).execute()

        logger.info(
            "Auto-diarization COMPLETED | file_id=%d | speakers=%d",
            db_record_id, len(speakers),
        )

    except Exception as e:
        logger.warning(
            "Auto-diarization failed (non-critical) | file_id=%d | error=%s",
            db_record_id, str(e),
        )


async def _maybe_trigger_embedding(client, db_record_id: int, input_data: AnalyzeAsyncInput):
    """Auto-trigger document embedding generation after analysis completes."""
    try:
        # Get file info including assistido_id
        file_row = client.table("drive_files").select(
            "assistido_id"
        ).eq("id", db_record_id).single().execute()

        if not file_row.data:
            return

        assistido_id = file_row.data.get("assistido_id")

        # Use the transcript text for embedding
        text = input_data.transcript
        if not text or len(text.strip()) < 50:
            return

        from services.document_embedding_service import get_document_embedding_service
        service = get_document_embedding_service()
        if not service.available:
            logger.info("Document embedding skipped — service not configured")
            return

        count = await service.embed_document(
            file_id=db_record_id,
            assistido_id=assistido_id,
            text=text,
            metadata={"file_name": input_data.file_name, "source": "auto_analysis"},
        )

        logger.info(
            "Auto-embedded %d chunks for file %d (assistido=%s)",
            count, db_record_id, assistido_id,
        )

    except Exception as e:
        logger.warning(
            "Auto embedding failed (non-critical) | db_id=%d | error=%s",
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

        # Auto-trigger diarization to identify speakers
        await _maybe_trigger_diarization(client, db_record_id)

        # Auto-trigger document embedding for semantic search
        await _maybe_trigger_embedding(client, db_record_id, input_data)

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
