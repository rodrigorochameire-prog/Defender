"""
POST /enrich/transcript — Extração de pontos-chave de transcrição de atendimento.
Fluxo: Transcrição → Gemini (análise) → Supabase (gravar)
"""

import logging

from fastapi import APIRouter, HTTPException, status

from models.schemas import TranscriptInput, TranscriptOutput, UrgencyLevel
from services.enrichment_orchestrator import get_orchestrator

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
    logger.info(
        "Enriching transcript | chars=%d assistido=%s processo=%s",
        len(input_data.transcript),
        input_data.assistido_id,
        input_data.processo_id,
    )

    try:
        orchestrator = get_orchestrator()
        result = await orchestrator.enrich_transcript(
            transcript=input_data.transcript,
            assistido_id=input_data.assistido_id,
            processo_id=input_data.processo_id,
            caso_id=input_data.caso_id,
            context=input_data.context,
        )

        return TranscriptOutput(
            key_points=result.get("key_points", []),
            facts=result.get("facts", []),
            persons_mentioned=result.get("persons_mentioned", []),
            contradictions=result.get("contradictions", []),
            suggested_actions=result.get("suggested_actions", []),
            urgency_level=UrgencyLevel(result.get("urgency_level", "low")),
            entities_created=result.get("entities_created", []),
        )

    except Exception as e:
        logger.error("Failed to enrich transcript: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcript enrichment failed: {str(e)}",
        )
