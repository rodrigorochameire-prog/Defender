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
from routers.cross_analysis import router as cross_analysis_router
from routers.diarization import router as diarization_router
from routers.semantic_search import router as semantic_search_router
from routers.juri import router as juri_router
from routers.radar import router as radar_router
from routers.summarize_chat import router as summarize_chat_router
from routers.extract_data import router as extract_data_router
from routers.cowork import router as cowork_router

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
    app.include_router(cross_analysis_router, prefix="/api", tags=["Cross-Analysis"])
    app.include_router(diarization_router, prefix="/api", tags=["Diarization"])
    app.include_router(semantic_search_router, prefix="/api", tags=["Semantic Search"])
    app.include_router(juri_router, prefix="/api", tags=["Juri"])
    app.include_router(radar_router, prefix="/api", tags=["Radar Criminal"])
    app.include_router(summarize_chat_router, prefix="/enrich", tags=["Enrich"])
    app.include_router(extract_data_router, prefix="/enrich", tags=["Enrich"])
    app.include_router(cowork_router, prefix="/cowork", tags=["cowork"])

    return app


app = create_app()
