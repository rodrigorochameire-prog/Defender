"""
POST /cowork/import — Importa _analise_ia.json do Drive para o banco OMBUDS.
"""
import logging

from fastapi import APIRouter, HTTPException, status

from models.schemas import CoworkImportInput, CoworkImportOutput
from services.cowork_import_service import get_cowork_import_service

logger = logging.getLogger("enrichment-engine.cowork")
router = APIRouter()


@router.post("/import", response_model=CoworkImportOutput)
async def importar_analise_cowork(input_data: CoworkImportInput) -> CoworkImportOutput:
    """
    Importa _analise_ia.json gerado pelo Cowork.

    1. Baixa o JSON da pasta Drive do assistido
    2. Salva histórico em analises_cowork
    3. Popula processos.analysis_data, testemunhas.*, depoimentos_analise
    """
    try:
        service = get_cowork_import_service()
        result = await service.importar(
            assistido_id=input_data.assistido_id,
            processo_id=input_data.processo_id,
            audiencia_id=input_data.audiencia_id,
            drive_folder_id=input_data.drive_folder_id,
            arquivo_nome=input_data.arquivo_nome,
            access_token=input_data.access_token,
        )
        return CoworkImportOutput(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.exception("Erro ao importar análise Cowork")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
