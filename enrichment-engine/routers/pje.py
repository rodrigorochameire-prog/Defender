"""
POST /enrich/pje-text — Extração profunda de intimações PJe.
Fluxo: Texto bruto → Gemini (extração) → Supabase (gravar)
"""

import logging
import time

from fastapi import APIRouter, HTTPException, status

from models.schemas import PjeInput, PjeOutput

logger = logging.getLogger("enrichment-engine.pje")
router = APIRouter()


@router.post("/pje-text", response_model=PjeOutput)
async def enrich_pje_text(input_data: PjeInput) -> PjeOutput:
    """
    Extrai variáveis profundas de texto PJe.

    1. Recebe texto colado do PJe (múltiplas intimações)
    2. Gemini com prompt jurídico extrai: processo, partes, crime, fase, prazo
    3. Grava no Supabase: demandas, processos, assistidos, casePersonas
    """
    start = time.time()
    text_len = len(input_data.raw_text)
    logger.info(
        "Enriching PJe text | chars=%d defensor=%s",
        text_len,
        input_data.defensor_id,
    )

    try:
        # TODO: Fase 3 — importar e usar GeminiService com prompt PJe
        # TODO: Fase 4 — importar e usar SupabaseService
        # TODO: Fase 5 — orquestrar fluxo completo

        elapsed = time.time() - start
        logger.info("PJe text enriched in %.1fs | chars=%d", elapsed, text_len)

        return PjeOutput(
            intimacoes=[],
            processos_atualizados=[],
            demandas_criadas=[],
            assistidos_identificados=[],
            total_processadas=0,
        )

    except Exception as e:
        logger.error("Failed to enrich PJe text: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PJe enrichment failed: {str(e)}",
        )
