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
PDF_MAGIC = b"%PDF-"


def is_valid_pdf(data: bytes) -> bool:
    """True if `data` starts with the PDF magic bytes and is large enough.

    Size alone is not enough: PJe sometimes returns a 40KB HTML error page
    (Painel do Defensor) when the navigation goes wrong, which passed the
    MIN_PDF_BYTES check before V1.1.
    """
    return (
        len(data) >= MIN_PDF_BYTES
        and data[: len(PDF_MAGIC)] == PDF_MAGIC
    )


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
    """Return True if a valid PDF for this processo is already in drive_dir.

    Checks both file size AND the %PDF- magic bytes — V1.0 only checked size,
    which let 40KB HTML error pages pass as "already downloaded".
    """
    d = Path(drive_dir)
    if not d.is_dir():
        return False
    safe = sanitize_filename(numero_processo)
    pattern = f"Autos - {safe} - *.pdf"
    for pdf in d.glob(pattern):
        try:
            if pdf.stat().st_size < MIN_PDF_BYTES:
                continue
            with pdf.open("rb") as f:
                head = f.read(len(PDF_MAGIC))
            if head == PDF_MAGIC:
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
# Phase 2 — force PDF download via CDP (cross-origin)
# ------------------------------------------------------------------

DOWNLOAD_BINARY_URL = "https://pje.tjba.jus.br/pje/downloadBinario.seam"


