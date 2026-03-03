"""
POST /api/transcribe — Transcrição de áudio/vídeo com Whisper + pyannote.
POST /api/transcribe-async — Mesmo, mas retorna 202 e processa em background.
Fluxo: Download arquivo → Whisper (transcrição) → pyannote (speakers) → output formatado
"""

import asyncio
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from models.schemas import TranscribeAsyncInput, TranscribeInput, TranscribeOutput, TranscribeSegment
from services.transcription_service import get_transcription_service

logger = logging.getLogger("enrichment-engine.transcription")
router = APIRouter()


@router.post("/transcribe", response_model=TranscribeOutput)
async def transcribe_audio(input_data: TranscribeInput) -> TranscribeOutput:
    """
    Transcreve arquivo de áudio/vídeo.

    1. Baixa arquivo (se URL)
    2. Transcreve com OpenAI Whisper API
    3. Diariza speakers com pyannote (se habilitado)
    4. Retorna transcrição formatada com timestamps e speakers
    """
    logger.info(
        "Transcription request | file=%s | lang=%s | diarize=%s | speakers=%s",
        input_data.file_name,
        input_data.language,
        input_data.diarize,
        input_data.expected_speakers,
    )

    if not input_data.file_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="file_url is required",
        )

    try:
        service = get_transcription_service()
        result = await service.transcribe(
            file_url=input_data.file_url,
            file_name=input_data.file_name,
            language=input_data.language,
            diarize=input_data.diarize,
            expected_speakers=input_data.expected_speakers,
            auth_header=input_data.auth_header,
        )

        # Converter segmentos para schema
        segments = [
            TranscribeSegment(
                start=seg.get("start", 0),
                end=seg.get("end", 0),
                text=seg.get("text", ""),
                speaker=seg.get("speaker", "SPEAKER_0"),
            )
            for seg in result.get("segments", [])
        ]

        return TranscribeOutput(
            transcript=result.get("transcript", ""),
            transcript_plain=result.get("transcript_plain", ""),
            segments=segments,
            speakers=result.get("speakers", []),
            duration=result.get("duration", 0),
            language=result.get("language", "pt"),
            confidence=result.get("confidence", 0),
            diarization_applied=result.get("diarization_applied", False),
        )

    except ValueError as e:
        logger.warning("Transcription validation error: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except RuntimeError as e:
        logger.error("Transcription runtime error: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except Exception as e:
        logger.error("Transcription failed: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription failed: {str(e)}",
        )


async def _process_transcription_background(input_data: TranscribeAsyncInput):
    """
    Background task: transcreve e salva resultado no Supabase.
    Roda no Railway (sem timeout) — pode levar minutos para arquivos grandes.
    """
    db_record_id = input_data.db_record_id
    drive_file_id = input_data.drive_file_id

    logger.info(
        "Background transcription started | file=%s | drive_id=%s | db_id=%d",
        input_data.file_name,
        drive_file_id,
        db_record_id,
    )

    # Helper para atualizar progresso no DB (polling pelo frontend)
    def _update_progress(step: str, progress: int, detail: str = ""):
        """Atualiza enrichment_data.progress para o frontend mostrar barra de progresso."""
        try:
            from services.supabase_service import get_supabase_service
            supa = get_supabase_service()
            client = supa._get_client()
            client.table("drive_files").update({
                "enrichment_data": {
                    "progress": {"step": step, "percent": progress, "detail": detail},
                },
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", db_record_id).execute()
        except Exception:
            pass  # Non-critical — don't break the pipeline

    try:
        # ── Etapa 1: Download + Transcrição ──
        _update_progress("downloading", 10, "Baixando arquivo do Drive...")

        service = get_transcription_service()

        # Callback para progresso granular por chunk (usado em chunked paralelo)
        def on_chunk_done(completed: int, total: int) -> None:
            pct = 25 + int((completed / total) * 45)  # 25% → 70%
            _update_progress(
                "transcribing",
                pct,
                f"Transcrevendo... {completed}/{total} partes concluídas",
            )

        _update_progress("transcribing", 25, "Transcrevendo com Whisper...")

        result = await service.transcribe(
            file_url=input_data.file_url,
            file_name=input_data.file_name,
            language=input_data.language,
            diarize=input_data.diarize,
            expected_speakers=input_data.expected_speakers,
            auth_header=input_data.auth_header,
            progress_callback=on_chunk_done,
        )

        logger.info(
            "Transcrição concluída | file=%s | speakers=%d | duration=%.0fs",
            input_data.file_name,
            len(result.get("speakers", [])),
            result.get("duration", 0),
        )

        _update_progress("transcribed", 60, "Transcrição concluída. Iniciando análise IA...")

        # ── Etapa 2: Análise Sonnet (se disponível) ──
        analysis = None
        try:
            from services.analysis_service import get_analysis_service

            analysis_svc = get_analysis_service()
            if analysis_svc.available:
                transcript_text = (
                    result.get("transcript_plain", "")
                    or result.get("transcript", "")
                )
                if transcript_text and len(transcript_text) > 100:
                    logger.info(
                        "Iniciando análise Sonnet | file=%s | transcript_len=%d",
                        input_data.file_name,
                        len(transcript_text),
                    )
                    _update_progress("analyzing", 70, "Analisando depoimento com Claude Sonnet...")

                    analysis = await analysis_svc.analyze_deposition(
                        transcript=transcript_text,
                        file_name=input_data.file_name,
                        speakers=result.get("speakers"),
                    )
                    if analysis:
                        logger.info(
                            "Análise Sonnet OK | file=%s | highlights=%d | pontos_fav=%d",
                            input_data.file_name,
                            len(analysis.get("highlights", [])),
                            len(analysis.get("pontos_favoraveis", [])),
                        )
                    else:
                        logger.warning("Análise Sonnet retornou None para %s", input_data.file_name)
                else:
                    logger.info("Transcrição muito curta para análise Sonnet (%d chars)", len(transcript_text or ""))
            else:
                logger.info("Análise Sonnet indisponível (ANTHROPIC_API_KEY não configurada)")
        except Exception as e:
            logger.warning("Análise Sonnet falhou (continuando sem): %s", str(e))

        _update_progress("saving", 90, "Salvando resultado...")

        # ── Etapa 3: Salvar no Supabase ──
        from services.supabase_service import get_supabase_service

        supa = get_supabase_service()
        client = supa._get_client()

        enrichment_data = {
            "sub_type": "transcricao_audio",
            "confidence": result.get("confidence", 0),
            "transcript": result.get("transcript", ""),
            "transcript_plain": result.get("transcript_plain", ""),
            "speakers": result.get("speakers", []),
            "duration": result.get("duration", 0),
            "diarization_applied": result.get("diarization_applied", False),
            "progress": {"step": "completed", "percent": 100, "detail": "Concluído"},
        }

        # Incluir análise Sonnet se disponível
        if analysis:
            enrichment_data["analysis"] = analysis

        client.table("drive_files").update({
            "enrichment_status": "completed",
            "enrichment_error": None,
            "enrichment_data": enrichment_data,
            "enriched_at": datetime.now(timezone.utc).isoformat(),
            "document_type": "transcricao_audio",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", db_record_id).execute()

        logger.info(
            "Background transcription COMPLETED | file=%s | speakers=%d | duration=%.0fs | analysis=%s",
            input_data.file_name,
            len(result.get("speakers", [])),
            result.get("duration", 0),
            "yes" if analysis else "no",
        )

    except Exception as e:
        logger.error(
            "Background transcription FAILED | file=%s | error=%s",
            input_data.file_name,
            str(e),
        )
        # Marcar como failed no Supabase
        try:
            from services.supabase_service import get_supabase_service

            supa = get_supabase_service()
            client = supa._get_client()
            client.table("drive_files").update({
                "enrichment_status": "failed",
                "enrichment_error": f"Transcrição falhou: {str(e)[:500]}",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", db_record_id).execute()
        except Exception as db_err:
            logger.error("Failed to update DB after transcription error: %s", db_err)


@router.post("/transcribe-async", status_code=202)
async def transcribe_audio_async(
    input_data: TranscribeAsyncInput,
    background_tasks: BackgroundTasks,
):
    """
    Transcrição assíncrona — retorna 202 Accepted imediatamente.
    Processa em background no Railway (sem timeout).
    Resultado salvo diretamente no drive_files via Supabase.
    """
    logger.info(
        "Async transcription queued | file=%s | drive_id=%s | db_id=%d",
        input_data.file_name,
        input_data.drive_file_id,
        input_data.db_record_id,
    )

    if not input_data.file_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="file_url is required",
        )

    # Valida que o serviço de transcrição está disponível
    try:
        get_transcription_service()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Transcription service not available: {str(e)}",
        )

    # Enfileirar background task — roda APÓS retornar 202
    background_tasks.add_task(_process_transcription_background, input_data)

    return {
        "status": "accepted",
        "message": f"Transcrição de '{input_data.file_name}' iniciada em background",
        "drive_file_id": input_data.drive_file_id,
        "db_record_id": input_data.db_record_id,
    }
