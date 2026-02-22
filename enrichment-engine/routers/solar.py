"""
Routers do Solar — Endpoints de sincronização com o Sistema Solar (DPEBA).

POST /solar/sync-processo — Sincroniza um processo
POST /solar/sync-batch   — Sincroniza múltiplos processos
POST /solar/avisos       — Lista avisos pendentes (PJe/SEEU)
GET  /solar/status       — Status da sessão Solar
"""

import logging

from fastapi import APIRouter, HTTPException, status

from models.schemas import (
    SolarSyncInput,
    SolarSyncOutput,
    SolarBatchInput,
    SolarBatchOutput,
    SolarAvisosOutput,
    SolarStatusOutput,
)
from services.solar_orchestrator import get_solar_orchestrator
from services.solar_auth_service import get_solar_auth_service, SolarAuthService
from services.solar_scraper_service import SolarScraperService
from services.solar_selectors import get_unmapped_selectors

logger = logging.getLogger("enrichment-engine.solar-router")
router = APIRouter()


@router.post("/solar/sync-processo", response_model=SolarSyncOutput)
async def sync_processo(input_data: SolarSyncInput) -> SolarSyncOutput:
    """
    Sincroniza um processo do Solar com o OMBUDS.

    1. Consulta processo no Solar
    2. Extrai movimentações
    3. Gemini processa movimentações significativas
    4. Grava no Supabase (anotações, case_facts)
    5. Retorna PDFs em base64 para frontend uploadar ao Drive
    """
    logger.info(
        "Solar sync: %s | processo_id=%s download_pdfs=%s",
        input_data.numero_processo,
        input_data.processo_id,
        input_data.download_pdfs,
    )

    try:
        orchestrator = get_solar_orchestrator()
        result = await orchestrator.sync_processo(
            numero_processo=input_data.numero_processo,
            processo_id=input_data.processo_id,
            assistido_id=input_data.assistido_id,
            caso_id=input_data.caso_id,
            download_pdfs=input_data.download_pdfs,
        )
        return SolarSyncOutput(**result)

    except Exception as e:
        logger.error("Solar sync failed: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Solar sync failed: {str(e)}",
        )


@router.post("/solar/sync-batch", response_model=SolarBatchOutput)
async def sync_batch(input_data: SolarBatchInput) -> SolarBatchOutput:
    """
    Sincroniza múltiplos processos do Solar (max 20).

    Processos são sincronizados sequencialmente com delay entre eles.
    """
    logger.info("Solar batch sync: %d processos", len(input_data.processos))

    try:
        orchestrator = get_solar_orchestrator()
        processos_dicts = [p.model_dump() for p in input_data.processos]
        result = await orchestrator.sync_batch(
            processos=processos_dicts,
            max_concurrent=input_data.max_concurrent,
        )
        return SolarBatchOutput(**result)

    except Exception as e:
        logger.error("Solar batch sync failed: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Solar batch sync failed: {str(e)}",
        )


@router.post("/solar/avisos", response_model=SolarAvisosOutput)
async def check_avisos() -> SolarAvisosOutput:
    """
    Lista avisos pendentes do Solar (intimações PJe/SEEU).

    Tenta linkar cada aviso com processos existentes no OMBUDS.
    """
    logger.info("Checking Solar avisos pendentes")

    try:
        orchestrator = get_solar_orchestrator()
        result = await orchestrator.check_avisos()
        return SolarAvisosOutput(**result)

    except Exception as e:
        logger.error("Solar avisos check failed: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Solar avisos check failed: {str(e)}",
        )


@router.get("/solar/status", response_model=SolarStatusOutput)
async def solar_status() -> SolarStatusOutput:
    """
    Status da integração Solar.

    Retorna: configuração, autenticação, sessão, seletores mapeados.
    """
    auth = get_solar_auth_service()
    unmapped = get_unmapped_selectors()

    result = SolarStatusOutput(
        configured=SolarAuthService.is_configured(),
        authenticated=auth.is_authenticated,
        session_age_seconds=auth.session_age_seconds,
        solar_reachable=False,
        selectors_mapped=len(unmapped) == 0,
        unmapped_selectors=unmapped[:20],  # Limit to avoid huge response
    )

    # Quick reachability check
    if auth.is_authenticated:
        try:
            page = auth._page
            if page and "solar.defensoria.ba.def.br" in (page.url or ""):
                result.solar_reachable = True
        except Exception:
            pass

    return result
