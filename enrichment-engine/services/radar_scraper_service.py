"""
Radar Criminal — Serviço de Scraping de Notícias Policiais
Coleta notícias de portais de Camaçari/BA e região.
Usa httpx + BeautifulSoup para portais, sem necessidade de browser.
"""
from __future__ import annotations

import hashlib
import logging
import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from config import get_settings

logger = logging.getLogger("enrichment-engine.radar-scraper")

# User-Agent rotativo para evitar bloqueio
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
]

# Palavras-chave para detectar notícias policiais
KEYWORDS_POLICIAL = [
    "homicídio", "homicidio", "assassinato", "assassinado", "morto a tiros",
    "tentativa de homicídio", "baleado", "esfaqueado",
    "tráfico", "trafico", "drogas", "entorpecentes", "cocaína", "maconha", "crack",
    "roubo", "roubado", "assalto", "assaltante", "latrocínio",
    "furto", "furtado", "arrombamento",
    "violência doméstica", "violencia domestica", "maria da penha", "agredida", "ameaça",
    "estupro", "abuso sexual", "importunação sexual",
    "lesão corporal", "lesao corporal", "agredido", "agressão",
    "arma de fogo", "revólver", "pistola", "porte ilegal",
    "estelionato", "golpe", "fraude",
    "preso", "detido", "flagrante", "mandado de prisão", "operação policial",
    "delegacia", "polícia civil", "polícia militar", "CICOM", "CIPE",
    "ocorrência", "BO", "boletim de ocorrência",
]

# Palavras-chave FORTES para detectar notícias policiais no título
KEYWORDS_POLICIAL_TITULO = [
    "homicídio", "homicidio", "assassinato", "assassinado", "morto a tiros",
    "tentativa de homicídio", "tentativa de homicidio", "baleado", "esfaqueado",
    "tráfico", "trafico", "drogas", "entorpecentes",
    "roubo", "roubado", "assalto", "latrocínio", "latrocinio",
    "furto", "furtado",
    "violência doméstica", "violencia domestica", "maria da penha",
    "estupro", "abuso sexual",
    "lesão corporal", "lesao corporal",
    "arma de fogo", "porte ilegal",
    "preso em flagrante", "preso com", "operação policial", "operacao policial",
    "mandado de prisão", "mandado de prisao",
    "estelionato", "fraude",
    "traficante", "suspeito preso", "acusado preso",
]

# Palavras-chave para verificar se a notícia é da região de Camaçari/RMS
KEYWORDS_CAMACARI_REGIAO = [
    "camaçari", "camacari", "camaçarí", "camacarí",
    # Distritos e bairros de Camaçari
    "abrantes", "catu de abrantes", "vila de abrantes", "arembepe",
    "barra do jacuípe", "barra do jacuipe", "guarajuba", "jauá", "jaua",
    "monte gordo", "parafuso", "gleba", "phoc",
    "polo petroquímico", "polo industrial", "pólo petroquímico",
    "dias d'ávila", "dias d avila", "dias davila",
    # Delegacias da região
    "18ª delegacia", "18a delegacia", "cicom camaçari",
    "delegacia de camaçari", "dpc camaçari", "dpc camacari",
    "26ª cipm", "26a cipm", "31ª cipm", "31a cipm",
    # Referências locais
    "cia-rms", "cia rms", "rms norte",
]


