"""
POST /enrich/transcript — Extração de pontos-chave de transcrição de atendimento.
Fluxo: Transcrição → Gemini (análise) → Supabase (gravar)
"""

import logging
import time

from fastapi import APIRouter, HTTPException, status

from models.schemas import TranscriptInput, TranscriptOutput, UrgencyLevel

logger = logging.getLogger("enrichment-engine.transcript")
router = APIRouter()


@router.post("/transcript", response_model=TranscriptOutput)
async def enrich_transcript(input_data: TranscriptInput) -> TranscriptOutput:
    """
    Extrai inteligência de transcrição de atendimento.

    1. Recebe transcrição (Plaud, mic, ou Drive)
    2. Gemini extrai: pontos-chave, fatos, pessoas, contradições, providências
    3. Grava no Supabase: anotações, caseFacts, casePersonas
    """
    start = time.time()
    text_len = len(input_data.transcript)
    logger.info(
        "Enriching transcript | chars=%d assistido=%s processo=%s",
        text_len,
        input_data.assistido_id,
        input_data.processo_id,
    )

    try:
        # TODO: Fase 3 — importar e usar GeminiService com prompt transcript
        # TODO: Fase 4 — importar e usar SupabaseService
        # TODO: Fase 5 — orquestrar fluxo completo

        elapsed = time.time() - start
        logger.info("Transcript enriched in %.1fs | chars=%d", elapsed, text_len)

        return TranscriptOutput(
            key_points=[],
            facts=[],
            persons_mentioned=[],
            contradictions=[],
            suggested_actions=[],
            urgency_level=UrgencyLevel.LOW,
            entities_created=[],
        )

    except Exception as e:
        logger.error("Failed to enrich transcript: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcript enrichment failed: {str(e)}",
        )
