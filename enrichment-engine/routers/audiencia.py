"""
POST /enrich/audiencia — Parsing de pauta de audiência.
Fluxo: Texto pauta → Gemini (extração) → Supabase (gravar)
"""

import logging
import time

from fastapi import APIRouter, HTTPException, status

from models.schemas import AudienciaInput, AudienciaOutput

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
    start = time.time()
    text_len = len(input_data.pauta_text)
    logger.info(
        "Enriching audiencia | chars=%d defensor=%s",
        text_len,
        input_data.defensor_id,
    )

    try:
        # TODO: Fase 3 — importar e usar GeminiService com prompt audiência
        # TODO: Fase 4 — importar e usar SupabaseService
        # TODO: Fase 5 — orquestrar fluxo completo

        elapsed = time.time() - start
        logger.info("Audiencia enriched in %.1fs", elapsed)

        return AudienciaOutput(
            audiencias=[],
            audiencias_criadas=[],
            processos_vinculados=[],
        )

    except Exception as e:
        logger.error("Failed to enrich audiencia: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Audiencia enrichment failed: {str(e)}",
        )
