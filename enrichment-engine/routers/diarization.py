"""
POST /api/diarize — Diarizacao de speakers em transcricoes.
Identifica speakers por papel/nome usando Claude Sonnet.
Salva resultado na tabela speaker_labels via Supabase.
"""

import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks

from models.schemas import DiarizeInput

logger = logging.getLogger("enrichment-engine.diarization")
router = APIRouter()


async def _process_diarization(data: DiarizeInput):
    """Background task: identifica speakers e salva no Supabase."""
    logger.info(
        "Diarization started | file_id=%d | assistido_id=%d | text_len=%d",
        data.file_id,
        data.assistido_id,
        len(data.transcription_text),
    )

    try:
        from services.diarization_service import get_diarization_service

        service = get_diarization_service()
        if not service.available:
            logger.warning("Diarization skipped — ANTHROPIC_API_KEY not configured")
            return

        speakers = await service.identify_speakers(
            transcription_text=data.transcription_text,
            caso_contexto=data.caso_contexto,
            existing_labels=[lab.model_dump() for lab in data.existing_labels] if data.existing_labels else None,
        )

        if not speakers:
            logger.info("No speakers identified for file %d", data.file_id)
            return

        # Save to Supabase
        from services.supabase_service import get_supabase_service

        supa = get_supabase_service()
        client = supa._get_client()

        for speaker in speakers:
            row = {
                "assistido_id": data.assistido_id,
                "file_id": data.file_id,
                "speaker_key": speaker["speaker_key"],
                "label": speaker.get("label", speaker["speaker_key"]),
                "role": speaker.get("role", "outro"),
                "confidence": speaker.get("confidence", 0.5),
                "is_manual": False,
            }

            try:
                # Check if row exists for this assistido+file+speaker_key
                existing = (
                    client.table("speaker_labels")
                    .select("id")
                    .eq("assistido_id", data.assistido_id)
                    .eq("file_id", data.file_id)
                    .eq("speaker_key", speaker["speaker_key"])
                    .execute()
                )

                if existing.data:
                    # Update existing (but don't overwrite manual labels)
                    existing_row = (
                        client.table("speaker_labels")
                        .select("is_manual")
                        .eq("id", existing.data[0]["id"])
                        .single()
                        .execute()
                    )
                    if existing_row.data and existing_row.data.get("is_manual"):
                        logger.info(
                            "Skipping manual label for speaker %s (file %d)",
                            speaker["speaker_key"],
                            data.file_id,
                        )
                        continue

                    client.table("speaker_labels").update(row).eq(
                        "id", existing.data[0]["id"]
                    ).execute()
                else:
                    # Insert new
                    client.table("speaker_labels").insert(row).execute()

            except Exception as insert_err:
                logger.warning(
                    "Failed to save speaker %s: %s",
                    speaker["speaker_key"],
                    str(insert_err),
                )

        logger.info(
            "Diarization COMPLETED | file_id=%d | speakers=%d",
            data.file_id,
            len(speakers),
        )

    except Exception as e:
        logger.error(
            "Diarization FAILED | file_id=%d | error=%s",
            data.file_id,
            str(e),
        )


@router.post("/diarize", status_code=202)
async def diarize_speakers(
    data: DiarizeInput,
    background_tasks: BackgroundTasks,
):
    """
    Diarizacao async de speakers — retorna 202 Accepted imediatamente.
    Identifica speakers com Claude Sonnet em background.
    Resultado salvo na tabela speaker_labels via Supabase.
    """
    logger.info(
        "Async diarization queued | file_id=%d | assistido_id=%d",
        data.file_id,
        data.assistido_id,
    )

    background_tasks.add_task(_process_diarization, data)

    return {
        "status": "processing",
        "message": "Diarizacao iniciada",
        "file_id": data.file_id,
    }
