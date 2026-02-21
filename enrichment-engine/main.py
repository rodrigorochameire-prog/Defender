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

    return app


app = create_app()
