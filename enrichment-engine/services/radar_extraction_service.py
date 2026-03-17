"""
Radar Criminal — Serviço de Extração de Dados com Gemini Flash
Extrai dados estruturados (NER, geolocalização, classificação) de notícias policiais.
"""
from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any

import httpx

from config import get_settings

logger = logging.getLogger("enrichment-engine.radar-extraction")

# ─── Centroids de bairros de Camaçari ───────────────────────────────────────
# Carregados uma vez ao inicializar o módulo.
_CENTROIDS_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "camacari_bairros_centroids.json"
)
try:
    with open(_CENTROIDS_PATH, "r", encoding="utf-8") as _f:
        BAIRROS_CENTROIDS: dict[str, list[float]] = json.load(_f)
    logger.info("Centroids carregados: %d bairros", len(BAIRROS_CENTROIDS))
except FileNotFoundError:
    BAIRROS_CENTROIDS = {}
    logger.warning("Arquivo de centroids não encontrado: %s", _CENTROIDS_PATH)

# Bairros de Salvador que NÃO pertencem a Camaçari — blocklist para descartar notícias de Salvador
BAIRROS_SALVADOR_BLOCKLIST = {
    "ondina", "piatã", "piata", "são cristóvão", "sao cristovao",
    "copacabana", "tomba", "chapada do rio vermelho", "andaiá", "andaia",
    "barra", "pituba", "itaigara", "brotas", "pau da lima", "são marcos",
    "tancredo neves", "cabula", "cajazeiras", "fazenda grande",
    "periperi", "plataforma", "paripe", "castelo branco",
    "liberdade", "pau miúdo", "pau miudo", "nordeste de amaralina",
    "amaralina", "boca do rio", "pernambués", "pernambues", "narandiba",
    "pelourinho", "bonfim", "ribeira", "itapuã", "itapua",
    "stella maris", "itapoã", "itapoa", "patamares", "imbuí", "imbui",
    "nova esperança", "sussuarana", "mussurunga", "são caetano", "sao caetano",
    "federação", "federacao", "engenho velho", "graça", "graca",
    "vitória", "vitoria", "garcia", "piedade", "nazaré", "nazare",
    "campo grande", "barris", "dois de julho",
}

# Bairros conhecidos de Camaçari para normalização
BAIRROS_CAMACARI = [
    "Abrantes", "Alto da Bela Vista", "Alto do Cruzeiro", "Arembepe",
    "Barra do Jacuípe", "Buri Satuba", "Caixa d'Água", "Camacari de Dentro",
    "Camaçari de Dentro", "Caminho da Lagoa", "Campo Limpo", "Catu de Abrantes",
    "Centro", "Coqueiro de Abrantes", "Dois de Julho", "Estrada do Côco",
    "Fazenda Mamão", "Gardênia", "Gleba C", "Gleba E", "Gleba H",
    "Gravatá", "Guarajuba", "Imbassaí", "Jambeiro",
    "Jauá", "Km 32", "Lama Preta", "Limoeiro", "Loteamento Parque Verde",
    "Loteamento Santo Amaro", "Monte Gordo", "Nova Aliança", "Nova Esperança",
    "Nova Vitória", "Novo Horizonte", "Parafuso", "Parque Florestal",
    "Parque das Mangabas", "Parque Verde", "Parque Verde II",
    "Phoc I", "Phoc II", "Phoc III", "Piaçaveira",
    "Ponto Certo", "Pólo Petroquímico", "Polo Industrial",
    "Real Park", "Reserva Camassary", "Santo Amaro de Ipitanga",
    "Santo Antônio", "São Bento", "São Tomé de Paripe",
    "Simões Filho", "Stela Mares", "Sucuiu", "Vila Camaçari",
    "Vila de Abrantes", "Vila Rica",
]


