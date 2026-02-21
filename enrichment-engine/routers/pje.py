"""
POST /enrich/pje-text — Extração profunda de intimações PJe.
Fluxo: Texto bruto → Gemini (extração) → Supabase (gravar)
"""

import logging

from fastapi import APIRouter, HTTPException, status

from models.schemas import PjeInput, PjeOutput
from services.enrichment_orchestrator import get_orchestrator

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
    logger.info(
        "Enriching PJe text | chars=%d defensor=%s",
        len(input_data.raw_text),
        input_data.defensor_id,
    )

    try:
        orchestrator = get_orchestrator()
        result = await orchestrator.enrich_pje_text(
            raw_text=input_data.raw_text,
            defensor_id=input_data.defensor_id,
        )

        return PjeOutput(
            intimacoes=result.get("intimacoes", []),
            processos_atualizados=result.get("processos_atualizados", []),
            demandas_criadas=result.get("demandas_criadas", []),
            assistidos_identificados=result.get("assistidos_identificados", []),
            total_processadas=result.get("total_processadas", 0),
        )

    except Exception as e:
        logger.error("Failed to enrich PJe text: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PJe enrichment failed: {str(e)}",
        )
