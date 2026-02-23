"""
Routers do SIGAD — Endpoints de integração com o SIGAD (DPEBA).

POST /sigad/exportar-assistido — Busca assistido por CPF no SIGAD e exporta ao Solar
GET  /sigad/buscar-assistido   — Busca assistido por CPF no SIGAD (apenas lookup)
"""

import logging

from fastapi import APIRouter, HTTPException, status

from models.schemas import (
    SigadExportarInput,
    SigadExportarOutput,
    SigadBuscarInput,
    SigadBuscarOutput,
)
from services.sigad_scraper_service import get_sigad_scraper_service

logger = logging.getLogger("enrichment-engine.sigad-router")
router = APIRouter()


@router.post("/sigad/exportar-assistido", response_model=SigadExportarOutput)
async def exportar_assistido(input_data: SigadExportarInput) -> SigadExportarOutput:
    """
    Exporta assistido do SIGAD para o Solar via botão nativo EXPORTAR PARA O SOLAR.

    Fluxo:
    1. Busca assistido por CPF no SIGAD (/assistidos)
    2. Navega para /assistidos/extrato/{sigad_id}
    3. Clica EXPORTAR PARA O SOLAR
    4. Interpreta resposta (já existia / exportado / erro CPF)

    Requisito: assistido deve ter CPF cadastrado no SIGAD.
    """
    logger.info(
        "SIGAD exportar-assistido: CPF=%s ombuds_id=%s",
        input_data.cpf,
        input_data.ombuds_assistido_id,
    )
    try:
        scraper = get_sigad_scraper_service()
        result = await scraper.exportar_assistido_por_cpf(cpf=input_data.cpf)
        return SigadExportarOutput(**result)
    except Exception as e:
        logger.error("SIGAD exportar-assistido falhou: %s", e)
        return SigadExportarOutput(
            success=False,
            encontrado_sigad=False,
            ja_existia_solar=False,
            error=str(e),
            message=f"Erro interno: {str(e)}",
        )


@router.post("/sigad/buscar-assistido", response_model=SigadBuscarOutput)
async def buscar_assistido(input_data: SigadBuscarInput) -> SigadBuscarOutput:
    """
    Busca assistido no SIGAD pelo CPF sem exportar ao Solar.

    Útil para verificar se o assistido existe no SIGAD antes de exportar,
    ou para obter o sigad_id para outras operações.
    """
    logger.info("SIGAD buscar-assistido: CPF=%s", input_data.cpf)
    try:
        scraper = get_sigad_scraper_service()
        result = await scraper.buscar_assistido_por_cpf(cpf=input_data.cpf)
        if result:
            return SigadBuscarOutput(
                success=True,
                encontrado=True,
                sigad_id=result.get("sigad_id"),
                nome=result.get("nome"),
                cpf=input_data.cpf,
                data_nascimento=result.get("data_nascimento"),
                triagem=result.get("triagem"),
                cidade=result.get("cidade"),
            )
        return SigadBuscarOutput(
            success=True,
            encontrado=False,
            message=f"CPF {input_data.cpf} não encontrado no SIGAD",
        )
    except Exception as e:
        logger.error("SIGAD buscar-assistido falhou: %s", e)
        return SigadBuscarOutput(
            success=False,
            encontrado=False,
            error=str(e),
        )
