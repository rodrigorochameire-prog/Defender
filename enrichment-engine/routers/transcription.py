"""
POST /api/transcribe — Transcrição de áudio/vídeo com Whisper + pyannote.
Fluxo: Download arquivo → Whisper (transcrição) → pyannote (speakers) → output formatado
"""

import logging

from fastapi import APIRouter, HTTPException, status

from models.schemas import TranscribeInput, TranscribeOutput, TranscribeSegment
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
