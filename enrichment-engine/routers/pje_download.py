"""
POST /enrich/pje-download — Download de autos de processos PJe via Chrome CDP.

Conecta ao Chrome já aberto (com sessão PJe autenticada), dispara o download
nativo do PJe (que gera PDF em lote), e organiza os arquivos no Google Drive local
por atribuição/assistido.

NOTA: Funciona apenas localmente. Requer Chrome com --remote-debugging-port=9222.
"""

import logging

from fastapi import APIRouter, HTTPException, status

from models.schemas import (
    PjeDownloadInput,
    PjeDownloadOutput,
    PjeDownloadResult,
)
from services.pje_download_service import get_pje_download_service

logger = logging.getLogger("enrichment-engine.pje-download")
router = APIRouter()


@router.post("/pje-download", response_model=PjeDownloadOutput)
async def download_pje_processos(input_data: PjeDownloadInput) -> PjeDownloadOutput:
    """
    Baixa autos de processos do PJe e organiza no Google Drive local.

    1. Conecta ao Chrome já aberto (porta 9222)
    2. Para cada processo, dispara download nativo do PJe
    3. Aguarda geração do PDF na Área de Download
    4. Move para ~/My Drive/1 - Defensoria 9ª DP/{atribuição}/{assistido}/

    Requer:
    - Chrome aberto com --remote-debugging-port=9222
    - Sessão PJe autenticada (login manual prévio)
    - Google Drive sincronizado localmente
    """
    logger.info(
        "PJe download request | processos=%d defensor=%s",
        len(input_data.processos),
        input_data.defensor_id,
    )

    service = get_pje_download_service()

    try:
        raw_results = await service.download_processos(
            [
                {
                    "numero_processo": p.numero_processo,
                    "link_pje": p.link_pje,
                    "atribuicao": p.atribuicao,
                    "assistido_name": p.assistido_name,
                }
                for p in input_data.processos
            ]
        )

        resultados = [
            PjeDownloadResult(
                numero_processo=r["numero_processo"],
                assistido=r.get("assistido"),
                downloaded=r.get("downloaded", False),
                dest_path=r.get("dest_path"),
                atribuicao_folder=r.get("atribuicao_folder"),
                error=r.get("error"),
            )
            for r in raw_results
        ]

        total_downloaded = sum(1 for r in resultados if r.downloaded)
        total_errors = sum(1 for r in resultados if not r.downloaded)

        logger.info(
            "PJe download complete | downloaded=%d errors=%d",
            total_downloaded,
            total_errors,
        )

        return PjeDownloadOutput(
            resultados=resultados,
            total_downloaded=total_downloaded,
            total_errors=total_errors,
        )

    except ConnectionError as e:
        logger.error("Chrome CDP connection failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        ) from e
    except Exception as e:
        logger.error("PJe download failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PJe download failed: {e}",
        ) from e
