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
    "executado", "execução", "execucao", "morto", "morte violenta",
    "corpo encontrado", "cadáver", "cadaver", "óbito",
    "tráfico", "trafico", "drogas", "entorpecentes",
    "roubo", "roubado", "assalto", "latrocínio", "latrocinio",
    "furto", "furtado", "arrastão", "arrastaõ",
    "violência doméstica", "violencia domestica", "maria da penha",
    "estupro", "abuso sexual",
    "lesão corporal", "lesao corporal",
    "arma de fogo", "porte ilegal", "tiro", "disparo",
    "preso em flagrante", "preso com", "operação policial", "operacao policial",
    "mandado de prisão", "mandado de prisao",
    "estelionato", "fraude",
    "traficante", "suspeito preso", "acusado preso",
    "crime", "policia", "polícia", "delegacia",
    # Feminicídio e violência de gênero
    "feminicídio", "feminicidio", "tentativa de feminicídio", "tentativa de feminicidio",
    # "preso" isolado — cobre "é preso", "foi preso", "foram presos"
    "preso", "presos", "presa", "presas",
    # Condenado / capturado
    "condenado", "capturado", "capturada", "foragido", "foragida",
    # Baralho do crime (difusão policial)
    "baralho do crime",
    # Outros verbos de prisão
    "detido", "detida", "flagrante",
]

