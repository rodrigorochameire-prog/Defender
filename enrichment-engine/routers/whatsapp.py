"""
POST /enrich/whatsapp — Detecção de urgência e extração de info de mensagem WhatsApp.
Fluxo: Mensagem → Gemini (triagem) → Supabase (gravar)
"""

import logging

from fastapi import APIRouter, HTTPException, status

from models.schemas import WhatsAppInput, WhatsAppOutput, UrgencyLevel
from services.enrichment_orchestrator import get_orchestrator

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
    logger.info(
        "Enriching WhatsApp | chars=%d contact=%s assistido=%s",
        len(input_data.message),
        input_data.contact_id,
        input_data.assistido_id,
    )

    try:
        orchestrator = get_orchestrator()
        result = await orchestrator.enrich_whatsapp(
            message=input_data.message,
            contact_id=input_data.contact_id,
            assistido_id=input_data.assistido_id,
        )

        return WhatsAppOutput(
            urgency_level=UrgencyLevel(result.get("urgency_level", "low")),
            subject=result.get("subject"),
            extracted_info=result.get("extracted_info", {}),
            suggested_response=result.get("suggested_response"),
            entities_created=result.get("entities_created", []),
        )

    except Exception as e:
        logger.error("Failed to enrich WhatsApp: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"WhatsApp enrichment failed: {str(e)}",
        )
