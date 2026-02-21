"""
POST /enrich/whatsapp — Detecção de urgência e extração de info de mensagem WhatsApp.
Fluxo: Mensagem → Gemini (triagem) → Supabase (gravar)
"""

import logging
import time

from fastapi import APIRouter, HTTPException, status

from models.schemas import WhatsAppInput, WhatsAppOutput, UrgencyLevel

logger = logging.getLogger("enrichment-engine.whatsapp")
router = APIRouter()


@router.post("/whatsapp", response_model=WhatsAppOutput)
async def enrich_whatsapp(input_data: WhatsAppInput) -> WhatsAppOutput:
    """
    Triagem inteligente de mensagem WhatsApp.

    1. Recebe mensagem (Evolution API)
    2. Gemini detecta urgência + extrai informações
    3. Grava no Supabase: anotações com flag de urgência
    """
    start = time.time()
    msg_len = len(input_data.message)
    logger.info(
        "Enriching WhatsApp | chars=%d contact=%s assistido=%s",
        msg_len,
        input_data.contact_id,
        input_data.assistido_id,
    )

    try:
        # TODO: Fase 3 — importar e usar GeminiService com prompt WhatsApp
        # TODO: Fase 4 — importar e usar SupabaseService
        # TODO: Fase 5 — orquestrar fluxo completo

        elapsed = time.time() - start
        logger.info("WhatsApp enriched in %.1fs", elapsed)

        return WhatsAppOutput(
            urgency_level=UrgencyLevel.LOW,
            subject=None,
            extracted_info={},
            suggested_response=None,
            entities_created=[],
        )

    except Exception as e:
        logger.error("Failed to enrich WhatsApp: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"WhatsApp enrichment failed: {str(e)}",
        )
