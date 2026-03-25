"""
PJe Scraper Service — Extrai dados de processos via Chrome CDP (DevTools Protocol).

Estratégia (calibrada com PJe 1g TJ-BA em 2026-03-25):
- Conecta ao Chrome já aberto via connect_over_cdp (porta 9222)
- A sessão PJe já está autenticada (login feito manualmente pelo defensor)
- Na página de intimações (Painel do Defensor), extrai URLs autenticadas dos processos
  (cada link tem window.open com URL + token `ca` para acesso direto)
- Abre cada processo em nova aba, extrai dados, fecha aba
- Extrai: partes (polo ativo/passivo), movimentações (timeline), metadata (dl-horizontal)
- Rate limiting entre navegações para não sobrecarregar o PJe

DOM real do PJe TJ-BA:
- JSF/RichFaces (A4J.AJAX, IDs dinâmicos j_id*)
- Tabela de intimações: #formExpedientes:tbExpedientes
- Links: a.numero-processo-expediente com onclick=window.open(URL)
- Página do processo: #maisDetalhes (dl-horizontal), #poloAtivo, #poloPassivo
- Timeline: #divTimeLine:divEventosTimeLine com .texto-movimento

IMPORTANTE: Funciona apenas localmente — requer Chrome/Chromium com --remote-debugging-port=9222.
Flag pjeScrapingEnabled no perfil do usuário controla visibilidade.
"""
from __future__ import annotations

import asyncio
import logging
import re
import time
from typing import Any

from playwright.async_api import async_playwright, Browser, BrowserContext, Page

from config import get_settings

logger = logging.getLogger("enrichment-engine.pje-scraper")

# Base URL do PJe TJ-BA
PJE_BASE_URL = "https://pje.tjba.jus.br"