class RadarScraperService:
    """Scraper de notícias policiais de portais da região de Camaçari."""

    def __init__(self):
        self.settings = get_settings()
        self._client: httpx.AsyncClient | None = None
        self._ua_index = 0

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0),
                follow_redirects=True,
                limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
            )
        return self._client

    def _get_user_agent(self) -> str:
        ua = USER_AGENTS[self._ua_index % len(USER_AGENTS)]
        self._ua_index += 1
        return ua

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    # === Main scraping pipeline ===

    async def scrape_all_fontes(self) -> list[dict[str, Any]]:
        """Scrape todas as fontes ativas e retorna notícias novas."""
        from services.supabase_service import get_supabase_service

        supa = get_supabase_service()
        client_db = supa._get_client()

        # Buscar fontes ativas
        result = client_db.table("radar_fontes").select("*").eq("ativo", True).execute()
        fontes = result.data or []

        if not fontes:
            logger.warning("Nenhuma fonte ativa encontrada")
            return []

        # Buscar URLs já coletadas para deduplicação
        existing = client_db.table("radar_noticias").select("url").execute()
        existing_urls = {r["url"] for r in (existing.data or [])}

        all_noticias = []

        for fonte in fontes:
            try:
                noticias = await self._scrape_fonte(fonte, existing_urls)
                all_noticias.extend(noticias)

                # Atualizar ultima_coleta
                client_db.table("radar_fontes").update({
                    "ultima_coleta": datetime.now(timezone.utc).isoformat(),
                }).eq("id", fonte["id"]).execute()

                logger.info(
                    "Scraped | fonte=%s noticias=%d",
                    fonte["nome"], len(noticias),
                )
            except Exception as e:
                logger.error("Falha ao scraper fonte=%s: %s", fonte["nome"], str(e))
                continue

        return all_noticias

    async def _scrape_fonte(
        self, fonte: dict, existing_urls: set[str]
    ) -> list[dict[str, Any]]:
        """Scrape uma fonte específica."""
        tipo = fonte.get("tipo", "portal")

        if tipo == "portal":
            return await self._scrape_portal(fonte, existing_urls)
        else:
            logger.info("Tipo %s não implementado ainda para %s", tipo, fonte["nome"])
            return []

    async def _scrape_portal(
        self, fonte: dict, existing_urls: set[str]
    ) -> list[dict[str, Any]]:
        """Scrape portal de notícias genérico."""
        client = self._get_client()
        base_url = fonte["url"].rstrip("/")
        nome_fonte = fonte["nome"]

        # Tentar buscar páginas de notícias policiais
        urls_to_try = self._get_search_urls(base_url)
        noticias = []

        for page_url in urls_to_try:
            try:
                response = await client.get(
                    page_url,
                    headers={"User-Agent": self._get_user_agent()},
                )
                if response.status_code != 200:
                    continue

                soup = BeautifulSoup(response.text, "html.parser")

                # Extrair links de artigos
                links = self._extract_article_links(soup, base_url)
                logger.info("Found %d links on %s", len(links), page_url)

                for link_url, link_title in links:
                    if link_url in existing_urls:
                        continue
                    if not self._is_police_news(link_title):
                        continue

                    try:
                        noticia = await self._scrape_article(
                            link_url, nome_fonte, fonte.get("id")
                        )
                        if noticia:
                            noticias.append(noticia)
                            existing_urls.add(link_url)
                    except Exception as e:
                        logger.debug("Erro ao scraper artigo %s: %s", link_url, str(e))
                        continue

            except Exception as e:
                logger.debug("Erro ao acessar %s: %s", page_url, str(e))
                continue

        return noticias

    def _get_search_urls(self, base_url: str) -> list[str]:
        """Gera URLs para buscar notícias policiais em um portal."""
        paths = [
            "/",
            "/policia",
            "/policial",
            "/seguranca",
            "/seguranca-publica",
            "/categoria/policia",
            "/categoria/policial",
            "/categoria/seguranca",
            "/editoria/policia",
            "/editoria/seguranca",
            "/tag/policia",
            "/noticias/policia",
            "/noticias/seguranca",
            "/?s=polícia+camaçari",
            "/?s=homicídio+camaçari",
            "/page/1",
        ]

        # Específicos por domínio
        domain = base_url.lower()
        if "g1.globo.com" in domain:
            paths = [
                "/ba/bahia/noticia",
                "/ba/bahia/",
            ]
        elif "bnews" in domain:
            paths = ["/cidades", "/cidades/policia"]
        elif "correio24horas" in domain or "correio" in domain:
            paths = ["/noticia/policia", "/policia"]
        elif "atarde" in domain:
            paths = ["/bahia", "/bahia/policia"]
        elif "bahianoticias" in domain:
            paths = ["/municipios", "/seguranca-publica"]

        return [f"{base_url}{p}" for p in paths]

    def _extract_article_links(
        self, soup: BeautifulSoup, base_url: str
    ) -> list[tuple[str, str]]:
        """Extrai links de artigos de uma página."""
        links: list[tuple[str, str]] = []
        seen = set()

        # Buscar links em tags <a> com texto relevante
        for a_tag in soup.find_all("a", href=True):
            href = a_tag.get("href", "")
            title = a_tag.get_text(strip=True)

            if not href or not title or len(title) < 20:
                continue

            # Normalizar URL
            url = urljoin(base_url, href)

            # Filtrar URLs que não são artigos
            if any(
                skip in url
                for skip in [
                    "/author/", "/tag/", "/categoria/", "/page/",
                    "#", "javascript:", "mailto:", ".pdf", ".jpg", ".png",
                    "/wp-admin", "/login", "/feed",
                ]
            ):
                continue

            if url in seen:
                continue
            seen.add(url)

            links.append((url, title))

        return links[:50]  # Limitar a 50 links por página

    async def _scrape_article(
        self, url: str, fonte_nome: str, fonte_id: int | None
    ) -> dict[str, Any] | None:
        """Scrape conteúdo de um artigo individual."""
        client = self._get_client()

        response = await client.get(
            url,
            headers={"User-Agent": self._get_user_agent()},
        )
        if response.status_code != 200:
            return None

        html = response.text
        soup = BeautifulSoup(html, "html.parser")

        # Extrair título
        titulo = self._extract_title(soup)
        if not titulo:
            return None

        # Extrair corpo do artigo
        corpo = self._extract_body(soup)
        if not corpo or len(corpo) < 100:
            return None

        # === FILTRO REGIONAL ===
        # Verificar se a notícia é da região de Camaçari/RMS
        if not self._is_camacari_region(titulo, corpo):
            logger.debug("Ignorando notícia fora de Camaçari: %s", titulo[:80])
            return None

        # Extrair data de publicação
        data_pub = self._extract_date(soup)

        # Extrair imagem principal
        imagem_url = self._extract_image(soup, url)

        return {
            "url": url,
            "fonte": fonte_nome,
            "titulo": titulo[:500],
            "corpo": corpo[:50000],
            "data_publicacao": data_pub,
            "imagem_url": imagem_url,
            "enrichment_status": "pending",
            "raw_html": html[:200000],
        }

    def _extract_title(self, soup: BeautifulSoup) -> str | None:
        """Extrai título do artigo."""
        # Tentar <h1> primeiro
        h1 = soup.find("h1")
        if h1:
            title = h1.get_text(strip=True)
            if len(title) > 10:
                return title

        # Fallback: og:title
        og = soup.find("meta", property="og:title")
        if og and og.get("content"):
            return og["content"].strip()

        # Fallback: <title>
        title_tag = soup.find("title")
        if title_tag:
            return title_tag.get_text(strip=True)

        return None

    def _extract_body(self, soup: BeautifulSoup) -> str | None:
        """Extrai corpo principal do artigo."""
        # Tentar seletores comuns de conteúdo
        selectors = [
            "article .entry-content",
            "article .post-content",
            "article .content",
            ".entry-content",
            ".post-content",
            ".article-content",
            ".article-body",
            ".materia-texto",
            ".texto-materia",
            ".content-text",
            ".news-body",
            "article",
            '[itemprop="articleBody"]',
        ]

        for selector in selectors:
            elem = soup.select_one(selector)
            if elem:
                # Remover scripts, styles, ads
                for tag in elem.find_all(["script", "style", "iframe", "nav", "footer"]):
                    tag.decompose()

                text = elem.get_text(separator="\n", strip=True)
                if len(text) > 100:
                    return text

        # Fallback: todos os <p> dentro do <main> ou <article>
        container = soup.find("main") or soup.find("article") or soup.find("body")
        if container:
            paragraphs = container.find_all("p")
            text = "\n".join(p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 20)
            if len(text) > 100:
                return text

        return None

    def _extract_date(self, soup: BeautifulSoup) -> str | None:
        """Extrai data de publicação."""
        # Meta tags padrão
        for prop in ["article:published_time", "datePublished", "pubdate"]:
            meta = soup.find("meta", property=prop) or soup.find("meta", attrs={"name": prop})
            if meta and meta.get("content"):
                return meta["content"]

        # Time tag com datetime
        time_tag = soup.find("time", datetime=True)
        if time_tag:
            return time_tag["datetime"]

        # JSON-LD
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                import json
                data = json.loads(script.string or "")
                if isinstance(data, dict):
                    date = data.get("datePublished") or data.get("dateCreated")
                    if date:
                        return date
                elif isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict):
                            date = item.get("datePublished") or item.get("dateCreated")
                            if date:
                                return date
            except (ValueError, TypeError):
                continue

        return None

    def _extract_image(self, soup: BeautifulSoup, base_url: str) -> str | None:
        """Extrai imagem principal do artigo."""
        # og:image
        og = soup.find("meta", property="og:image")
        if og and og.get("content"):
            return og["content"]

        # Primeira imagem grande no artigo
        article = soup.find("article") or soup.find("main")
        if article:
            img = article.find("img", src=True)
            if img:
                src = img.get("src", "")
                return urljoin(base_url, src)

        return None

    def _is_police_news(self, title: str) -> bool:
        """Verifica se um título indica notícia policial (usando keywords fortes)."""
        if not title:
            return False
        title_lower = title.lower()
        return any(kw in title_lower for kw in KEYWORDS_POLICIAL_TITULO)

    def _is_camacari_region(self, titulo: str, corpo: str | None) -> bool:
        """
        Verifica se a notícia é da região de Camaçari/RMS.
        Prioriza o título (peso maior) e apenas os primeiros 2000 chars do corpo.
        """
        titulo_lower = titulo.lower()

        # 1. Se o título contém keyword regional → aceitar imediatamente
        if any(kw in titulo_lower for kw in KEYWORDS_CAMACARI_REGIAO):
            return True

        # 2. Verificar apenas primeiros 2000 chars do corpo (evita falsas menções)
        if corpo:
            trecho_inicial = corpo[:2000].lower()
            if any(kw in trecho_inicial for kw in KEYWORDS_CAMACARI_REGIAO):
                return True

        return False

    # === Salvar no banco ===

    async def save_noticias(self, noticias: list[dict[str, Any]]) -> int:
        """Salva notícias no banco, retornando quantidade inserida."""
        if not noticias:
            return 0

        from services.supabase_service import get_supabase_service

        supa = get_supabase_service()
        client_db = supa._get_client()

        saved = 0
        for noticia in noticias:
            try:
                # Upsert com URL como chave única
                client_db.table("radar_noticias").upsert(
                    noticia,
                    on_conflict="url",
                ).execute()
                saved += 1
            except Exception as e:
                logger.debug("Erro ao salvar notícia %s: %s", noticia.get("url"), str(e))
                continue

        logger.info("Salvas %d/%d notícias", saved, len(noticias))
        return saved


# Singleton
_radar_scraper: RadarScraperService | None = None


def get_radar_scraper_service() -> RadarScraperService:
    global _radar_scraper
    if _radar_scraper is None:
        _radar_scraper = RadarScraperService()
    return _radar_scraper