class RadarExtractionService:
    """Extrai dados estruturados de notícias policiais via Gemini Flash."""

    def __init__(self):
        self.settings = get_settings()

    async def extract_from_noticia(self, noticia: dict[str, Any]) -> dict[str, Any]:
        """
        Extrai dados estruturados de uma notícia usando Gemini Flash.
        Retorna dict com campos para atualizar radar_noticias.
        """
        from services.claude_service import get_claude_service, ClaudeService
        from prompts.radar_extraction import RADAR_NEWS_EXTRACTION_PROMPT

        if not ClaudeService.is_configured():
            raise RuntimeError("ANTHROPIC_API_KEY not configured — cannot extract")

        claude = get_claude_service()

        # Montar texto para extração
        text = f"TÍTULO: {noticia.get('titulo', '')}\n\n"
        corpo = noticia.get("corpo", "") or ""
        if corpo:
            # Limitar corpo para não exceder limite do Gemini
            text += f"TEXTO DA NOTÍCIA:\n{corpo[:15000]}"

        try:
            result = await claude.extract(RADAR_NEWS_EXTRACTION_PROMPT, text)

            if not isinstance(result, dict):
                logger.warning("Gemini retornou tipo inesperado: %s", type(result))
                return {"enrichment_status": "extracted"}

            # Mapear resultado para campos da tabela
            update_data: dict[str, Any] = {
                "enrichment_status": "extracted",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

            # Tipo de crime
            tipo_crime = result.get("tipo_crime")
            if tipo_crime and tipo_crime in [
                "homicidio", "tentativa_homicidio", "trafico", "roubo", "furto",
                "violencia_domestica", "sexual", "lesao_corporal", "porte_arma",
                "estelionato", "outros",
            ]:
                update_data["tipo_crime"] = tipo_crime

            # Localização
            bairro = result.get("bairro")
            if bairro:
                update_data["bairro"] = self._normalize_bairro(bairro)

            logradouro = result.get("logradouro")
            if logradouro:
                update_data["logradouro"] = logradouro

            delegacia = result.get("delegacia")
            if delegacia:
                update_data["delegacia"] = delegacia

            # Circunstância
            circ = result.get("circunstancia")
            if circ and circ in [
                "flagrante", "mandado", "denuncia", "operacao", "investigacao", "julgamento"
            ]:
                update_data["circunstancia"] = circ

            # Artigos penais
            artigos = result.get("artigos_penais")
            if artigos and isinstance(artigos, list):
                update_data["artigos_penais"] = json.dumps(artigos)

            # Arma/meio
            arma = result.get("arma_meio")
            if arma:
                update_data["arma_meio"] = arma

            # Data do fato
            data_fato = result.get("data_fato")
            if data_fato:
                update_data["data_fato"] = data_fato

            # Resumo IA
            resumo = result.get("resumo")
            if resumo:
                update_data["resumo_ia"] = resumo[:1000]

            # Envolvidos — armazenar como jsonb nativo (sem json.dumps)
            envolvidos = result.get("envolvidos")
            if envolvidos and isinstance(envolvidos, list):
                update_data["envolvidos"] = envolvidos

            # Campo de relevância (usado apenas localmente — não salvo no banco)
            relevante = result.get("relevante", True)  # default True = não deletar por padrão
            confianca_local = result.get("confianca_local", 50)
            update_data["relevante"] = relevante
            if confianca_local is not None:
                update_data["confianca_local"] = int(confianca_local)

            return update_data

        except Exception as e:
            logger.error("Falha na extração Gemini: %s", str(e))
            # If it's a config error, don't retry (would loop forever)
            if "not configured" in str(e) or "API_KEY" in str(e):
                raise
            return {"enrichment_status": "pending"}  # Retry later

    async def _extract_and_save_one(self, noticia: dict[str, Any], client_db) -> bool:
        """Extrai e salva uma notícia. Retorna True se processou com sucesso."""
        try:
            update_data = await self.extract_from_noticia(noticia)

            # Se Gemini diz que notícia não é da região → deletar do banco
            if update_data.get("relevante") is False:
                logger.info(
                    "Gemini marcou como irrelevante id=%d: '%s'",
                    noticia["id"],
                    noticia.get("titulo", "")[:60],
                )
                client_db.table("radar_noticias").delete().eq("id", noticia["id"]).execute()
                return True

            # Se a extração não produziu nenhum dado útil → notícia provavelmente irrelevante
            tipo_crime = update_data.get("tipo_crime")
            envolvidos = update_data.get("envolvidos")
            bairro = update_data.get("bairro")

            if not tipo_crime and not envolvidos and not bairro:
                # Sem crime classificado, sem pessoas, sem localidade → deletar
                logger.info(
                    "Descartando notícia irrelevante id=%d titulo='%s'",
                    noticia["id"],
                    noticia.get("titulo", "")[:60],
                )
                client_db.table("radar_noticias").delete().eq("id", noticia["id"]).execute()
                return True  # Processado com sucesso (descartado)

            # Blocklist de bairros de Salvador — se Claude extraiu bairro que é de Salvador, deletar
            if bairro and bairro.lower().strip() in BAIRROS_SALVADOR_BLOCKLIST:
                logger.info(
                    "Descartando notícia com bairro de Salvador '%s' id=%d: '%s'",
                    bairro,
                    noticia["id"],
                    noticia.get("titulo", "")[:60],
                )
                client_db.table("radar_noticias").delete().eq("id", noticia["id"]).execute()
                return True

            # Remover campos de relevância antes de salvar — não existem na tabela
            update_data.pop("relevante", None)
            update_data.pop("confianca_local", None)

            # Atualizar no banco
            client_db.table("radar_noticias").update(
                update_data
            ).eq("id", noticia["id"]).execute()

            logger.info(
                "Extraído | id=%d tipo=%s bairro=%s envolvidos=%s",
                noticia["id"],
                update_data.get("tipo_crime", "?"),
                update_data.get("bairro", "?"),
                "sim" if update_data.get("envolvidos") else "não",
            )
            return True
        except Exception as e:
            logger.error("Erro extraindo notícia id=%d: %s", noticia["id"], str(e))
            return False

    async def extract_batch(self, limit: int = 20) -> int:
        """Processa um batch de notícias pendentes com concorrência controlada."""
        import asyncio
        from services.supabase_service import get_supabase_service

        supa = get_supabase_service()
        client_db = supa._get_client()

        # Buscar notícias com status 'pending'
        result = (
            client_db.table("radar_noticias")
            .select("id, titulo, corpo, url, fonte")
            .eq("enrichment_status", "pending")
            .order("created_at", desc=False)
            .limit(limit)
            .execute()
        )

        noticias = result.data or []
        if not noticias:
            logger.info("Nenhuma notícia pendente para extração")
            return 0

        logger.info("Extraindo dados de %d notícias (concorrência=10)", len(noticias))

        # Processar com concorrência limitada (10 simultâneas) para
        # respeitar rate limits do Gemini e evitar timeout
        semaphore = asyncio.Semaphore(10)

        async def _with_semaphore(noticia):
            async with semaphore:
                return await self._extract_and_save_one(noticia, client_db)

        results = await asyncio.gather(
            *[_with_semaphore(n) for n in noticias],
            return_exceptions=True,
        )

        processed = sum(1 for r in results if r is True)
        failed = len(noticias) - processed
        if failed > 0:
            logger.warning("Extração: %d OK, %d falharam", processed, failed)

        return processed

    async def geocode_batch(self, limit: int = 20) -> int:
        """Geocodifica notícias que têm bairro mas não têm lat/lng — versão paralela."""
        import asyncio
        from services.supabase_service import get_supabase_service

        supa = get_supabase_service()
        client_db = supa._get_client()

        result = (
            client_db.table("radar_noticias")
            .select("id, bairro, logradouro")
            .eq("enrichment_status", "extracted")
            .is_("latitude", "null")
            .not_.is_("bairro", "null")
            .limit(limit)
            .execute()
        )

        noticias = result.data or []
        if not noticias:
            return 0

        # Semáforo: Nominatim pede no máximo 1 req/s, mas vamos usar 3 paralelos
        # com pequeno delay para ser um bom cidadão
        sem = asyncio.Semaphore(3)
        geocoded = 0

        async def _geocode_one(noticia: dict) -> bool:
            nonlocal geocoded
            async with sem:
                await asyncio.sleep(0.4)  # rate limiting leve: ~7 req/s máximo
                bairro = noticia.get("bairro", "") or ""
                logradouro = noticia.get("logradouro", "") or ""

                # 1. Tentar Nominatim primeiro
                nominatim_ok = False
                try:
                    query = f"{logradouro}, {bairro}" if logradouro else bairro
                    query += ", Camaçari, Bahia, Brasil"

                    async with httpx.AsyncClient(timeout=10.0) as http:
                        resp = await http.get(
                            "https://nominatim.openstreetmap.org/search",
                            params={"q": query, "format": "json", "limit": 1, "countrycodes": "br"},
                            headers={"User-Agent": "OMBUDS-Radar/1.0"},
                        )

                    if resp.status_code == 200:
                        data = resp.json()
                        if data:
                            lat = float(data[0]["lat"])
                            lon = float(data[0]["lon"])
                            client_db.table("radar_noticias").update({
                                "latitude": lat, "longitude": lon,
                            }).eq("id", noticia["id"]).execute()
                            geocoded += 1
                            nominatim_ok = True
                            return True
                except Exception as e:
                    logger.debug("Nominatim falhou para id=%d: %s", noticia["id"], str(e))

                # 2. Fallback: centroide do bairro se Nominatim não resolveu
                if not nominatim_ok and bairro:
                    centroid = self._get_centroid(bairro)
                    if centroid:
                        lat, lon = centroid
                        client_db.table("radar_noticias").update({
                            "latitude": lat, "longitude": lon,
                        }).eq("id", noticia["id"]).execute()
                        geocoded += 1
                        logger.debug(
                            "Centroide aplicado | id=%d bairro='%s' lat=%.4f lon=%.4f",
                            noticia["id"], bairro, lat, lon,
                        )
                        return True

                return False

        await asyncio.gather(*[_geocode_one(n) for n in noticias], return_exceptions=True)
        logger.info("Geocodificadas %d/%d notícias", geocoded, len(noticias))
        return geocoded

    def _get_centroid(self, bairro: str) -> tuple[float, float] | None:
        """
        Retorna (lat, lon) do centróide do bairro se encontrado no mapa local.
        Tenta match exato (case-insensitive) depois match parcial.
        Retorna None se não encontrado.
        """
        if not bairro or not BAIRROS_CENTROIDS:
            return None

        bairro_lower = bairro.lower().strip()

        # 1. Match exato (case-insensitive)
        for name, coords in BAIRROS_CENTROIDS.items():
            if name.lower() == bairro_lower:
                return (coords[0], coords[1])

        # 2. Match parcial: bairro da notícia contém ou é contido pelo nome do centroide
        for name, coords in BAIRROS_CENTROIDS.items():
            name_lower = name.lower()
            if name_lower in bairro_lower or bairro_lower in name_lower:
                return (coords[0], coords[1])

        return None

    def _normalize_bairro(self, bairro: str) -> str:
        """Normaliza nome de bairro para padronização."""
        if not bairro:
            return bairro

        bairro = bairro.strip()

        # Tentar match exato (case-insensitive)
        for b in BAIRROS_CAMACARI:
            if b.lower() == bairro.lower():
                return b

        # Tentar match parcial
        for b in BAIRROS_CAMACARI:
            if b.lower() in bairro.lower() or bairro.lower() in b.lower():
                return b

        return bairro  # Retorna como veio se não encontrar match


# Singleton
_radar_extraction: RadarExtractionService | None = None


def get_radar_extraction_service() -> RadarExtractionService:
    global _radar_extraction
    if _radar_extraction is None:
        _radar_extraction = RadarExtractionService()
    return _radar_extraction
