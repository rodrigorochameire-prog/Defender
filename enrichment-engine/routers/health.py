"""
GET /health — Status do serviço + disponibilidade de dependências.
Rota pública (sem autenticação).
"""

import logging

from fastapi import APIRouter

from config import get_settings
from models.schemas import HealthResponse

logger = logging.getLogger("enrichment-engine.health")
router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Verifica status do serviço e disponibilidade de dependências."""
    settings = get_settings()

    # Verificar Docling
    docling_available = False
    try:
        from docling.document_converter import DocumentConverter  # noqa: F401
        docling_available = True
    except ImportError:
        logger.warning("Docling not available — document parsing will fail")

    return HealthResponse(
        status="ok",
        version=settings.app_version,
        docling_available=docling_available,
        gemini_configured=bool(settings.gemini_api_key),
        supabase_configured=bool(settings.supabase_url and settings.supabase_service_role_key),
    )
