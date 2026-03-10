"""
Radar Criminal — Rotas FastAPI
Endpoints para scraping, extração, matching e pipeline completo.
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

logger = logging.getLogger("enrichment-engine.router.radar")
router = APIRouter()


# === Pydantic Models ===

class RadarScrapeInput(BaseModel):
    """Input para scraping manual."""
    fonte_id: int | None = Field(None, description="ID da fonte específica (null = todas)")


class RadarScrapeOutput(BaseModel):
    """Output do scraping."""
    success: bool
    noticias_coletadas: int = 0
    noticias_salvas: int = 0
    message: str = ""


class RadarExtractInput(BaseModel):
    """Input para extração."""
    limit: int = Field(20, ge=1, le=100, description="Quantidade de notícias a processar")


class RadarExtractOutput(BaseModel):
    """Output da extração."""
    success: bool
    noticias_processadas: int = 0
    message: str = ""


class RadarMatchInput(BaseModel):
    """Input para matching."""
    limit: int = Field(20, ge=1, le=100, description="Quantidade de notícias a processar")


class RadarMatchOutput(BaseModel):
    """Output do matching."""
    success: bool
    matches_encontrados: int = 0
    message: str = ""


class RadarPipelineOutput(BaseModel):
    """Output do pipeline completo."""
    success: bool
    etapa_scraping: dict[str, Any] = {}
    etapa_extracao: dict[str, Any] = {}
    etapa_geocoding: dict[str, Any] = {}
    etapa_matching: dict[str, Any] = {}
    message: str = ""


class RadarGeocodeInput(BaseModel):
    """Input para geocoding."""
    limit: int = Field(20, ge=1, le=100)


class RadarGeocodeOutput(BaseModel):
    """Output do geocoding."""
    success: bool
    geocodificadas: int = 0
    message: str = ""


# === Endpoints ===

@router.post("/radar/scrape", response_model=RadarScrapeOutput)
async def radar_scrape(input_data: RadarScrapeInput | None = None) -> RadarScrapeOutput:
    """Scrape notícias policiais de todas as fontes ativas."""
    logger.info("Iniciando scraping de notícias")

    try:
        from services.radar_scraper_service import get_radar_scraper_service

        scraper = get_radar_scraper_service()
        noticias = await scraper.scrape_all_fontes()
        saved = await scraper.save_noticias(noticias)

        return RadarScrapeOutput(
            success=True,
            noticias_coletadas=len(noticias),
            noticias_salvas=saved,
            message=f"Coletadas {len(noticias)} notícias, {saved} salvas no banco",
        )
    except Exception as e:
        logger.error("Falha no scraping: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scraping falhou: {str(e)}",
        )


@router.post("/radar/extract", response_model=RadarExtractOutput)
async def radar_extract(input_data: RadarExtractInput | None = None) -> RadarExtractOutput:
    """Extrai dados estruturados de notícias pendentes via Gemini Flash."""
    limit = input_data.limit if input_data else 20
    logger.info("Iniciando extração | limit=%d", limit)

    try:
        from services.radar_extraction_service import get_radar_extraction_service

        extractor = get_radar_extraction_service()
        processed = await extractor.extract_batch(limit=limit)

        return RadarExtractOutput(
            success=True,
            noticias_processadas=processed,
            message=f"Extraídos dados de {processed} notícias",
        )
    except Exception as e:
        logger.error("Falha na extração: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Extração falhou: {str(e)}",
        )


@router.post("/radar/geocode", response_model=RadarGeocodeOutput)
async def radar_geocode(input_data: RadarGeocodeInput | None = None) -> RadarGeocodeOutput:
    """Geocodifica notícias que têm bairro mas não coordenadas."""
    limit = input_data.limit if input_data else 20
    logger.info("Iniciando geocoding | limit=%d", limit)

    try:
        from services.radar_extraction_service import get_radar_extraction_service

        extractor = get_radar_extraction_service()
        geocoded = await extractor.geocode_batch(limit=limit)

        return RadarGeocodeOutput(
            success=True,
            geocodificadas=geocoded,
            message=f"Geocodificadas {geocoded} notícias",
        )
    except Exception as e:
        logger.error("Falha no geocoding: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Geocoding falhou: {str(e)}",
        )


@router.post("/radar/match", response_model=RadarMatchOutput)
async def radar_match(input_data: RadarMatchInput | None = None) -> RadarMatchOutput:
    """Faz matching de envolvidos em notícias com assistidos DPE."""
    limit = input_data.limit if input_data else 20
    logger.info("Iniciando matching | limit=%d", limit)

    try:
        from services.radar_matching_service import get_radar_matching_service

        matcher = get_radar_matching_service()
        matches = await matcher.match_batch(limit=limit)

        return RadarMatchOutput(
            success=True,
            matches_encontrados=matches,
            message=f"Encontrados {matches} matches com assistidos",
        )
    except Exception as e:
        logger.error("Falha no matching: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Matching falhou: {str(e)}",
        )


@router.post("/radar/pipeline", response_model=RadarPipelineOutput)
async def radar_pipeline() -> RadarPipelineOutput:
    """
    Pipeline completo: Scrape → Extração → Geocoding → Matching.
    Ideal para cron job diário.
    """
    logger.info("Iniciando pipeline completo do Radar Criminal")

    result = RadarPipelineOutput(success=True)

    # 1. Scraping
    try:
        from services.radar_scraper_service import get_radar_scraper_service

        scraper = get_radar_scraper_service()
        noticias = await scraper.scrape_all_fontes()
        saved = await scraper.save_noticias(noticias)

        result.etapa_scraping = {
            "coletadas": len(noticias),
            "salvas": saved,
            "status": "ok",
        }
        logger.info("Pipeline scraping: %d coletadas, %d salvas", len(noticias), saved)
    except Exception as e:
        result.etapa_scraping = {"status": "erro", "error": str(e)}
        logger.error("Pipeline scraping falhou: %s", str(e))

    # 2. Extração via Gemini Flash
    try:
        from services.radar_extraction_service import get_radar_extraction_service

        extractor = get_radar_extraction_service()
        processed = await extractor.extract_batch(limit=50)

        result.etapa_extracao = {
            "processadas": processed,
            "status": "ok",
        }
        logger.info("Pipeline extração: %d processadas", processed)
    except Exception as e:
        result.etapa_extracao = {"status": "erro", "error": str(e)}
        logger.error("Pipeline extração falhou: %s", str(e))

    # 3. Geocoding
    try:
        geocoded = await extractor.geocode_batch(limit=50)

        result.etapa_geocoding = {
            "geocodificadas": geocoded,
            "status": "ok",
        }
        logger.info("Pipeline geocoding: %d geocodificadas", geocoded)
    except Exception as e:
        result.etapa_geocoding = {"status": "erro", "error": str(e)}
        logger.error("Pipeline geocoding falhou: %s", str(e))

    # 4. Matching
    try:
        from services.radar_matching_service import get_radar_matching_service

        matcher = get_radar_matching_service()
        matches = await matcher.match_batch(limit=50)

        result.etapa_matching = {
            "matches": matches,
            "status": "ok",
        }
        logger.info("Pipeline matching: %d matches", matches)
    except Exception as e:
        result.etapa_matching = {"status": "erro", "error": str(e)}
        logger.error("Pipeline matching falhou: %s", str(e))

    result.message = (
        f"Pipeline concluído: "
        f"{result.etapa_scraping.get('salvas', 0)} notícias, "
        f"{result.etapa_extracao.get('processadas', 0)} extraídas, "
        f"{result.etapa_geocoding.get('geocodificadas', 0)} geocodificadas, "
        f"{result.etapa_matching.get('matches', 0)} matches"
    )

    return result