# Palavras-chave ESTRITAS — apenas "camaçari" e localidades inconfundíveis
KEYWORDS_CAMACARI_STRICT = [
    "camaçari", "camacari", "camaçarí", "camacarí",
    "arembepe", "guarajuba", "jauá", "jaua", "monte gordo",
    "barra do jacuípe", "barra do jacuipe",
    "catu de abrantes", "vila de abrantes",
    "parafuso", "phoc", "polo petroquímico", "polo industrial",
    "18ª delegacia", "18a delegacia", "cicom camaçari",
    "delegacia de camaçari", "dpc camaçari",
    "26ª cipm", "31ª cipm", "12º bpm", "12o bpm",
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

        if tipo == "rss":
            return await self._scrape_rss(fonte, existing_urls)
        elif tipo == "portal":
            return await self._scrape_portal(fonte, existing_urls)
        else:
            logger.info("Tipo %s não implementado para %s", tipo, fonte["nome"])
            return []

    async def _scrape_portal(
        self, fonte: dict, existing_urls: set[str]
    ) -> list[dict[str, Any]]:
        """Scrape portal de notícias genérico."""
        client = self._get_client()
        base_url = fonte["url"].rstrip("/")
        nome_fonte = fonte["nome"]
        confiabilidade = fonte.get("confiabilidade", "regional")

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
                    # Para fontes regionais: exigir "camaçari" no título para evitar ruído de outros municípios
                    if confiabilidade == "regional":
                        link_lower = link_title.lower()
                        has_camacari = any(kw in link_lower for kw in ["camaçari", "camacari"])
                        if not has_camacari:
                            # Calcular score parcial — só aceita sem "camaçari" se score for alto o suficiente
                            score_titulo = self._calculate_relevancia_score(link_title, None)
                            if score_titulo < 25:
                                continue

                    try:
                        noticia = await self._scrape_article(
                            link_url, nome_fonte, fonte.get("id"), confiabilidade
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

    async def _scrape_rss(
        self, fonte: dict, existing_urls: set[str]
    ) -> list[dict[str, Any]]:
        """Scrape fonte de tipo RSS (ex: Google News RSS).

        Para fontes Google News:
        - Bypassa filtros de keywords e região (query já garante relevância)
        - Tenta scraping do artigo completo; usa dados do RSS como fallback
          (muitos portais ficam atrás de paywall ou requerem JS)
        """
        import xml.etree.ElementTree as ET

        client = self._get_client()
        url = fonte["url"]
        nome_fonte = fonte["nome"]
        confiabilidade = fonte.get("confiabilidade", "local")  # RSS já é pré-filtrado

        try:
            response = await client.get(
                url,
                headers={"User-Agent": self._get_user_agent()},
            )
            if response.status_code != 200:
                logger.warning("RSS %s retornou status %d", url, response.status_code)
                return []

            root = ET.fromstring(response.content)
        except Exception as e:
            logger.error("Falha ao buscar RSS %s: %s", url, str(e))
            return []

        noticias = []

        # Suporte a RSS 2.0 e Atom
        items = root.findall(".//item")  # RSS 2.0
        if not items:
            # Atom
            ns = {"atom": "http://www.w3.org/2005/Atom"}
            items = root.findall(".//atom:entry", ns)

        # Fonte Google News: já pré-filtrada pela query — tratamento especial
        is_google_news = "news.google.com" in url

        for item in items[:30]:
            # RSS 2.0
            titulo = item.findtext("title", "").strip()
            link = item.findtext("link", "").strip()
            pub_date = item.findtext("pubDate", "") or item.findtext("published", "")
            descricao = item.findtext("description", "") or item.findtext("summary", "")

            # Atom: link está em <link href="...">
            if not link:
                link_elem = item.find("{http://www.w3.org/2005/Atom}link")
                if link_elem is not None:
                    link = link_elem.get("href", "")

            if not link or not titulo:
                continue
            if link in existing_urls:
                continue

            if is_google_news:
                # Google News: query já garante que é notícia policial de Camaçari
                # Tentar scraping do artigo completo; fallback para dados do RSS
                noticia = None
                try:
                    noticia = await self._scrape_article(
                        link, nome_fonte, fonte.get("id"), confiabilidade,
                        rss_titulo=titulo, rss_descricao=descricao, rss_pub_date=pub_date,
                    )
                except Exception as e:
                    logger.debug("Scraping falhou para %s: %s — usando dados RSS", link, str(e))

                if not noticia:
                    # Fallback: criar notícia diretamente dos dados RSS
                    noticia = self._create_noticia_from_rss(
                        titulo=titulo, link=link, pub_date=pub_date,
                        descricao=descricao, fonte_nome=nome_fonte, fonte_id=fonte.get("id"),
                    )

                if noticia:
                    noticias.append(noticia)
                    existing_urls.add(link)

            else:
                # Outros RSS: aplicar filtros normais
                if not self._is_police_news(titulo):
                    continue
                if not self._is_camacari_region(titulo, descricao, confiabilidade):
                    continue
                try:
                    noticia = await self._scrape_article(
                        link, nome_fonte, fonte.get("id"), confiabilidade
                    )
                    if noticia:
                        noticias.append(noticia)
                        existing_urls.add(link)
                except Exception as e:
                    logger.debug("Erro ao scraper item RSS %s: %s", link, str(e))
                    continue

        logger.info("RSS %s: %d notícias novas", nome_fonte, len(noticias))
        return noticias

    def _create_noticia_from_rss(
        self,
        titulo: str,
        link: str,
        pub_date: str,
        descricao: str,
        fonte_nome: str,
        fonte_id: int | None,
    ) -> dict[str, Any] | None:
        """Cria notícia a partir dos dados brutos do RSS (fallback quando scraping falha).

        Usado principalmente para Google News, onde o artigo real pode estar
        atrás de paywall ou exigir JavaScript. O título + snippet do RSS já
        são suficientes para enriquecimento posterior via IA.
        """
        from bs4 import BeautifulSoup as _BS

        if not titulo or not link:
            return None

        # Limpar HTML da descrição RSS (Google News usa HTML na tag <description>)
        corpo_limpo = ""
        if descricao:
            soup = _BS(descricao, "html.parser")
            corpo_limpo = soup.get_text(separator=" ", strip=True)

        # Score garantido: Google News retorna resultados de Camaçari por definição
        relevancia_score = self._calculate_relevancia_score(titulo, corpo_limpo or None)
        # Garantir mínimo de 45 para itens Google News (query já é o filtro)
        relevancia_score = max(45, relevancia_score)

        return {
            "url": link,
            "fonte": fonte_nome,
            "fonte_id": fonte_id,
            "titulo": titulo[:500],
            "corpo": corpo_limpo[:5000] if corpo_limpo else f"[Notícia via Google News] {titulo}",
            "data_publicacao": pub_date or None,
            "imagem_url": None,
            "enrichment_status": "pending",
            "raw_html": "",
            "content_hash": self._generate_content_hash(titulo, corpo_limpo or titulo),
            "relevancia_score": relevancia_score,
        }

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
                "/ba/bahia/tag/camacari/",
                "/ba/bahia/noticia",   # fallback
            ]
        elif "bnews" in domain:
            paths = ["/tag/camacari", "/cidades/camacari", "/cidades/policia"]
        elif "correio24horas" in domain or "correio" in domain:
            paths = ["/tag/camacari", "/noticia/camacari", "/policia"]
        elif "atarde" in domain:
            paths = ["/tag/camacari", "/municipios/camacari", "/bahia/policia"]
        elif "bahianoticias" in domain:
            paths = ["/municipios/camacari", "/seguranca-publica", "/municipios"]
        elif "relatabahia" in domain:
            paths = ["/policia", "/noticias"]
        elif "maisregiao" in domain:
            paths = ["/camacari-ba", "/camacari", "/ultimas-noticias"]
        elif "camacarifatosefotos" in domain:
            paths = ["/index.php/policial", "/index.php/cidade"]
        elif "bahiacomenta" in domain:
            paths = ["/camacari-ba", "/policia"]
        elif "bahianoar" in domain:
            paths = ["/cidades/camacari", "/cidades/camacari/"]

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
        self,
        url: str,
        fonte_nome: str,
        fonte_id: int | None,
        confiabilidade: str = "regional",
        *,
        rss_titulo: str | None = None,
        rss_descricao: str | None = None,
        rss_pub_date: str | None = None,
    ) -> dict[str, Any] | None:
        """Scrape conteúdo de um artigo individual.

        Para itens Google News, aceita título/descrição RSS como fallback:
        - Se o scraping falhar ou corpo for muito curto, usa dados do RSS
        - Garante que o artigo seja registrado mesmo quando o portal bloqueia
        """
        client = self._get_client()

        response = await client.get(
            url,
            headers={"User-Agent": self._get_user_agent()},
        )
        if response.status_code != 200:
            return None

        html = response.text
        soup = BeautifulSoup(html, "html.parser")

        # Extrair título — preferir scraped, fallback para RSS
        titulo = self._extract_title(soup)
        if not titulo:
            titulo = rss_titulo
        if not titulo:
            return None

        # Extrair corpo do artigo — fallback para snippet RSS se muito curto
        corpo = self._extract_body(soup)
        if (not corpo or len(corpo) < 100) and rss_descricao:
            from bs4 import BeautifulSoup as _BS
            corpo = _BS(rss_descricao, "html.parser").get_text(separator=" ", strip=True)
        if not corpo or len(corpo) < 30:
            return None

        # Extrair data de publicação
        data_pub = self._extract_date(soup)

        # === FILTRO DE DATA ===
        # Rejeitar artigos com mais de 60 dias (evita scraping de arquivos antigos)
        if data_pub:
            try:
                from email.utils import parsedate_to_datetime

                # Normalizar formato ISO
                dp_str = data_pub.replace("Z", "+00:00")
                # Tentar parsear — aceitar apenas se dentro de 60 dias
                try:
                    pub_dt = datetime.fromisoformat(dp_str)
                except ValueError:
                    # Formato alternativo (ex: RFC 2822 do RSS)
                    pub_dt = parsedate_to_datetime(data_pub)

                if pub_dt.tzinfo is None:
                    pub_dt = pub_dt.replace(tzinfo=timezone.utc)

                idade_dias = (datetime.now(timezone.utc) - pub_dt).days
                if idade_dias > 60:
                    logger.debug("Ignorando artigo antigo (%d dias): %s", idade_dias, titulo[:80])
                    return None
            except Exception:
                pass  # Se não conseguir parsear a data, deixa passar

        # === FILTRO DE RELEVÂNCIA ===
        relevancia_score = self._calculate_relevancia_score(titulo, corpo)

        # Itens Google News têm garantia mínima de 45 (query já filtra por Camaçari)
        if rss_titulo is not None:
            relevancia_score = max(45, relevancia_score)
        elif relevancia_score < 35:
            logger.debug("Score baixo (%d), rejeitando: %s", relevancia_score, titulo[:80])
            return None

        if 35 <= relevancia_score < 60 and rss_titulo is None:
            ajuste = await self._pretriagem_ia(titulo, corpo[:200] if corpo else "")
            relevancia_score = max(0, min(100, relevancia_score + ajuste))
            if relevancia_score < 35:
                logger.debug("IA rejeitou notícia (score ajustado: %d): %s", relevancia_score, titulo[:80])
                return None

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
            "content_hash": self._generate_content_hash(titulo, corpo),
            "relevancia_score": relevancia_score,
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

    def _calculate_relevancia_score(self, titulo: str, corpo: str | None) -> int:
        """Calcula score de relevância 0-100 para triagem de notícias de Camaçari."""
        score = 0
        titulo_lower = titulo.lower()
        corpo_trecho = (corpo or "")[:500].lower()

        # Camaçari explícito no título (+35)
        if any(kw in titulo_lower for kw in ["camaçari", "camacari", "camaçarí", "camacarí"]):
            score += 35
        # Bairro/distrito de Camaçari no título (+25) — só se não teve +35
        elif any(kw in titulo_lower for kw in KEYWORDS_CAMACARI_REGIAO):
            score += 25

        # Camaçari no início do corpo (+15)
        if any(kw in corpo_trecho for kw in ["camaçari", "camacari"]):
            score += 15

        # Delegacia/unidade policial de Camaçari (+15)
        texto_combinado = titulo_lower + " " + corpo_trecho
        if any(kw in texto_combinado for kw in [
            "18ª delegacia", "18a delegacia", "delegacia de camaçari", "dpc camaçari",
            "26ª cipm", "26a cipm", "31ª cipm", "31a cipm", "cicom camaçari",
        ]):
            score += 15

        # Crime forte no título (+10)
        if any(kw in titulo_lower for kw in [
            "homicídio", "homicidio", "tráfico", "trafico", "baleado",
            "preso em flagrante", "assassinado", "assassinato",
        ]):
            score += 10

        return min(score, 100)

    async def _pretriagem_ia(self, titulo: str, trecho: str) -> int:
        """Pré-triagem IA para notícias na zona cinzenta (score 35-59).
        Retorna ajuste de score: -10 a +10.
        """
        try:
            import anthropic
            import json as _json

            client = anthropic.Anthropic()
            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=64,
                timeout=5.0,
                messages=[{
                    "role": "user",
                    "content": (
                        "Você é um classificador de notícias policiais de Camaçari-BA.\n"
                        f"Título: {titulo}\n"
                        f"Trecho: {trecho}\n\n"
                        "O crime ocorreu em Camaçari ou municípios limítrofes (Dias d'Ávila, Simões Filho, Lauro de Freitas, Madre de Deus)?\n"
                        'Responda APENAS JSON: {"relevante": true/false, "ajuste": número inteiro entre -10 e 10}'
                    ),
                }],
            )
            result = _json.loads(msg.content[0].text.strip())
            return int(result.get("ajuste", 0))
        except Exception as e:
            logger.debug("Pré-triagem IA falhou: %s", str(e))
            return 0  # Em caso de erro, não ajusta o score

    def _is_camacari_region(self, titulo: str, corpo: str | None, confiabilidade: str = "regional") -> bool:
        """
        Verifica se a notícia é da região de Camaçari/RMS.
        Regras variam por confiabilidade da fonte.
        """
        titulo_lower = titulo.lower()

        if confiabilidade == "local":
            # Fonte local: exigir keyword regional no título OU keyword ESTRITA nos primeiros 300 chars do corpo
            if any(kw in titulo_lower for kw in KEYWORDS_CAMACARI_REGIAO):
                return True
            if corpo:
                trecho = corpo[:300].lower()  # reduzido de 1000 para 300
                if any(kw in trecho for kw in KEYWORDS_CAMACARI_STRICT):  # exigir keyword ESTRITA no corpo (não só regional)
                    return True
            return False

        elif confiabilidade == "estadual":
            # Fonte estadual: exigir "camaçari" EXPLICITAMENTE no título
            return any(kw in titulo_lower for kw in ["camaçari", "camacari", "camaçarí"])

        else:  # "regional" (padrão)
            # Fonte regional: exigir keyword estrita no título
            if any(kw in titulo_lower for kw in KEYWORDS_CAMACARI_STRICT):
                return True
            return False

    # === Helpers ===

    @staticmethod
    def _generate_content_hash(titulo: str, corpo: str) -> str:
        """SHA256 de titulo + primeiros 500 chars do corpo para deduplicação."""
        content = f"{titulo.strip().lower()}{corpo.strip()[:500].lower()}"
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

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
                content_hash = noticia.get("content_hash")

                # Verificar se hash já existe (deduplicação por conteúdo, URLs diferentes)
                if content_hash:
                    existing = client_db.table("radar_noticias") \
                        .select("id, url") \
                        .eq("content_hash", content_hash) \
                        .execute()
                    if existing.data:
                        logger.info(
                            "Artigo duplicado detectado (hash=%s...) url=%s — ignorando",
                            content_hash[:8],
                            noticia.get("url"),
                        )
                        continue

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
