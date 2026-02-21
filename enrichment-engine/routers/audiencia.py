"""
POST /enrich/audiencia — Parsing de pauta de audiência.
Fluxo: Texto pauta → Gemini (extração) → Supabase (gravar)
"""

import logging

from fastapi import APIRouter, HTTPException, status

from models.schemas import AudienciaInput, AudienciaOutput
from services.enrichment_orchestrator import get_orchestrator

logger = logging.getLogger("enrichment-engine.audiencia")
router = APIRouter()


@router.post("/audiencia", response_model=AudienciaOutput)
async def enrich_audiencia(input_data: AudienciaInput) -> AudienciaOutput:
    """
    Extrai dados estruturados de pauta de audiência.

    1. Recebe texto de pauta (PJe Agenda)
    2. Gemini extrai: tipo, partes, juiz, data, hora, sala, processo
    3. Grava no Supabase: audiências, vincula a processos
    """
    logger.info(
        "Enriching audiencia | chars=%d defensor=%s",
        len(input_data.pauta_text),
        input_data.defensor_id,
    )

    try:
        orchestrator = get_orchestrator()
        result = await orchestrator.enrich_audiencia(
            pauta_text=input_data.pauta_text,
            defensor_id=input_data.defensor_id,
        )

        return AudienciaOutput(
            audiencias=result.get("audiencias", []),
            audiencias_criadas=result.get("audiencias_criadas", []),
            processos_vinculados=result.get("processos_vinculados", []),
        )

    except Exception as e:
        logger.error("Failed to enrich audiencia: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Audiencia enrichment failed: {str(e)}",
        )
