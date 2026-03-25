"""
POST /enrich/pje-scrape — Scraping de processos PJe via Chrome CDP.

Conecta ao Chrome já aberto (com sessão PJe autenticada) e extrai dados
completos de cada processo: partes, movimentações, decisões, documentos.

NOTA: Funciona apenas localmente. Requer Chrome com --remote-debugging-port=9222.
"""

import logging

from fastapi import APIRouter, HTTPException, status

from models.schemas import (
    PjeScrapeInput,
    PjeScrapeOutput,
    PjeProcessoCompleto,
    PjeParte,
    PjeMovimentacao,
    PjeDocumento,
)
from services.pje_scraper_service import get_pje_scraper_service

logger = logging.getLogger("enrichment-engine.pje-scraper")
router = APIRouter()


@router.post("/pje-scrape", response_model=PjeScrapeOutput)
async def scrape_pje_processos(input_data: PjeScrapeInput) -> PjeScrapeOutput:
    """
    Escaneia processos no PJe via Chrome CDP.

    1. Conecta ao Chrome já aberto (porta 9222)
    2. Navega para cada processo usando a sessão PJe autenticada
    3. Extrai dados completos do DOM
    4. Retorna dados estruturados para enriquecer o kanban

    Requer:
    - Chrome aberto com --remote-debugging-port=9222
    - Sessão PJe autenticada (login manual prévio)
    - Página de intimações aberta (para navegação via links)
    """
    logger.info(
        "PJe scrape request | processos=%d defensor=%s",
        len(input_data.processos),
        input_data.defensor_id,
    )

    scraper = get_pje_scraper_service()

    try:
        raw_results = await scraper.scrape_processos(
            [
                {
                    "numero_processo": p.numero_processo,
                    "link_pje": p.link_pje,
                }
                for p in input_data.processos
            ]
        )

        # Converter resultados brutos para schemas tipados
        processos_completos = []
        for raw in raw_results:
            partes = [
                PjeParte(
                    nome=p.get("nome", ""),
                    tipo=p.get("tipo"),
                )
                for p in raw.get("partes", [])
            ]

            movimentacoes = [
                PjeMovimentacao(
                    data=m.get("data"),
                    tipo=m.get("tipo"),
                    descricao=m.get("descricao"),
                    conteudo=m.get("conteudo"),
                )
                for m in raw.get("movimentacoes", [])
            ]

            documentos = [
                PjeDocumento(
                    id_documento=d.get("id_documento"),
                    tipo=d.get("tipo"),
                    data=d.get("data"),
                    descricao=d.get("descricao"),
                )
                for d in raw.get("documentos", [])
            ]

            processos_completos.append(
                PjeProcessoCompleto(
                    numero_processo=raw["numero_processo"],
                    classe=raw.get("classe"),
                    assunto=raw.get("assunto"),
                    vara=raw.get("vara"),
                    comarca=raw.get("comarca"),
                    status=raw.get("status"),
                    partes=partes,
                    movimentacoes=movimentacoes,
                    documentos=documentos,
                    ultima_decisao=raw.get("ultima_decisao"),
                    relato_vitima=raw.get("relato_vitima"),
                    tipo_penal=raw.get("tipo_penal"),
                    scraped=raw.get("scraped", False),
                    error=raw.get("error"),
                )
            )

        total_scraped = sum(1 for p in processos_completos if p.scraped)
        total_errors = sum(1 for p in processos_completos if not p.scraped)

        logger.info(
            "PJe scrape complete | scraped=%d errors=%d",
            total_scraped,
            total_errors,
        )

        return PjeScrapeOutput(
            processos=processos_completos,
            total_scraped=total_scraped,
            total_errors=total_errors,
        )

    except ConnectionError as e:
        logger.error("Chrome CDP connection failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        ) from e
    except Exception as e:
        logger.error("PJe scrape failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PJe scraping failed: {e}",
        ) from e
