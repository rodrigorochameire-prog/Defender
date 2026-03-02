"""
Router para geração de fichas tipo-específicas.
POST /enrich/ficha — gera ficha a partir de texto de seção aprovada.
"""

import logging

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.enrichment_orchestrator import get_orchestrator

logger = logging.getLogger("enrichment-engine.ficha")

router = APIRouter()


class FichaInput(BaseModel):
    """Input para /enrich/ficha."""
    section_text: str = Field(..., min_length=10, description="Texto extraído da seção")
    section_tipo: str = Field(..., description="Tipo da seção (sentenca, depoimento, etc)")
    section_titulo: str = Field("", description="Título da seção")


class FichaOutput(BaseModel):
    """Output de /enrich/ficha."""
    ficha_data: dict = Field(default_factory=dict, description="Dados estruturados da ficha")
    section_tipo: str = Field(..., description="Tipo da seção processada")
    confidence: float = Field(0.0, ge=0, le=1, description="Score de confiança")


@router.post("/ficha", response_model=FichaOutput)
async def generate_ficha(request: FichaInput) -> FichaOutput:
    """Gera ficha tipo-específica para seção aprovada pelo defensor."""
    logger.info(
        "Generating ficha | tipo=%s titulo=%s text_len=%d",
        request.section_tipo,
        request.section_titulo[:50] if request.section_titulo else "N/A",
        len(request.section_text),
    )

    orchestrator = get_orchestrator()
    result = await orchestrator.generate_ficha(
        section_text=request.section_text,
        section_tipo=request.section_tipo,
        section_titulo=request.section_titulo,
    )

    return FichaOutput(**result)
