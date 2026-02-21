"""
POST /enrich/document — Parsing + enriquecimento de documento (PDF, DOCX).
Fluxo: Download → Docling (parse) → Gemini (semântica) → Supabase (gravar)
"""

import logging

from fastapi import APIRouter, HTTPException, status

from models.schemas import DocumentInput, DocumentOutput
from services.enrichment_orchestrator import get_orchestrator

logger = logging.getLogger("enrichment-engine.document")
router = APIRouter()


@router.post("/document", response_model=DocumentOutput)
async def enrich_document(input_data: DocumentInput) -> DocumentOutput:
    """
    Enriquece um documento do Drive.

    1. Baixa o arquivo via URL signed
    2. Docling converte para Markdown (layout, tabelas, OCR)
    3. Gemini classifica tipo + extrai dados estruturados
    4. Grava no Supabase (documentos, caseFacts, anotações)
    """
    logger.info(
        "Enriching document | mime=%s assistido=%s processo=%s",
        input_data.mime_type,
        input_data.assistido_id,
        input_data.processo_id,
    )

    try:
        orchestrator = get_orchestrator()
        result = await orchestrator.enrich_document(
            file_url=input_data.file_url,
            mime_type=input_data.mime_type,
            assistido_id=input_data.assistido_id,
            processo_id=input_data.processo_id,
            caso_id=input_data.caso_id,
            defensor_id=input_data.defensor_id,
        )

        return DocumentOutput(
            document_type=result["document_type"],
            extracted_data=result["extracted_data"],
            entities_created=result["entities_created"],
            confidence=result["confidence"],
            markdown_preview=result.get("markdown_preview", ""),
        )

    except Exception as e:
        logger.error("Failed to enrich document: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document enrichment failed: {str(e)}",
        )
