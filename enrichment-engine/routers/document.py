"""
POST /enrich/document — Parsing + enriquecimento de documento (PDF, DOCX).
Fluxo: Download → Docling (parse) → Gemini (semântica) → Supabase (gravar)
"""

import logging
import time

from fastapi import APIRouter, HTTPException, status

from models.schemas import DocumentInput, DocumentOutput

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
    start = time.time()
    logger.info(
        "Enriching document | mime=%s assistido=%s processo=%s",
        input_data.mime_type,
        input_data.assistido_id,
        input_data.processo_id,
    )

    try:
        # TODO: Fase 2 — importar e usar DoclingService
        # TODO: Fase 3 — importar e usar GeminiService
        # TODO: Fase 4 — importar e usar SupabaseService
        # TODO: Fase 5 — orquestrar fluxo completo

        elapsed = time.time() - start
        logger.info("Document enriched in %.1fs", elapsed)

        # Placeholder — será substituído pelo orquestrador na Fase 5
        return DocumentOutput(
            document_type="pending",
            extracted_data={},
            entities_created=[],
            confidence=0.0,
            markdown_preview="",
        )

    except Exception as e:
        logger.error("Failed to enrich document: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document enrichment failed: {str(e)}",
        )
