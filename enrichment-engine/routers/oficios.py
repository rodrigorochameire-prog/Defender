"""
Rotas de Ofícios — Geração de minutas e revisão com IA.
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.oficios_service import get_oficios_service
from services.anthropic_service import get_anthropic_service

logger = logging.getLogger("enrichment-engine.routers.oficios")

router = APIRouter()


# ==========================================
# SCHEMAS
# ==========================================

class GerarMinutaInput(BaseModel):
    tipo_oficio: str = "comunicacao"
    template_base: str = ""
    dados_assistido: dict[str, str] = Field(default_factory=dict)
    dados_processo: dict[str, str] = Field(default_factory=dict)
    contexto_adicional: str = ""
    instrucoes: str = ""


class GerarMinutaOutput(BaseModel):
    success: bool
    conteudo: str = ""
    modelo: str = ""
    tokens_entrada: int = 0
    tokens_saida: int = 0
    error: str | None = None


class RevisarOficioInput(BaseModel):
    conteudo: str
    tipo_oficio: str = "comunicacao"
    destinatario: str = ""
    contexto_adicional: str = ""


class RevisarOficioOutput(BaseModel):
    success: bool
    score: int = 0
    sugestoes: list[dict[str, Any]] = Field(default_factory=list)
    tom_adequado: bool = True
    formalidade_ok: bool = True
    dados_corretos: bool = True
    conteudo_revisado: str | None = None
    modelo: str = ""
    tokens_entrada: int = 0
    tokens_saida: int = 0
    error: str | None = None


class MelhorarTextoInput(BaseModel):
    conteudo: str
    instrucao: str


class MelhorarTextoOutput(BaseModel):
    success: bool
    conteudo: str = ""
    modelo: str = ""
    error: str | None = None


class ClassificarOficioInput(BaseModel):
    conteudo_markdown: str


class ClassificarOficioOutput(BaseModel):
    success: bool
    tipo_oficio: str = ""
    destinatario_tipo: str = ""
    assunto: str = ""
    qualidade_score: int = 0
    variaveis_detectadas: list[str] = Field(default_factory=list)
    estrutura: dict[str, str] = Field(default_factory=dict)
    error: str | None = None


# ==========================================
# ROTAS
# ==========================================

@router.post("/oficios/gerar-minuta", response_model=GerarMinutaOutput)
async def gerar_minuta(input_data: GerarMinutaInput) -> GerarMinutaOutput:
    """Gera corpo de ofício com Gemini 2.5 Pro."""
    try:
        service = get_oficios_service()
        result = await service.gerar_minuta(
            tipo_oficio=input_data.tipo_oficio,
            template_base=input_data.template_base,
            dados_assistido=input_data.dados_assistido,
            dados_processo=input_data.dados_processo,
            contexto_adicional=input_data.contexto_adicional,
            instrucoes=input_data.instrucoes,
        )
        return GerarMinutaOutput(
            success=True,
            conteudo=result["conteudo"],
            modelo=result["modelo"],
            tokens_entrada=result.get("tokens_entrada", 0),
            tokens_saida=result.get("tokens_saida", 0),
        )
    except Exception as e:
        logger.error("Erro ao gerar minuta: %s", e)
        return GerarMinutaOutput(success=False, error=str(e))


@router.post("/oficios/revisar", response_model=RevisarOficioOutput)
async def revisar_oficio(input_data: RevisarOficioInput) -> RevisarOficioOutput:
    """Revisa ofício com Claude Sonnet 4.6."""
    try:
        service = get_anthropic_service()
        if not service.is_available():
            return RevisarOficioOutput(
                success=False,
                error="ANTHROPIC_API_KEY não configurada",
            )

        result = await service.revisar_oficio(
            conteudo=input_data.conteudo,
            tipo_oficio=input_data.tipo_oficio,
            destinatario=input_data.destinatario,
            contexto_adicional=input_data.contexto_adicional,
        )
        return RevisarOficioOutput(
            success=True,
            score=result.get("score", 50),
            sugestoes=result.get("sugestoes", []),
            tom_adequado=result.get("tomAdequado", True),
            formalidade_ok=result.get("formalidadeOk", True),
            dados_corretos=result.get("dadosCorretos", True),
            conteudo_revisado=result.get("conteudoRevisado"),
            modelo=result.get("modelo", ""),
            tokens_entrada=result.get("tokens_entrada", 0),
            tokens_saida=result.get("tokens_saida", 0),
        )
    except Exception as e:
        logger.error("Erro ao revisar ofício: %s", e)
        return RevisarOficioOutput(success=False, error=str(e))


@router.post("/oficios/melhorar", response_model=MelhorarTextoOutput)
async def melhorar_texto(input_data: MelhorarTextoInput) -> MelhorarTextoOutput:
    """Melhora texto com Claude Sonnet 4.6."""
    try:
        service = get_anthropic_service()
        if not service.is_available():
            return MelhorarTextoOutput(
                success=False,
                error="ANTHROPIC_API_KEY não configurada",
            )

        result = await service.melhorar_texto(
            conteudo=input_data.conteudo,
            instrucao=input_data.instrucao,
        )
        return MelhorarTextoOutput(
            success=True,
            conteudo=result["conteudo"],
            modelo=result["modelo"],
        )
    except Exception as e:
        logger.error("Erro ao melhorar texto: %s", e)
        return MelhorarTextoOutput(success=False, error=str(e))


@router.post("/oficios/classificar", response_model=ClassificarOficioOutput)
async def classificar_oficio(input_data: ClassificarOficioInput) -> ClassificarOficioOutput:
    """Classifica ofício com Gemini Flash."""
    try:
        service = get_oficios_service()
        result = await service.classificar_oficio(
            conteudo_markdown=input_data.conteudo_markdown,
        )
        return ClassificarOficioOutput(
            success=True,
            tipo_oficio=result.get("tipo_oficio", ""),
            destinatario_tipo=result.get("destinatario_tipo", ""),
            assunto=result.get("assunto", ""),
            qualidade_score=result.get("qualidade_score", 0),
            variaveis_detectadas=result.get("variaveis_detectadas", []),
            estrutura=result.get("estrutura", {}),
        )
    except Exception as e:
        logger.error("Erro ao classificar ofício: %s", e)
        return ClassificarOficioOutput(success=False, error=str(e))
