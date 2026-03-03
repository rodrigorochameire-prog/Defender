"""
OMBUDS Enrichment Engine — Sistema Nervoso Defensivo
FastAPI service: Docling (parsing) + Gemini Flash (semântica) + Supabase (storage)
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import ApiKeyMiddleware
from config import get_settings
from routers.health import router as health_router
from routers.document import router as document_router
from routers.pje import router as pje_router
from routers.transcript import router as transcript_router
from routers.audiencia import router as audiencia_router
from routers.whatsapp import router as whatsapp_router
from routers.solar import router as solar_router
from routers.sigad import router as sigad_router
from routers.search import router as search_router
from routers.consolidation import router as consolidation_router
from routers.transcription import router as transcription_router
from routers.oficios import router as oficios_router
from routers.ocr import router as ocr_router
from routers.ficha import router as ficha_router
from routers.analysis import router as analysis_router

# Logging estruturado (sem PII)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("enrichment-engine")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown events."""
    settings = get_settings()
    logger.info(
        "Starting Enrichment Engine v%s | debug=%s",
        settings.app_version,
        settings.debug,
    )

    # Verificar dependências críticas
    if not settings.gemini_api_key:
        logger.warning("GEMINI_API_KEY not set — Gemini service will fail")
    if not settings.supabase_url:
        logger.warning("SUPABASE_URL not set — Supabase service will fail")
    if not settings.enrichment_api_key:
        logger.warning("ENRICHMENT_API_KEY not set — all authenticated routes blocked")
    if not settings.solar_username:
        logger.warning("SOLAR_USERNAME not set — Solar integration disabled")
    if not settings.openai_api_key:
        logger.warning("OPENAI_API_KEY not set — transcription service disabled")
    if not settings.anthropic_api_key:
        logger.warning("ANTHROPIC_API_KEY not set — Claude review/improve disabled")

    yield

    logger.info("Shutting down Enrichment Engine")


def create_app() -> FastAPI:
    """Factory de app — facilita testes."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Pipeline de enriquecimento automático para o OMBUDS/Defender",
        lifespan=lifespan,
    )

    # --- Middleware ---
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Railway → Vercel (restringir em produção)
        allow_methods=["POST", "GET"],
        allow_headers=["*"],
    )
    app.add_middleware(ApiKeyMiddleware)

    # --- Routers ---
    app.include_router(health_router, tags=["Health"])
    app.include_router(document_router, prefix="/enrich", tags=["Enrich"])
    app.include_router(pje_router, prefix="/enrich", tags=["Enrich"])
    app.include_router(transcript_router, prefix="/enrich", tags=["Enrich"])
    app.include_router(audiencia_router, prefix="/enrich", tags=["Enrich"])
    app.include_router(whatsapp_router, prefix="/enrich", tags=["Enrich"])
    app.include_router(solar_router, tags=["Solar"])
    app.include_router(sigad_router, tags=["SIGAD"])
    app.include_router(search_router, tags=["Search"])
    app.include_router(consolidation_router, prefix="/enrich", tags=["Intelligence"])
    app.include_router(transcription_router, prefix="/api", tags=["Transcription"])
    app.include_router(oficios_router, prefix="/api", tags=["Oficios"])
    app.include_router(ocr_router, prefix="/api", tags=["OCR"])
    app.include_router(ficha_router, prefix="/enrich", tags=["Ficha"])
    app.include_router(analysis_router, prefix="/api", tags=["Analysis"])

    return app


app = create_app()
