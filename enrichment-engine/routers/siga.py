"""
Router SIGA — Endpoints de extração de dados de carreira via Chrome CDP.

POST /siga/extrair-carreira — Extrai dados de carreira do SIGA (4 seções):
    Licenças, Outras Ausências, Férias, Afastamentos.

Requisito: Chrome aberto com --remote-debugging-port=9222 e sessão SIGA autenticada.
"""

import logging

from fastapi import APIRouter

from models.schemas import SigaExtrairCarreiraOutput
from services.siga_scraper_service import get_siga_scraper_service

logger = logging.getLogger("enrichment-engine.siga-router")
router = APIRouter()


@router.post("/siga/extrair-carreira", response_model=SigaExtrairCarreiraOutput)
async def extrair_carreira() -> SigaExtrairCarreiraOutput:
    """
    Extrai dados de carreira do SIGA via Chrome CDP.

    Navega pelas 4 seções de Carreira (Licença, Outras Ausências, Férias, Afastamentos),
    extrai as tabelas e parseia cada linha.
    Falhas por seção são registradas em `errors` sem interromper as demais.
    """
    try:
        scraper = get_siga_scraper_service()
        result = await scraper.extrair_carreira()
        return SigaExtrairCarreiraOutput(success=True, **result)
    except Exception as e:
        logger.error("SIGA extrair-carreira failed: %s", e)
        return SigaExtrairCarreiraOutput(success=False, error=str(e))
