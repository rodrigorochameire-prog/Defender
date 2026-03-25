"""
POST /enrich/drive-organize — Organiza PDFs soltos no Google Drive local.

Escaneia as raízes do Drive e da Defensoria em busca de PDFs com número CNJ,
consulta o Supabase para identificar assistido/atribuição, e move para a
estrutura correta: {atribuição}/{assistido}/[{processo}/]

NOTA: Funciona apenas localmente. Requer Google Drive sincronizado.
"""

import logging

from fastapi import APIRouter, HTTPException, status

from models.schemas import (
    DriveOrganizeInput,
    DriveOrganizeOutput,
    DriveOrganizeFileResult,
)
from services.drive_organizer_service import get_drive_organizer_service

logger = logging.getLogger("enrichment-engine.drive-organizer")
router = APIRouter()


@router.post("/drive-organize", response_model=DriveOrganizeOutput)
async def organize_drive_pdfs(input_data: DriveOrganizeInput) -> DriveOrganizeOutput:
    """
    Organiza PDFs soltos no Google Drive local por assistido/processo.

    1. Escaneia pastas-alvo por PDFs com número CNJ no nome
    2. Consulta Supabase para identificar assistido e atribuição
    3. Move para {atribuição}/{assistido}/[{processo}/]

    Use dry_run=true para simular sem mover arquivos.
    """
    logger.info(
        "Drive organize request | drive_root=%s defensoria_root=%s dry_run=%s",
        input_data.scan_drive_root,
        input_data.scan_defensoria_root,
        input_data.dry_run,
    )

    service = get_drive_organizer_service()

    try:
        result = await service.organize(
            scan_drive_root=input_data.scan_drive_root,
            scan_defensoria_root=input_data.scan_defensoria_root,
            dry_run=input_data.dry_run,
        )

        details = [
            DriveOrganizeFileResult(**d) for d in result.get("details", [])
        ]

        return DriveOrganizeOutput(
            total_scanned=result["total_scanned"],
            moved=result["moved"],
            skipped_no_match=result["skipped_no_match"],
            skipped_exists=result["skipped_exists"],
            errors=result["errors"],
            dry_run=result["dry_run"],
            details=details,
        )

    except Exception as e:
        logger.error("Drive organize failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Drive organize failed: {e}",
        ) from e
