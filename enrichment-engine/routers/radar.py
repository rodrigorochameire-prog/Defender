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


class RadarScoreBackfillOutput(BaseModel):
    """Output do backfill de relevancia_score."""
    success: bool
    total_atualizadas: int = 0
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
    """Extrai dados estruturados de notícias pendentes via Claude Sonnet."""
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

    Extração processa em batches de 10 para caber no timeout de 55s do Vercel cron.
    Usa concorrência (5 simultâneas) para maximizar throughput.
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

    # 2. Extração via Claude Sonnet (batch de 10 para caber no timeout)
    try:
        from services.radar_extraction_service import get_radar_extraction_service

        extractor = get_radar_extraction_service()
        processed = await extractor.extract_batch(limit=10)

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
        from services.radar_extraction_service import get_radar_extraction_service

        geo_extractor = get_radar_extraction_service()
        geocoded = await geo_extractor.geocode_batch(limit=50)

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


@router.post("/api/radar/scrape-instagram")
async def scrape_instagram():
    """Coleta posts recentes de perfis Instagram oficiais de segurança de Camaçari."""
    from services.radar_instagram_service import RadarInstagramService
    from services.radar_scraper_service import get_radar_scraper_service

    instagram_service = RadarInstagramService()
    scraper = get_radar_scraper_service()

    noticias = instagram_service.scrape_all_instagram_fontes()
    saved = await scraper.save_noticias(noticias)

    return {
        "noticias_coletadas": len(noticias),
        "noticias_salvas": saved,
    }


@router.post("/radar/score/backfill", response_model=RadarScoreBackfillOutput)
async def radar_score_backfill() -> RadarScoreBackfillOutput:
    """
    Recalcula relevancia_score para todas as notícias com score = 0
    e status 'extracted', 'matched' ou 'analyzed'.

    Útil para preencher scores em itens que foram extraídos antes da
    implementação do campo de score.
    """
    logger.info("Iniciando backfill de relevancia_score")

    try:
        from services.supabase_service import get_supabase_service
        from services.radar_extraction_service import get_radar_extraction_service
        from datetime import datetime, timezone

        supa = get_supabase_service()
        client_db = supa._get_client()
        extractor = get_radar_extraction_service()

        # Buscar itens com score zerado em status pós-extração
        result = (
            client_db.table("radar_noticias")
            .select("id, tipo_crime, bairro, envolvidos, delegacia, resumo_ia")
            .in_("enrichment_status", ["extracted", "matched", "analyzed"])
            .eq("relevancia_score", 0)
            .execute()
        )

        noticias = result.data or []
        if not noticias:
            logger.info("Nenhum item com relevancia_score=0 encontrado")
            return RadarScoreBackfillOutput(
                success=True,
                total_atualizadas=0,
                message="Nenhum item precisava de atualização",
            )

        logger.info("Backfill: %d itens com relevancia_score=0", len(noticias))

        updated = 0
        errors = 0

        for noticia in noticias:
            try:
                # Montar dict compatível com _calculate_relevancia_score
                # usando os campos já extraídos do banco
                envolvidos_raw = noticia.get("envolvidos")
                if isinstance(envolvidos_raw, str):
                    import json as _json
                    try:
                        envolvidos_parsed = _json.loads(envolvidos_raw)
                    except Exception:
                        envolvidos_parsed = []
                else:
                    envolvidos_parsed = envolvidos_raw or []

                extracted_data = {
                    "tipo_crime": noticia.get("tipo_crime"),
                    "bairro": noticia.get("bairro"),
                    "envolvidos": envolvidos_parsed,
                    "delegacia": noticia.get("delegacia"),
                    "resumo_ia": noticia.get("resumo_ia"),
                }

                score = extractor._calculate_relevancia_score(extracted_data)

                client_db.table("radar_noticias").update({
                    "relevancia_score": score,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }).eq("id", noticia["id"]).execute()

                updated += 1

            except Exception as e:
                logger.error("Backfill: erro ao atualizar id=%d: %s", noticia.get("id"), str(e))
                errors += 1
                continue

        msg = f"Backfill concluído: {updated} itens atualizados"
        if errors:
            msg += f", {errors} erros"
        logger.info(msg)

        return RadarScoreBackfillOutput(
            success=True,
            total_atualizadas=updated,
            message=msg,
        )

    except Exception as e:
        logger.error("Backfill score falhou: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Backfill falhou: {str(e)}",
        )