def download_autos_pdf(
    context: BrowserContext,
    autos_page_url: str,
    out_path: str,
) -> int:
    """Open the autos page and force-download the consolidated PDF.

    PJe opens the PDF in a new window served from a cross-origin host;
    normal Playwright download events don't fire. We cascade through three
    strategies adapted from the proven legacy pje_download_autos.py:

      A) context.route("**/downloadBinario**") — intercept + route.fetch()
      B) context.request.get() — API request with shared cookies
      C) requests.Session() with cookies extracted from context

    Returns number of bytes written. Raises RuntimeError on failure.
    """
    import requests as _requests

    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    # ----------------------------------------------------------------
    # Strategy A: context.route intercept on downloadBinario
    # ----------------------------------------------------------------
    _log("Phase2 strategy A: context.route intercept")
    captured: dict[str, Any] = {"data": None, "done": False}

    def handle_route(route: Any) -> None:
        if captured["done"]:
            try:
                route.abort()
            except Exception:
                pass
            return
        try:
            response = route.fetch()
            body = response.body()
            ct = response.headers.get("content-type", "")
            url_lower = route.request.url.lower()
            is_pdf = "pdf" in ct or "octet" in ct or url_lower.endswith(".pdf")
            if is_pdf and len(body) > 5_000:
                captured["data"] = body
                captured["done"] = True
                route.abort()
            elif len(body) > 50_000:
                # Large response even without PDF content-type — save it
                captured["data"] = body
                captured["done"] = True
                route.abort()
            else:
                try:
                    route.fulfill(response=response)
                except Exception:
                    route.abort()
        except Exception as e:
            _log(f"route handler error: {e}")
            try:
                route.abort()
            except Exception:
                pass

    context.route("**/downloadBinario**", handle_route)
    try:
        # If the autos URL IS the downloadBinario URL, navigate directly to it
        # Otherwise open a new page and navigate
        autos_page = context.new_page()
        try:
            _log(f"navigating to autos URL: {autos_page_url}")
            autos_page.goto(autos_page_url, wait_until="domcontentloaded", timeout=60_000)
            time.sleep(3)
            autos_page.screenshot(path="/tmp/pje-debug-autos.png")
            _log("screenshot saved to /tmp/pje-debug-autos.png")

            # If the page itself is the PDF or triggers a download via iframe
            # Wait up to 60s for the route intercept to fire
            waited = 0
            while not captured["done"] and waited < 60:
                time.sleep(2)
                waited += 2
                if waited % 10 == 0:
                    _log(f"waiting for route intercept... {waited}s")
        finally:
            try:
                autos_page.close()
            except Exception:
                pass
    finally:
        try:
            context.unroute("**/downloadBinario**")
        except Exception:
            pass

    if captured["data"] and is_valid_pdf(captured["data"]):
        _log(f"strategy A: captured {len(captured['data'])} bytes (valid PDF)")
        out.write_bytes(captured["data"])
        return len(captured["data"])
    elif captured["data"]:
        _log(
            f"strategy A: captured {len(captured['data'])} bytes but NOT a PDF "
            f"(magic={captured['data'][:8]!r}) — discarding, trying next strategy"
        )

    # ----------------------------------------------------------------
    # Strategy B: context.request.get() with shared cookies
    # ----------------------------------------------------------------
    _log("Phase2 strategy B: context.request.get()")
    try:
        # The autos URL itself may be downloadBinario — try it first
        for url_to_try in [autos_page_url, DOWNLOAD_BINARY_URL]:
            if "downloadBinario" not in url_to_try and url_to_try != autos_page_url:
                continue
            try:
                _log(f"strategy B: GET {url_to_try}")
                response = context.request.get(url_to_try, timeout=120_000)
                body = response.body()
                ct = response.headers.get("content-type", "")
                _log(f"strategy B: {response.status} {len(body)} bytes ct={ct!r}")
                if is_valid_pdf(body):
                    _log(f"strategy B: valid PDF from {url_to_try}")
                    out.write_bytes(body)
                    return len(body)
                elif len(body) >= MIN_PDF_BYTES:
                    _log(f"strategy B: large body but not a PDF (magic={body[:8]!r}) — skip")
            except Exception as e:
                _log(f"strategy B GET {url_to_try}: {e}")

        # Also try the canonical downloadBinario URL with cookies set
        _log(f"strategy B: GET {DOWNLOAD_BINARY_URL}")
        response = context.request.get(DOWNLOAD_BINARY_URL, timeout=120_000)
        body = response.body()
        ct = response.headers.get("content-type", "")
        _log(f"strategy B canonical: {response.status} {len(body)} bytes ct={ct!r}")
        if is_valid_pdf(body):
            _log("strategy B canonical: valid PDF")
            out.write_bytes(body)
            return len(body)
        elif len(body) >= MIN_PDF_BYTES:
            _log(f"strategy B canonical: large body but not a PDF (magic={body[:8]!r}) — skip")
    except Exception as e:
        _log(f"strategy B failed: {e}")

    # ----------------------------------------------------------------
    # Strategy C: requests.Session() with extracted cookies
    # ----------------------------------------------------------------
    _log("Phase2 strategy C: requests.Session()")
    try:
        cookies = context.cookies()
        session = _requests.Session()
        for c in cookies:
            session.cookies.set(
                c["name"], c["value"],
                domain=c.get("domain", "pje.tjba.jus.br"),
                path=c.get("path", "/"),
            )
        session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
            "Referer": "https://pje.tjba.jus.br/pje/Painel/painel_usuario/advogado.seam",
        })

        for url_to_try in [autos_page_url, DOWNLOAD_BINARY_URL]:
            try:
                _log(f"strategy C: GET {url_to_try}")
                resp = session.get(url_to_try, timeout=120, stream=True)
                content_type = resp.headers.get("content-type", "")
                _log(f"strategy C: HTTP {resp.status_code} {len(resp.content)} bytes ct={content_type!r}")
                if resp.status_code == 200 and is_valid_pdf(resp.content):
                    _log(f"strategy C: valid PDF from {url_to_try}")
                    out.write_bytes(resp.content)
                    return len(resp.content)
                elif resp.status_code == 200 and len(resp.content) >= MIN_PDF_BYTES:
                    _log(f"strategy C: large body but not a PDF (magic={resp.content[:8]!r}) — skip")
            except Exception as e:
                _log(f"strategy C GET {url_to_try}: {e}")
    except Exception as e:
        _log(f"strategy C failed: {e}")

    raise RuntimeError(
        f"all strategies failed to download PDF from {autos_page_url} — "
        f"check /tmp/pje-debug-autos.png for the page state"
    )


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
        cpf = os.environ.get("PJE_CPF", "").strip()
        senha = os.environ.get("PJE_SENHA", "").strip()
        if not cpf or not senha:
            print(json.dumps({"status": "failed", "error": "PJE_CPF/PJE_SENHA not set"}))
            return 1

        try:
            cfg = resolve_pje_config(args.atribuicao)
        except ValueError as e:
            print(json.dumps({"status": "failed", "error": str(e)}))
            return 1

        out_path = str(Path(args.out_dir) / build_pdf_filename(args.numero))

        if not args.force and has_recent_pdf(args.out_dir, args.numero):
            print(json.dumps({
                "status": "skipped",
                "reason": "pdf_already_exists",
                "pdf_path": out_path,
            }))
            return 0

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(accept_downloads=True)
                page = context.new_page()
                try:
                    login(page, cpf, senha)
                    autos_url = find_processo_autos_url(page, args.numero)
                    bytes_written = download_autos_pdf(context, autos_url, out_path)
                    print(json.dumps({
                        "status": "completed",
                        "pdf_path": out_path,
                        "pdf_bytes": bytes_written,
                        "atribuicao": args.atribuicao,
                        "drive_subfolder": cfg["drive_subfolder"],
                    }))
                    return 0
                finally:
                    browser.close()
        except Exception as e:
            _log(f"download FAILED: {type(e).__name__}: {e}")
            print(json.dumps({"status": "failed", "error": str(e)[:500]}))
            return 1

    return 1


if __name__ == "__main__":
    sys.exit(main())
