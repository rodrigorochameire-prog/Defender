"""PJe downloader — V1 for Júri + VVD Camaçari.

Consolidated replacement for the legacy scripts (pje_scraper.py,
pje_download_autos.py, pje_area_download.py, etc.). Handles:

  Phase 1 (same-origin): login + process search via Patchright
  Phase 2 (cross-origin): force PDF download via Chrome DevTools Protocol

CLI:
  python3 pje_downloader.py download \\
    --numero 0001234-56.2026.8.05.0044 \\
    --atribuicao JURI_CAMACARI \\
    --out-dir /path/to/drive/folder
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

from patchright.sync_api import sync_playwright, Page, BrowserContext

# ------------------------------------------------------------------
# Pure helpers — no browser, safe to unit-test
# ------------------------------------------------------------------

SUPPORTED_ATRIBUICOES = {
    "JURI_CAMACARI": {
        "pje_base_url": "https://pje.tjba.jus.br/pje",
        "drive_subfolder": "Processos - Júri",
        "perfil": "Defensor Público - 1º Grau",
    },
    "VVD_CAMACARI": {
        "pje_base_url": "https://pje.tjba.jus.br/pje",
        "drive_subfolder": "Processos - VVD (Criminal)",
        "perfil": "Defensor Público - 1º Grau",
    },
}

MIN_PDF_BYTES = 10 * 1024  # 10KB — anything smaller is a PJe error page


def resolve_pje_config(atribuicao: str) -> dict[str, str]:
    """Return PJe config for the given atribuição.

    Raises ValueError for atribuições not supported in V1.
    """
    if atribuicao not in SUPPORTED_ATRIBUICOES:
        raise ValueError(
            f"Atribuição '{atribuicao}' not supported in V1. "
            f"Supported: {sorted(SUPPORTED_ATRIBUICOES)}"
        )
    return SUPPORTED_ATRIBUICOES[atribuicao]


def sanitize_filename(name: str) -> str:
    """Strip filesystem-unsafe characters from a filename fragment."""
    return re.sub(r'[\\/:*?"<>|]', "", name)


def build_pdf_filename(numero_processo: str) -> str:
    """Build the canonical filename for an autos PDF."""
    safe = sanitize_filename(numero_processo)
    date = datetime.now().strftime("%Y-%m-%d")
    return f"Autos - {safe} - {date}.pdf"


def has_recent_pdf(drive_dir: str, numero_processo: str) -> bool:
    """Return True if an existing, valid-size autos PDF is already in drive_dir."""
    d = Path(drive_dir)
    if not d.is_dir():
        return False
    safe = sanitize_filename(numero_processo)
    pattern = f"Autos - {safe} - *.pdf"
    for pdf in d.glob(pattern):
        try:
            if pdf.stat().st_size >= MIN_PDF_BYTES:
                return True
        except OSError:
            continue
    return False


# ------------------------------------------------------------------
# Phase 1 — login + process search (same-origin, standard Patchright)
# ------------------------------------------------------------------

PJE_BASE_URL = "https://pje.tjba.jus.br/pje"
PJE_LOGIN_URL = f"{PJE_BASE_URL}/login.seam"
PJE_PANEL_URL = f"{PJE_BASE_URL}/Painel/painel_usuario/advogado.seam"
PJE_SEARCH_URL = (
    f"{PJE_BASE_URL}/Processo/ConsultaProcesso/listView.seam"
)


def _log(msg: str) -> None:
    """Structured stderr log so the bash worker can parse progress."""
    print(f"[pje_downloader] {msg}", file=sys.stderr, flush=True)


def login(page: Page, cpf: str, senha: str) -> None:
    """Perform CPF+senha login on PJe TJBA (via SSO redirect).

    Raises RuntimeError if login verification fails.
    """
    _log(f"navigating to {PJE_LOGIN_URL}")
    page.goto(PJE_LOGIN_URL, wait_until="domcontentloaded", timeout=60_000)
    time.sleep(3)

    # PJe redirects to SSO at sso.cloud.pje.jus.br
    # which uses plain #username / #password / #kc-login
    page.wait_for_selector("#username", timeout=15_000)
    page.fill("#username", cpf)
    page.fill("#password", senha)

    # Try the Keycloak submit button (#kc-login), fall back to generic
    submitted = False
    for sel in ["#kc-login", "input[type=submit]", "button[type=submit]", "button:has-text('Entrar')"]:
        try:
            page.click(sel, timeout=3_000)
            submitted = True
            break
        except Exception:
            continue
    if not submitted:
        page.locator("#password").press("Enter")

    page.wait_for_load_state("domcontentloaded", timeout=60_000)
    time.sleep(5)

    # Dismiss any post-login modal/alert
    for dismiss in ("text=Ok", "text=OK", "button:has-text('Fechar')", "button:has-text('Continuar')"):
        try:
            page.click(dismiss, timeout=1_500)
            break
        except Exception:
            continue

    # Verify login — panel URL or title contains expected markers
    current_url = page.url
    current_title = page.title()
    _log(f"post-login URL: {current_url}")
    _log(f"post-login title: {current_title}")

    if "advogado.seam" not in current_url and "Painel" not in current_title:
        # Try navigating directly to the panel
        _log("navigating directly to panel to verify login")
        page.goto(PJE_PANEL_URL, wait_until="domcontentloaded", timeout=30_000)
        time.sleep(3)
        current_url = page.url
        current_title = page.title()

    if "advogado.seam" not in current_url and "Painel" not in current_title:
        raise RuntimeError(
            f"login failed — panel not reached. URL={current_url!r} title={current_title!r}"
        )

    _log("login successful")


def _parse_numero(numero: str) -> dict[str, str]:
    """Parse 'NNNNNNN-DD.YYYY.J.TR.OOOO' into component parts."""
    parts = numero.replace("-", ".").split(".")
    return {"seq": parts[0], "dig": parts[1], "ano": parts[2], "org": parts[5]}


def _open_peticionar(page: Page):
    """Navigate to the panel, click PETICIONAR tab, return the iframe Frame.

    Returns the Frame object, or raises RuntimeError.
    """
    if "advogado.seam" not in page.url:
        page.goto(PJE_PANEL_URL, wait_until="domcontentloaded", timeout=30_000)
        time.sleep(5)

    page.wait_for_selector("text=PETICIONAR", timeout=15_000)
    page.evaluate("""() => {
        var cells = document.querySelectorAll('td');
        for (var i = 0; i < cells.length; i++) {
            if (cells[i].textContent.trim() === 'PETICIONAR') {
                cells[i].click();
                return true;
            }
        }
        return false;
    }""")
    time.sleep(8)

    iframe_el = page.query_selector("iframe")
    if not iframe_el:
        page.screenshot(path="/tmp/pje-debug-peticionar.png")
        raise RuntimeError("PETICIONAR iframe not found — screenshot at /tmp/pje-debug-peticionar.png")
    frame = iframe_el.content_frame()
    if not frame:
        raise RuntimeError("Could not get content frame from PETICIONAR iframe")

    frame.wait_for_selector('input[id*="numeroSequencial"]', timeout=15_000)
    return frame


def find_processo_autos_url(page: Page, numero: str) -> str:
    """Search for a process via the PETICIONAR tab (no CAPTCHA path) and return
    the URL of the 'Autos digitais' page.

    Uses the same iframe approach as the legacy pje_download_autos.py to avoid
    the CAPTCHA that appears on the direct ConsultaProcesso route.

    Raises RuntimeError if the process can't be found.
    """
    _log(f"searching for processo {numero}")
    parts = _parse_numero(numero)

    frame = _open_peticionar(page)
    _log("PETICIONAR frame loaded")

    # Clear any previous search
    try:
        frame.click('input[id*="clearButton"]', timeout=3_000)
        time.sleep(2)
    except Exception:
        pass

    # Fill the split number fields via JS (avoid React/JSF change event issues)
    frame.evaluate("""(p) => {
        document.querySelector('input[id*="numeroSequencial"]').value = p.seq;
        document.querySelector('input[id*="Verificador"]').value = p.dig;
        document.querySelector('input[id*="Ano"]').value = p.ano;
        document.querySelector('input[id*="OrgaoJustica"]').value = p.org;
    }""", parts)

    frame.click('input[id*="searchProcessos"]')
    time.sleep(7)

    found = frame.evaluate("() => !!document.querySelector('tr.rich-table-row')")
    if not found:
        frame.screenshot(path="/tmp/pje-debug-results.png")
        raise RuntimeError(
            f"processo {numero} not found in search results — screenshot at /tmp/pje-debug-results.png"
        )

    _log("process found in results, clicking Autos Digitais")

    # Click the 'Autos Digitais' link — it may open a popup
    # Try the titled link first, then fall back to the fa-external-link icon
    try:
        with page.context.expect_page(timeout=12_000) as popup_info:
            frame.evaluate("""() => {
                var link = document.querySelector('a[title="Autos Digitais"]');
                if (!link) {
                    var links = document.querySelectorAll('a');
                    for (var i = 0; i < links.length; i++) {
                        if (links[i].querySelector('.fa-external-link')) {
                            link = links[i];
                            break;
                        }
                    }
                }
                if (link) {
                    if (link.onclick) link.onclick(new Event('click'));
                    else link.click();
                }
            }""")
        autos_page = popup_info.value
        autos_page.wait_for_load_state("domcontentloaded", timeout=60_000)
    except Exception:
        # Popup didn't open — URL may be in the iframe itself or same page
        _log("no popup detected, checking iframe/page URL")
        time.sleep(3)
        autos_page = page

    url = autos_page.url
    _log(f"autos page URL: {url}")
    return url


# ------------------------------------------------------------------
# CLI scaffold (Phase 1 + Phase 2 implementation lands in Tasks 4 and 5)
# ------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="pje_downloader")
    sub = parser.add_subparsers(dest="cmd", required=True)

    dl = sub.add_parser("download", help="Download autos PDF for one process")
    dl.add_argument("--numero", required=True)
    dl.add_argument("--atribuicao", required=True)
    dl.add_argument("--out-dir", required=True)
    dl.add_argument("--assistido", default="")
    dl.add_argument("--force", action="store_true", help="Re-download even if PDF exists")

    args = parser.parse_args(argv)

    if args.cmd == "download":
        # Real implementation lands in Task 4 + Task 5
        print(json.dumps({"status": "not_implemented"}))
        return 2

    return 1


if __name__ == "__main__":
    sys.exit(main())
