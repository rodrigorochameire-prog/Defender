"""
SIGA Scraper Service — Extrai dados de carreira via Chrome CDP (DevTools Protocol).

Estratégia:
- Conecta ao Chrome já aberto via connect_over_cdp (porta 9222)
- A sessão SIGA já está autenticada (login feito manualmente pelo defensor)
- Navega pelas seções de Carreira (/Carreira/Licenca, /Carreira/OutrasAusencias, etc.)
- Extrai tabelas HTML (thead th + tbody tr td) via page.evaluate
- Parseia cada linha com os parsers do siga_parsers.py

IMPORTANTE: Funciona apenas localmente — requer Chrome com --remote-debugging-port=9222
e sessão SIGA autenticada (login feito manualmente pelo defensor).
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

from playwright.async_api import async_playwright, Browser, Page

from config import get_settings
from services.siga_parsers import (
    parse_afastamento,
    parse_ferias,
    parse_licenca,
    parse_outra_ausencia,
)

logger = logging.getLogger("enrichment-engine.siga-scraper")

# Seções de carreira: (chave_resultado, path_relativo, parser)
SECOES = [
    ("licencas", "/Carreira/Licenca", parse_licenca),
    ("outras", "/Carreira/OutrasAusencias", parse_outra_ausencia),
    ("ferias", "/Carreira/Ferias", parse_ferias),
    ("afastamentos", "/Carreira/Afastamentos", parse_afastamento),
]

# JS que lê a primeira <table> da página: headers (thead th) + rows (tbody tr td)
_EXTRACT_TABLE_JS = """() => {
    var table = document.querySelector('table');
    if (!table) return { headers: [], rows: [] };

    var headers = [];
    var thead = table.querySelector('thead');
    if (thead) {
        var ths = thead.querySelectorAll('th');
        for (var i = 0; i < ths.length; i++) {
            headers.push(ths[i].textContent.trim());
        }
    }

    var rows = [];
    var tbody = table.querySelector('tbody');
    if (tbody) {
        var trs = tbody.querySelectorAll('tr');
        for (var r = 0; r < trs.length; r++) {
            var cells = [];
            var tds = trs[r].querySelectorAll('td');
            for (var c = 0; c < tds.length; c++) {
                cells.push(tds[c].textContent.trim());
            }
            if (cells.length > 0) {
                rows.push(cells);
            }
        }
    }

    return { headers: headers, rows: rows };
}"""


class SigaScraperService:
    """
    Scraper do SIGA via Chrome DevTools Protocol.

    Conecta ao Chrome já aberto do defensor (com sessão SIGA ativa).
    NÃO faz login — depende de autenticação prévia manual.
    """

    def __init__(self) -> None:
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
                self.settings.siga_cdp_url
            )
            logger.info(
                "Connected to Chrome via CDP at %s | contexts=%d",
                self.settings.siga_cdp_url,
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

    async def _get_siga_page(self) -> Page:
        """
        Obtém a aba do SIGA no contexto existente do Chrome.

        Levanta ConnectionError se:
        - Nenhuma aba com siga.defensoria.ba.def.br for encontrada.
        - A aba estiver redirecionada para a página de login.
        """
        browser = await self._connect()
        contexts = browser.contexts
        if not contexts:
            raise ConnectionError("Nenhum contexto de navegador encontrado no Chrome.")

        context = contexts[0]
        pages = context.pages
        if not pages:
            raise ConnectionError("Nenhuma aba aberta no Chrome.")

        for page in pages:
            url = page.url
            if "siga.defensoria.ba.def.br" in url:
                # Detecta redirecionamento para login (Keycloak ou formulário nativo)
                if any(
                    kw in url.lower()
                    for kw in ("login", "keycloak", "auth/realms", "signin", "/login")
                ):
                    raise ConnectionError(
                        "A aba do SIGA está redirecionada para a página de login. "
                        "Faça login no SIGA manualmente antes de usar este endpoint."
                    )
                logger.info("Found SIGA tab: %s", url)
                return page

        raise ConnectionError(
            "Nenhuma aba do SIGA encontrada no Chrome. "
            "Abra o SIGA (siga.defensoria.ba.def.br) no Chrome antes de usar este endpoint."
        )

    async def _rate_limit(self) -> None:
        """Respeita rate limiting entre navegações."""
        elapsed = time.time() - self._last_navigation_time
        delay = self.settings.siga_scrape_rate_limit_seconds
        if elapsed < delay:
            wait_time = delay - elapsed
            logger.debug("Rate limiting: waiting %.1fs", wait_time)
            await asyncio.sleep(wait_time)
        self._last_navigation_time = time.time()

    async def _extract_table(self, page: Page, url: str) -> dict[str, Any]:
        """
        Navega para url e extrai a primeira <table> da página.

        Executa page.goto com wait_until="domcontentloaded", aplica rate limit,
        depois avalia JS para ler thead th + tbody tr td.

        Returns:
            {"headers": [str, ...], "rows": [[str, ...], ...]}
        """
        await page.goto(
            url,
            wait_until="domcontentloaded",
            timeout=self.settings.siga_scrape_timeout,
        )
        await self._rate_limit()
        return await page.evaluate(_EXTRACT_TABLE_JS)

    async def extrair_carreira(self) -> dict[str, Any]:
        """
        Extrai os dados das 4 seções de Carreira do SIGA.

        Itera SECOES sequencialmente; falhas por seção são registradas em `errors`
        sem interromper as demais seções.

        Returns:
            {
                "licencas": [...],
                "outras": [...],
                "ferias": [...],
                "afastamentos": [...],
                "errors": [...],
            }
        """
        page = await self._get_siga_page()

        result: dict[str, Any] = {
            "licencas": [],
            "outras": [],
            "ferias": [],
            "afastamentos": [],
            "errors": [],
        }

        for key, path, parser in SECOES:
            try:
                url = self.settings.siga_base_url.rstrip("/") + path
                logger.info("Extracting SIGA section '%s' from %s", key, url)
                table_data = await self._extract_table(page, url)
                headers: list[str] = table_data["headers"]
                rows: list[list[str]] = table_data["rows"]

                for row_cells in rows:
                    # Pular linha de placeholder ("Nenhum registro encontrado")
                    if row_cells and row_cells[0].strip() == "Nenhum registro encontrado":
                        continue
                    parsed = parser(headers, row_cells)
                    result[key].append(parsed)

                logger.info("Section '%s': %d records extracted", key, len(result[key]))

            except Exception as e:
                logger.error("Error extracting SIGA section '%s': %s", key, e)
                result["errors"].append(f"{key}: {e}")
                continue

        return result

    async def close(self) -> None:
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
_service: SigaScraperService | None = None


def get_siga_scraper_service() -> SigaScraperService:
    """Singleton do SIGA scraper service."""
    global _service
    if _service is None:
        _service = SigaScraperService()
    return _service
