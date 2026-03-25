"""
PJe Download Router — Endpoints para download de documentos do PJe e upload ao Drive.

POST /pje/download-docs — Baixa documentos específicos e organiza no Google Drive
POST /pje/download-batch — Download em lote de múltiplos processos
GET  /pje/auth-status   — Status da autenticação PJe
"""
from __future__ import annotations

import logging
from pydantic import BaseModel, Field

from fastapi import APIRouter, HTTPException, status

from services.pje_auth_service import get_pje_auth_service
from services.pje_playwright_service import get_pje_playwright_service

logger = logging.getLogger("enrichment-engine.pje-download-router")

router = APIRouter(prefix="/pje")


# === Schemas ===

class PjeDocumentRef(BaseModel):
    """Referência a um documento no PJe."""
    id_documento: str = Field(..., description="ID do documento PJe (ex: '64523274')")
    tipo_documento: str = Field("Documento", description="Tipo: Decisão, Despacho, Sentença, etc.")


class PjeDownloadInput(BaseModel):
    """Input para download de documentos de um processo."""
    processo_id: int = Field(..., description="ID do processo no OMBUDS")
    numero_autos: str = Field(..., description="Número dos autos (ex: '8000247-96.2026.8.05.0039')")
    assistido_nome: str = Field(..., description="Nome do assistido")
    atribuicao: str = Field("JURI_CAMACARI", description="Atribuição (JURI_CAMACARI, EXECUCAO_PENAL, etc.)")
    classe_processual: str | None = Field(None, description="Classe processual (Juri, InsanAc, etc.)")
    documentos: list[PjeDocumentRef] = Field(..., description="Lista de documentos para baixar")
    google_drive_access_token: str | None = Field(None, description="Token OAuth do Google Drive para upload")


class PjeDownloadedDoc(BaseModel):
    id_documento: str
    tipo_documento: str
    filepath: str
    size_bytes: int


class PjeUploadedDoc(BaseModel):
    id_documento: str
    drive_file_id: str
    drive_link: str


class PjeDownloadOutput(BaseModel):
    processo_id: int
    numero_autos: str
    downloaded: list[PjeDownloadedDoc] = Field(default_factory=list)
    uploaded: list[PjeUploadedDoc] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)


class PjeBatchInput(BaseModel):
    processos: list[PjeDownloadInput] = Field(..., description="Lista de processos para baixar")


class PjeBatchOutput(BaseModel):
    total_processos: int
    total_downloaded: int
    total_uploaded: int
    total_errors: int
    resultados: list[PjeDownloadOutput]


class PjeAuthStatusOutput(BaseModel):
    authenticated: bool
    session_age_seconds: float | None
    pje_reachable: bool


# === Endpoints ===

@router.get("/auth-status", response_model=PjeAuthStatusOutput)
async def pje_auth_status() -> PjeAuthStatusOutput:
    """Status da autenticação no PJe TJ-BA."""
    auth = get_pje_auth_service()
    return PjeAuthStatusOutput(
        authenticated=auth.is_authenticated,
        session_age_seconds=auth.session_age_seconds,
        pje_reachable=auth.is_authenticated,
    )


@router.post("/download-docs", response_model=PjeDownloadOutput)
async def download_pje_docs(input_data: PjeDownloadInput) -> PjeDownloadOutput:
    """
    Baixa documentos de um processo do PJe e opcionalmente envia ao Google Drive.

    Estrutura no Drive: Atribuição → Assistido → AP [numero] → PDFs + subpastas
    """
    logger.info(
        "Download request | processo=%s docs=%d drive=%s",
        input_data.numero_autos,
        len(input_data.documentos),
        bool(input_data.google_drive_access_token),
    )

    try:
        service = get_pje_playwright_service()
        result = await service.download_and_upload_processo(
            processo_id=input_data.processo_id,
            numero_autos=input_data.numero_autos,
            assistido_nome=input_data.assistido_nome,
            atribuicao=input_data.atribuicao,
            classe_processual=input_data.classe_processual,
            doc_ids=[d.model_dump() for d in input_data.documentos],
            google_drive_access_token=input_data.google_drive_access_token,
        )
        return PjeDownloadOutput(**result)

    except Exception as e:
        logger.error("PJe download failed: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PJe download failed: {str(e)}",
        )


@router.post("/download-batch", response_model=PjeBatchOutput)
async def download_pje_batch(input_data: PjeBatchInput) -> PjeBatchOutput:
    """Download em lote — processa sequencialmente para respeitar rate limits."""
    logger.info("Batch download | processos=%d", len(input_data.processos))

    service = get_pje_playwright_service()
    resultados = []
    total_downloaded = 0
    total_uploaded = 0
    total_errors = 0

    for proc in input_data.processos:
        try:
            result = await service.download_and_upload_processo(
                processo_id=proc.processo_id,
                numero_autos=proc.numero_autos,
                assistido_nome=proc.assistido_nome,
                atribuicao=proc.atribuicao,
                classe_processual=proc.classe_processual,
                doc_ids=[d.model_dump() for d in proc.documentos],
                google_drive_access_token=proc.google_drive_access_token,
            )
            output = PjeDownloadOutput(**result)
            resultados.append(output)
            total_downloaded += len(output.downloaded)
            total_uploaded += len(output.uploaded)
            total_errors += len(output.errors)
        except Exception as e:
            logger.error("Batch item failed for %s: %s", proc.numero_autos, e)
            resultados.append(PjeDownloadOutput(
                processo_id=proc.processo_id,
                numero_autos=proc.numero_autos,
                errors=[str(e)],
            ))
            total_errors += 1

    return PjeBatchOutput(
        total_processos=len(input_data.processos),
        total_downloaded=total_downloaded,
        total_uploaded=total_uploaded,
        total_errors=total_errors,
        resultados=resultados,
    )