class PjeScraperService:
    """
    Scraper do PJe via Chrome DevTools Protocol.

    Conecta ao Chrome já aberto do defensor (com sessão PJe ativa).
    NÃO faz login — depende de autenticação prévia manual.
    """

    def __init__(self):
        self.settings = get_settings()
        self._browser: Browser | None = None
        self._playwright: Any = None
        self._last_navigation_time: float = 0

    async def _connect(self) -> Browser:
        """Conecta ao Chrome via CDP. Reutiliza conexão existente."""
        if self._browser and self._browser.is_connected():
            return self._browser

        try:
            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.connect_over_cdp(
                self.settings.pje_cdp_url
            )
            logger.info(
                "Connected to Chrome via CDP at %s | contexts=%d",
                self.settings.pje_cdp_url,
                len(self._browser.contexts),
            )
            return self._browser
        except Exception as e:
            logger.error("Failed to connect to Chrome CDP: %s", e)
            raise ConnectionError(
                f"Não foi possível conectar ao Chrome. "
                f"Verifique se o Chrome está aberto com --remote-debugging-port=9222. "
                f"Erro: {e}"
            ) from e

    async def _get_pje_page(self) -> Page:
        """Obtém a aba do PJe no contexto existente do Chrome."""
        browser = await self._connect()
        contexts = browser.contexts
        if not contexts:
            raise ConnectionError("Nenhum contexto de navegador encontrado no Chrome.")

        context = contexts[0]
        pages = context.pages
        if not pages:
            raise ConnectionError("Nenhuma aba aberta no Chrome.")

        # Procurar aba do PJe (Painel do Defensor)
        for page in pages:
            if "pje" in page.url.lower():
                logger.info("Found PJe tab: %s", page.url)
                return page

        logger.warning("No PJe tab found, using first tab: %s", pages[0].url)
        return pages[0]

    async def _get_context(self) -> BrowserContext:
        """Obtém o contexto do browser para abrir novas abas."""
        browser = await self._connect()
        return browser.contexts[0]

    async def _rate_limit(self):
        """Respeita rate limiting entre navegações."""
        elapsed = time.time() - self._last_navigation_time
        delay = self.settings.pje_scrape_rate_limit_seconds
        if elapsed < delay:
            wait_time = delay - elapsed
            logger.debug("Rate limiting: waiting %.1fs", wait_time)
            await asyncio.sleep(wait_time)
        self._last_navigation_time = time.time()

    async def _extract_process_urls_from_intimacoes(self, page: Page) -> dict[str, str]:
        """
        Extrai URLs autenticadas dos processos da tabela de intimações.

        No PJe TJ-BA, cada link de processo tem um onclick com:
        window.open('/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=X&ca=TOKEN')

        Returns:
            Dict de {numero_processo: url_completa}
        """
        return await page.evaluate("""() => {
            var links = document.querySelectorAll('a.numero-processo-expediente');
            var urlMap = {};
            for (var i = 0; i < links.length; i++) {
                var onclick = links[i].getAttribute('onclick') || '';
                var match = onclick.match(/window\\.open\\('([^']+)'/);
                if (!match) continue;
                var url = match[1];
                var text = links[i].textContent.trim();
                // Extract CNJ number from link text (e.g., "Juri 0001634-65.2001.8.05.0039")
                var numMatch = text.match(/(\\d{7}-\\d{2}\\.\\d{4}\\.\\d\\.\\d{2}\\.\\d{4})/);
                if (numMatch) {
                    urlMap[numMatch[1]] = url;
                }
            }
            return urlMap;
        }""")

    async def _extract_processo_data(self, page: Page) -> dict[str, Any]:
        """
        Extrai todos os dados de um processo da página de detalhes.

        Seletores calibrados com PJe 1g TJ-BA (2026-03-25):
        - Metadata: dl.dl-horizontal com pares dt/dd
        - Partes: #poloAtivo table, #poloPassivo table
        - Movimentações: #divTimeLine:divEventosTimeLine com .texto-movimento
        - Documentos: .anexos dentro dos eventos da timeline
        """
        try:
            data = await page.evaluate("""() => {
                // === METADATA (dl-horizontal) ===
                var metadata = {};
                var dls = document.querySelectorAll('dl.dl-horizontal');
                for (var i = 0; i < dls.length; i++) {
                    var children = dls[i].children;
                    for (var j = 0; j < children.length - 1; j++) {
                        if (children[j].tagName === 'DT' && children[j+1].tagName === 'DD') {
                            var key = children[j].textContent.trim();
                            var val = children[j+1].textContent.trim();
                            if (key && val) metadata[key] = val;
                        }
                    }
                }

                var classe = metadata['Classe judicial'] || null;
                var assunto = metadata['Assunto'] || null;
                var jurisdicao = metadata['Jurisdição'] || null;
                var orgaoJulgador = metadata['Órgão julgador'] || null;
                var competencia = metadata['Competência'] || null;
                var segredoJustica = metadata['Segredo de justiça?'] || null;
                var autuacao = metadata['Autuação'] || null;
                var justicaGratuita = metadata['Justiça gratuita?'] || null;
                var prioridade = metadata['Prioridade?'] || null;

                // === PARTES (polo ativo / passivo) ===
                var partes = [];

                var poloAtivo = document.querySelector('#poloAtivo');
                if (poloAtivo) {
                    var rows = poloAtivo.querySelectorAll('tbody tr');
                    for (var pa = 0; pa < rows.length; pa++) {
                        var link = rows[pa].querySelector('a');
                        if (link) {
                            var nomeCompleto = link.textContent.trim();
                            // Parse "Nome (TIPO)" format
                            var match = nomeCompleto.match(/^(.+?)\\s*\\(([^)]+)\\)\\s*$/);
                            partes.push({
                                nome: match ? match[1].trim() : nomeCompleto,
                                tipo: match ? match[2].toLowerCase() : 'autor',
                                polo: 'ativo'
                            });
                        }
                    }
                }

                var poloPassivo = document.querySelector('#poloPassivo');
                if (poloPassivo) {
                    var rows2 = poloPassivo.querySelectorAll('tbody tr');
                    for (var pp = 0; pp < rows2.length; pp++) {
                        var link2 = rows2[pp].querySelector('a');
                        if (link2) {
                            var nomeCompleto2 = link2.textContent.trim();
                            var match2 = nomeCompleto2.match(/^(.+?)\\s*\\(([^)]+)\\)\\s*$/);
                            partes.push({
                                nome: match2 ? match2[1].trim() : nomeCompleto2,
                                tipo: match2 ? match2[2].toLowerCase() : 'reu',
                                polo: 'passivo'
                            });
                        }
                    }
                }

                // === MOVIMENTAÇÕES (timeline) ===
                var movimentacoes = [];
                var currentDate = '';
                var timelineDiv = document.querySelector('[id$="divEventosTimeLine"]');
                if (timelineDiv) {
                    var events = timelineDiv.querySelectorAll('.media');
                    for (var m = 0; m < events.length; m++) {
                        var ev = events[m];

                        // Date header
                        var dateSpan = ev.querySelector('.data-interna');
                        if (dateSpan) {
                            currentDate = dateSpan.textContent.trim();
                            continue;
                        }

                        // Movement entry
                        var movSpan = ev.querySelector('.texto-movimento, .texto-movimento-inativo');
                        if (movSpan) {
                            var descricao = movSpan.textContent.trim();

                            // Extract documents attached to this movement
                            var anexos = ev.querySelectorAll('.anexos a');
                            var docs = [];
                            for (var d = 0; d < anexos.length; d++) {
                                var docText = anexos[d].textContent.trim();
                                if (docText) docs.push(docText);
                            }

                            movimentacoes.push({
                                data: currentDate,
                                descricao: descricao,
                                documentos: docs,
                                inativo: movSpan.className.indexOf('inativo') > -1
                            });
                        }
                    }
                }

                // === DOCUMENTOS (do detalhe e dos anexos da timeline) ===
                var documentos = [];
                for (var mi = 0; mi < movimentacoes.length; mi++) {
                    var mov = movimentacoes[mi];
                    for (var di = 0; di < (mov.documentos || []).length; di++) {
                        var docName = mov.documentos[di];
                        // Parse "ID - Tipo (Subtipo)" format
                        var docMatch = docName.match(/^(\\d+)\\s*-\\s*(.+?)(?:\\s*\\((.+)\\))?$/);
                        documentos.push({
                            id_documento: docMatch ? docMatch[1] : null,
                            tipo: docMatch ? docMatch[2].trim() : docName,
                            descricao: docMatch && docMatch[3] ? docMatch[3].trim() : null,
                            data: mov.data
                        });
                    }
                }

                // === ÚLTIMA DECISÃO ===
                var ultimaDecisao = null;
                for (var ud = 0; ud < movimentacoes.length; ud++) {
                    var desc = (movimentacoes[ud].descricao || '').toLowerCase();
                    if (desc.indexOf('decisão') > -1 || desc.indexOf('sentença') > -1 ||
                        desc.indexOf('despacho') > -1 || desc.indexOf('acórdão') > -1) {
                        ultimaDecisao = movimentacoes[ud].descricao;
                        if (movimentacoes[ud].data) {
                            ultimaDecisao = movimentacoes[ud].data + ' - ' + ultimaDecisao;
                        }
                        break;
                    }
                }

                // === HEADER BAR (processo + partes resumido) ===
                var headerText = '';
                var navbar = document.querySelector('nav.navbar .titulo, .navbar-brand .titulo');
                if (navbar) headerText = navbar.textContent.trim();

                return {
                    classe: classe,
                    assunto: assunto,
                    vara: orgaoJulgador,
                    comarca: jurisdicao,
                    competencia: competencia,
                    segredo_justica: segredoJustica === 'SIM',
                    autuacao: autuacao,
                    justica_gratuita: justicaGratuita === 'SIM',
                    prioridade: prioridade,
                    partes: partes,
                    movimentacoes: movimentacoes.map(function(m) {
                        return { data: m.data, descricao: m.descricao, inativo: m.inativo };
                    }),
                    documentos: documentos,
                    ultima_decisao: ultimaDecisao,
                    total_movimentacoes: movimentacoes.length,
                    total_documentos: documentos.length,
                    metadata_raw: metadata
                };
            }""")

            return data

        except Exception as e:
            logger.error("Failed to extract data from processo: %s", e)
            return {"error": str(e)}

    async def scrape_processos(
        self,
        processos: list[dict[str, str | None]],
    ) -> list[dict[str, Any]]:
        """
        Escaneia múltiplos processos no PJe via Chrome CDP.

        Estratégia:
        1. Na página de intimações, extrai URLs autenticadas (com token ca)
        2. Para cada processo, abre em nova aba usando a URL autenticada
        3. Extrai dados da página de detalhes
        4. Fecha a aba

        Args:
            processos: Lista de {"numero_processo": "...", "link_pje": "..." | None}

        Returns:
            Lista de dados completos por processo.
        """
        results = []
        pje_page = await self._get_pje_page()
        context = await self._get_context()

        logger.info(
            "Starting PJe scrape | processos=%d | page=%s",
            len(processos),
            pje_page.url,
        )

        # Step 1: Extract authenticated URLs from the intimações table
        url_map = await self._extract_process_urls_from_intimacoes(pje_page)
        logger.info("Extracted %d process URLs from intimações page", len(url_map))

        for i, proc in enumerate(processos):
            numero = proc["numero_processo"]
            link = proc.get("link_pje")
            logger.info("Scraping [%d/%d]: %s", i + 1, len(processos), numero)

            await self._rate_limit()

            try:
                # Determine URL to use
                url = None
                if link:
                    url = link
                elif numero in url_map:
                    url = PJE_BASE_URL + url_map[numero]
                else:
                    # Try partial match (number without dashes/dots)
                    numero_limpo = numero.replace(".", "").replace("-", "")
                    for key, val in url_map.items():
                        if key.replace(".", "").replace("-", "") == numero_limpo:
                            url = PJE_BASE_URL + val
                            break

                if not url:
                    logger.warning("No URL found for processo %s", numero)
                    results.append({
                        "numero_processo": numero,
                        "scraped": False,
                        "error": f"URL não encontrada na página de intimações para {numero}",
                    })
                    continue

                # Step 2: Open in new tab
                new_page = await context.new_page()
                try:
                    await new_page.goto(
                        url,
                        wait_until="domcontentloaded",
                        timeout=self.settings.pje_scrape_timeout,
                    )
                    # PJe JSF needs time to render fully
                    await new_page.wait_for_timeout(4000)

                    # Step 3: Extract data
                    data = await self._extract_processo_data(new_page)
                    data["numero_processo"] = numero
                    data["scraped"] = "error" not in data
                    results.append(data)

                finally:
                    # Step 4: Always close the tab
                    await new_page.close()

            except Exception as e:
                logger.error("Error scraping processo %s: %s", numero, e)
                results.append({
                    "numero_processo": numero,
                    "scraped": False,
                    "error": str(e),
                })

        scraped = sum(1 for r in results if r.get("scraped"))
        errors = sum(1 for r in results if not r.get("scraped"))
        logger.info("PJe scrape complete | scraped=%d errors=%d", scraped, errors)

        return results

    async def close(self):
        """Desconecta do Chrome (não fecha o navegador)."""
        if self._browser:
            self._browser = None
        if self._playwright:
            try:
                await self._playwright.stop()
            except Exception:
                pass
            self._playwright = None


# === Singleton ===
_service: PjeScraperService | None = None


def get_pje_scraper_service() -> PjeScraperService:
    """Singleton do PJe scraper service."""
    global _service
    if _service is None:
        _service = PjeScraperService()
    return _service
