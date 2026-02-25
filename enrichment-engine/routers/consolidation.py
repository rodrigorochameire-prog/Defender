"""
POST /consolidate — Consolida dados enriquecidos de multiplos documentos
de um caso em uma visao sintetica unificada.
"""

import json
import logging

from fastapi import APIRouter, HTTPException, status

from models.schemas import ConsolidationInput, ConsolidationOutput
from services.gemini_service import get_gemini_service
from prompts.case_synthesis import CASE_SYNTHESIS_PROMPT

logger = logging.getLogger("enrichment-engine.consolidation")
router = APIRouter()


def _build_context(input_data: ConsolidationInput) -> str:
    """Monta o contexto textual a partir dos enrichments agregados."""
    parts: list[str] = []

    # Documentos enriquecidos
    if input_data.documents:
        parts.append("=== DOCUMENTOS ENRIQUECIDOS ===\n")
        for i, doc in enumerate(input_data.documents):
            parts.append(f"--- Documento #{i+1}: {doc.get('nome', 'Sem nome')} ---")
            parts.append(f"Tipo: {doc.get('document_type', 'desconhecido')}")
            if doc.get("extracted_data"):
                parts.append(f"Dados extraidos: {json.dumps(doc['extracted_data'], ensure_ascii=False, indent=2)}")
            if doc.get("markdown_preview"):
                # Truncar preview para economizar tokens
                preview = doc["markdown_preview"][:2000]
                parts.append(f"Preview:\n{preview}")
            parts.append("")

    # Transcricoes de atendimento
    if input_data.transcripts:
        parts.append("=== TRANSCRICOES DE ATENDIMENTO ===\n")
        for i, t in enumerate(input_data.transcripts):
            parts.append(f"--- Atendimento #{i+1} ---")
            if t.get("key_points"):
                parts.append(f"Pontos-chave: {json.dumps(t['key_points'], ensure_ascii=False)}")
            if t.get("facts"):
                parts.append(f"Fatos: {json.dumps(t['facts'], ensure_ascii=False)}")
            if t.get("persons_mentioned"):
                parts.append(f"Pessoas: {json.dumps(t['persons_mentioned'], ensure_ascii=False)}")
            if t.get("contradictions"):
                parts.append(f"Contradicoes: {json.dumps(t['contradictions'], ensure_ascii=False)}")
            if t.get("teses_possiveis"):
                parts.append(f"Teses: {json.dumps(t['teses_possiveis'], ensure_ascii=False)}")
            parts.append("")

    # Demandas enriquecidas
    if input_data.demandas:
        parts.append("=== DEMANDAS/INTIMACOES ===\n")
        for i, d in enumerate(input_data.demandas):
            parts.append(f"--- Demanda #{i+1} ---")
            parts.append(json.dumps(d, ensure_ascii=False, indent=2))
            parts.append("")

    # Contexto adicional
    if input_data.context:
        parts.append("=== CONTEXTO ADICIONAL ===\n")
        parts.append(json.dumps(input_data.context, ensure_ascii=False, indent=2))

    return "\n".join(parts)


@router.post("/consolidate", response_model=ConsolidationOutput)
async def consolidate_case(input_data: ConsolidationInput) -> ConsolidationOutput:
    """
    Consolida enrichments de multiplos documentos em uma analise sintetica.

    1. Recebe dados ja enriquecidos de documentos, transcricoes e demandas
    2. Monta contexto textual concatenado
    3. Gemini Pro sintetiza em visao unificada
    4. Retorna dados estruturados para persistencia no OMBUDS
    """
    total_docs = len(input_data.documents or [])
    total_trans = len(input_data.transcripts or [])
    total_dem = len(input_data.demandas or [])

    logger.info(
        "Consolidating case | assistido=%s processo=%s docs=%d trans=%d dem=%d",
        input_data.assistido_id,
        input_data.processo_id,
        total_docs,
        total_trans,
        total_dem,
    )

    if total_docs + total_trans + total_dem == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum dado para consolidar — envie ao menos 1 documento, transcricao ou demanda.",
        )

    try:
        context = _build_context(input_data)
        gemini = get_gemini_service()
        result = await gemini.extract(CASE_SYNTHESIS_PROMPT, context)

        return ConsolidationOutput(
            resumo=result.get("resumo", ""),
            achados_chave=result.get("achados_chave", []),
            recomendacoes=result.get("recomendacoes", []),
            inconsistencias=result.get("inconsistencias", []),
            teses=result.get("teses", []),
            nulidades=result.get("nulidades", []),
            pessoas=result.get("pessoas", []),
            cronologia=result.get("cronologia", []),
            acusacoes=result.get("acusacoes", []),
            lacunas=result.get("lacunas", []),
            urgencias=result.get("urgencias", []),
            confidence=result.get("confidence", 0.0),
            total_documentos=total_docs,
            total_transcricoes=total_trans,
            total_demandas=total_dem,
        )

    except Exception as e:
        logger.error("Failed to consolidate case: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Case consolidation failed: {str(e)}",
        )
