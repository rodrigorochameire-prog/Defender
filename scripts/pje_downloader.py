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
    time.sleep(15)

    iframe_el = page.query_selector("iframe")
    if not iframe_el:
        page.screenshot(path="/tmp/pje-debug-peticionar.png")
        raise RuntimeError("PETICIONAR iframe not found — screenshot at /tmp/pje-debug-peticionar.png")
    frame = iframe_el.content_frame()
    if not frame:
        raise RuntimeError("Could not get content frame from PETICIONAR iframe")

    frame.wait_for_selector('input[id*="numeroSequencial"]', timeout=60_000)
    return frame


def _search_peticionar(page: Page, numero: str):
    """Search for a processo in the PETICIONAR tab and return (frame, row_info).

    row_info is a dict with keys:
      - id_processo: PJe internal processo ID (int as str)
      - has_autos_link: bool — True if "Autos Digitais" link exists (Júri)
      - link_id: DOM id of the Autos Digitais link (if present)
    """
    _log(f"searching for processo {numero}")
    parts = _parse_numero(numero)

    frame = _open_peticionar(page)
    _log("PETICIONAR frame loaded")

    try:
        frame.click('input[id*="clearButton"]', timeout=3_000)
        time.sleep(2)
    except Exception:
        pass

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
        raise RuntimeError(f"processo {numero} not found — screenshot at /tmp/pje-debug-results.png")

    _log("process found in results")

    row_info = frame.evaluate("""() => {
        var row = document.querySelector('tr.rich-table-row');
        if (!row) return null;
        // Extract idProcesso from onclick of first link
        var firstLink = row.querySelector('a');
        var onclick = firstLink ? (firstLink.getAttribute('onclick') || '') : '';
        var idMatch = onclick.match(/idProcesso[':]+\\s*(\\d+)/);
        var idProcesso = idMatch ? idMatch[1] : null;
        // Check for Autos Digitais link
        var autosLink = row.querySelector('a[title="Autos Digitais"]');
        if (!autosLink) {
            var links = row.querySelectorAll('a');
            for (var i = 0; i < links.length; i++) {
                if (links[i].querySelector('.fa-external-link, .fa-external-link-alt')) {
                    autosLink = links[i];
                    break;
                }
            }
        }
        if (autosLink && !autosLink.id) autosLink.id = 'autosDigitais_' + Date.now();
        return {
            id_processo: idProcesso,
            has_autos_link: !!autosLink,
            link_id: autosLink ? autosLink.id : null,
        };
    }""")
    _log(f"row_info: {row_info}")
    return frame, row_info


def _navigate_to_autos_via_peticionar(
    page: Page, context: BrowserContext, numero: str,
    frame: Any = None, row_info: dict | None = None,
):
    """For VVD: click Peticionar → popup → navigate to listProcessoCompleto.

    VVD's PETICIONAR search only shows a "Peticionar" button (no Autos Digitais).
    Clicking it opens a popup at peticaoPopUp.seam with a valid `ca` token.
    We reuse that `ca` to navigate to listProcessoCompleto.seam, which shows
    the full autos with a "Download autos do processo" button.

    Returns the popup Page object positioned at the autos page.
    """
    if frame is None or row_info is None:
        frame, row_info = _search_peticionar(page, numero)
    id_processo = row_info.get("id_processo")
    if not id_processo:
        raise RuntimeError(f"could not extract idProcesso for {numero}")

    _log(f"VVD path: clicking Peticionar to get ca token (idProcesso={id_processo})")

    with context.expect_page(timeout=15_000) as popup_info:
        frame.evaluate("""() => {
            var a = document.querySelector('tr.rich-table-row a');
            a.onclick ? a.onclick(new Event('click')) : a.click();
        }""")
    popup = popup_info.value
    popup.wait_for_load_state("domcontentloaded", timeout=60_000)
    time.sleep(3)

    ca_match = re.search(r"ca=([a-f0-9]+)", popup.url)
    if not ca_match:
        raise RuntimeError(f"no ca token in popup URL: {popup.url}")
    ca = ca_match.group(1)
    _log(f"VVD path: got ca token ({ca[:20]}...)")

    autos_url = (
        f"https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/"
        f"listProcessoCompleto.seam?id={id_processo}&ca={ca}"
    )
    _log(f"VVD path: navigating to autos page")
    popup.goto(autos_url, wait_until="domcontentloaded", timeout=60_000)
    time.sleep(5)

    if "error.seam" in popup.url:
        raise RuntimeError(
            f"VVD autos page redirected to error.seam — "
            f"ca token may be invalid for listProcessoCompleto"
        )

    _log(f"VVD path: autos page loaded — {popup.title()}")
    return popup


def _download_from_autos_page(
    context: BrowserContext,
    autos_page: Page,
    out_path: str,
) -> int:
    """Download the full autos PDF from the listProcessoCompleto page.

    Clicks the "Download autos do processo" dropdown button and intercepts
    the downloadBinario response. This is the VVD path — the autos page
    was reached via _navigate_to_autos_via_peticionar().

    Returns bytes written. Raises RuntimeError on failure.
    """
    import requests as _requests

    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    _log("VVD download: setting up downloadBinario route intercept")
    captured: dict[str, Any] = {"data": None, "done": False, "seen": []}

    def handle_route(route: Any) -> None:
        if captured["done"]:
            try:
                route.abort()
            except Exception:
                pass
            return
        try:
            response = route.fetch(timeout=180_000)
            body = response.body() if callable(getattr(response, "body", None)) else response.body
            ct = (response.headers.get("content-type") or "").lower()
            captured["seen"].append(f"{response.status} ct={ct} len={len(body)}")
            if is_valid_pdf(body):
                _log(f"VVD download: captured PDF ({len(body)} bytes)")
                captured["data"] = body
                captured["done"] = True
                try:
                    route.abort()
                except Exception:
                    pass
            else:
                _log(f"VVD download: downloadBinario not PDF (len={len(body)}, magic={body[:8]!r})")
                try:
                    route.fulfill(response=response)
                except Exception:
                    try:
                        route.abort()
                    except Exception:
                        pass
        except Exception as e:
            _log(f"VVD download route error: {e}")
            try:
                route.abort()
            except Exception:
                pass

    # Also listen to ALL responses for any PDF content-type (VVD download may
    # use a different URL than downloadBinario, e.g. reportCertidaoPDF.seam)
    def on_any_response(response: Any) -> None:
        if captured["done"]:
            return
        try:
            url = response.url
            ct = (response.headers.get("content-type") or "").lower()
            if "application/pdf" in ct or "downloadbinario" in url.lower():
                body = response.body()
                captured["seen"].append(f"RESP {response.status} ct={ct} len={len(body)} {url[:80]}")
                if is_valid_pdf(body):
                    _log(f"VVD download: captured PDF from {url[:80]} ({len(body)} bytes)")
                    captured["data"] = body
                    captured["done"] = True
        except Exception:
            pass
    autos_page.on("response", on_any_response)

    # NOTE: We do NOT use context.route for VVD — the PJe download uses a
    # timer (iniciarTemporizadorDownload) that polls downloadBinario.seam
    # and expects the response to go through normally. If we intercept with
    # context.route, the timer's JS callback never fires and the retry loop
    # breaks. Instead, we listen passively on the response event.
    try:
        # Click "Download autos do processo" button
        _log("VVD download: clicking Download autos button")
        clicked = autos_page.evaluate("""() => {
            // Find the download dropdown toggle
            var links = document.querySelectorAll('a');
            for (var i = 0; i < links.length; i++) {
                if ((links[i].getAttribute('title') || '').indexOf('Download autos') !== -1) {
                    links[i].click();
                    return 'dropdown';
                }
            }
            return null;
        }""")
        _log(f"VVD download: clicked {clicked}")
        time.sleep(3)

        # After opening dropdown, click the red DOWNLOAD input button.
        # It's an <input> with onclick="iniciarTemporizadorDownload()" which
        # triggers an A4J.AJAX.Submit that generates the PDF server-side,
        # then navigates to downloadBinario.seam to fetch it.
        time.sleep(2)
        dl_result = autos_page.evaluate("""() => {
            // Look for the input with onclick containing iniciarTemporizadorDownload
            var inputs = document.querySelectorAll('input');
            for (var i = 0; i < inputs.length; i++) {
                var onclick = inputs[i].getAttribute('onclick') || '';
                if (onclick.indexOf('iniciarTemporizadorDownload') !== -1) {
                    inputs[i].click();
                    return 'clicked via iniciarTemporizadorDownload';
                }
            }
            // Fallback: any input/button with value "Download"
            var all = document.querySelectorAll('input, button');
            for (var i = 0; i < all.length; i++) {
                var v = (all[i].value || all[i].textContent || '').trim();
                if (/^download$/i.test(v)) {
                    all[i].click();
                    return 'clicked via value match';
                }
            }
            return 'DOWNLOAD button not found';
        }""")
        _log(f"VVD download: {dl_result}")

        # Log all non-static requests to see what the timer polls
        all_reqs = []
        def log_req(req):
            url = req.url
            if not any(x in url for x in ['.css', '.woff', '.gif', '.png', '.ico', 'spacer', '.svg']):
                all_reqs.append(f"{req.method} {url[:120]}")
        autos_page.on("request", log_req)

        # Wait for PDF capture
        waited = 0
        while not captured["done"] and waited < 180:
            time.sleep(2)
            waited += 2
            if waited % 20 == 0:
                _log(f"VVD download: waiting for PDF... {waited}s")

        try:
            autos_page.screenshot(path="/tmp/pje-debug-vvd-download.png")
        except Exception:
            pass
    finally:
        try:
            autos_page.remove_listener("response", on_any_response)
        except Exception:
            pass
        try:
            autos_page.remove_listener("request", log_req)
        except Exception:
            pass

    if captured["data"] and is_valid_pdf(captured["data"]):
        _log(f"VVD download: writing {len(captured['data'])} bytes")
        out.write_bytes(captured["data"])
        return len(captured["data"])

    if captured["seen"]:
        _log(f"VVD download: saw {len(captured['seen'])} responses, none valid:")
        for s in captured["seen"][:10]:
            _log(f"  - {s}")
    if all_reqs:
        _log(f"VVD download: {len(all_reqs)} requests made during wait:")
        for r in all_reqs[:30]:
            _log(f"  - {r}")

    # Fallback: try context.request.get with cookies
    _log("VVD download: fallback — context.request.get(downloadBinario)")
    try:
        resp = context.request.get(DOWNLOAD_BINARY_URL, timeout=180_000)
        body = resp.body()
        ct = resp.headers.get("content-type", "")
        _log(f"VVD fallback: {resp.status} {len(body)} bytes ct={ct!r}")
        if is_valid_pdf(body):
            out.write_bytes(body)
            return len(body)
    except Exception as e:
        _log(f"VVD fallback failed: {e}")

    raise RuntimeError(
        "VVD download: all strategies failed — check /tmp/pje-debug-vvd-download.png"
    )


def find_processo_autos_url(page: Page, numero: str) -> str:
    """Legacy compat — returns the downloadBinario URL."""
    return DOWNLOAD_BINARY_URL


# ------------------------------------------------------------------
# Phase 2 — force PDF download via CDP (cross-origin)
# ------------------------------------------------------------------

DOWNLOAD_BINARY_URL = "https://pje.tjba.jus.br/pje/downloadBinario.seam"


def download_autos_pdf(
    context: BrowserContext,
    page: Page,
    frame: Any,
    link_id: str,
    out_path: str,
) -> int:
    """Trigger 'Autos Digitais' from the PETICIONAR frame and capture the PDF.

    The A4J.AJAX.Submit onclick on the Autos Digitais link POSTs form data to
    set server state (idProcessoSelecionado) and then navigates an iframe to
    /pje/downloadBinario.seam. We intercept that navigation via context.route
    and grab the binary body. This is the proven flow from legacy
    pje_download_autos.py and works for BOTH Júri and VVD — the old
    pje_downloader flow failed on VVD because it clicked the wrong link
    ('Peticionar', which opens peticaoPopUp.seam — the petition editor).

    Cascades through three strategies:
      A) context.route('**/downloadBinario**') — click link, intercept nav
      B) context.request.get(DOWNLOAD_BINARY_URL) — after clicking to set state
      C) requests.Session() with cookies — same idea, plain HTTP fallback

    Returns bytes written. Raises RuntimeError on failure.
    """
    import requests as _requests

    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    # ----------------------------------------------------------------
    # Strategy A: context.route + A4J click
    # ----------------------------------------------------------------
    _log("Phase2 strategy A: context.route('**/downloadBinario**') + A4J click")
    captured: dict[str, Any] = {"data": None, "done": False, "seen": []}

    def handle_route(route: Any) -> None:
        if captured["done"]:
            try:
                route.abort()
            except Exception:
                pass
            return
        try:
            response = route.fetch(timeout=180_000)
            # Playwright APIResponse.body() returns bytes (method, not attribute)
            body = response.body() if callable(getattr(response, "body", None)) else response.body
            ct = (response.headers.get("content-type") or "").lower()
            captured["seen"].append(f"{response.status} ct={ct} len={len(body)}")
            if is_valid_pdf(body):
                _log(f"strategy A: captured valid PDF ({len(body)} bytes, ct={ct})")
                captured["data"] = body
                captured["done"] = True
                try:
                    route.abort()
                except Exception:
                    pass
            elif len(body) >= 50_000 and (b"<html" not in body[:2048].lower()):
                _log(f"strategy A: non-PDF magic but large binary ({len(body)} bytes) — saving")
                captured["data"] = body
                captured["done"] = True
                try:
                    route.abort()
                except Exception:
                    pass
            else:
                _log(
                    f"strategy A: downloadBinario response not a PDF "
                    f"(len={len(body)}, magic={body[:8]!r}) — letting through"
                )
                try:
                    route.fulfill(response=response)
                except Exception:
                    try:
                        route.abort()
                    except Exception:
                        pass
        except Exception as e:
            _log(f"strategy A route error: {e}")
            try:
                route.abort()
            except Exception:
                pass

    context.route("**/downloadBinario**", handle_route)
    try:
        # Fire the A4J onclick for the Autos Digitais link. This triggers
        # an iframe navigation to downloadBinario.seam which our route will
        # intercept.
        try:
            frame.evaluate(f"""() => {{
                var link = document.getElementById({json.dumps(link_id)});
                if (link && link.onclick) {{
                    link.onclick(new Event('click'));
                }} else if (link) {{
                    link.click();
                }}
            }}""")
        except Exception as e:
            _log(f"strategy A click failed: {e}")

        # Give the nav time — autos PDFs can be big (60s+ server-side assembly)
        waited = 0
        while not captured["done"] and waited < 180:
            time.sleep(2)
            waited += 2
            if waited % 20 == 0:
                _log(f"strategy A: waiting for downloadBinario... {waited}s")

        # Save debug screenshot regardless
        try:
            page.screenshot(path="/tmp/pje-debug-autos.png", full_page=True)
        except Exception:
            pass
    finally:
        try:
            context.unroute("**/downloadBinario**", handle_route)
        except Exception:
            pass

    if captured["data"] and (is_valid_pdf(captured["data"]) or len(captured["data"]) >= 50_000):
        _log(f"strategy A: writing {len(captured['data'])} bytes")
        out.write_bytes(captured["data"])
        return len(captured["data"])
    if captured["seen"]:
        _log(f"strategy A saw {len(captured['seen'])} downloadBinario responses, none usable:")
        for s in captured["seen"][:10]:
            _log(f"  - {s}")
    else:
        _log("strategy A: no downloadBinario responses observed")

    # ----------------------------------------------------------------
    # Strategy B: click to set state, then context.request.get()
    # ----------------------------------------------------------------
    _log("Phase2 strategy B: context.request.get(DOWNLOAD_BINARY_URL)")
    try:
        # Re-fire the onclick so the server state (idProcessoSelecionado)
        # is set for THIS session — strategy A may have already set it, but
        # being defensive is cheap.
        try:
            frame.evaluate(f"""() => {{
                var link = document.getElementById({json.dumps(link_id)});
                if (link && link.onclick) link.onclick(new Event('click'));
            }}""")
        except Exception:
            pass
        time.sleep(5)
        response = context.request.get(DOWNLOAD_BINARY_URL, timeout=180_000)
        body = response.body()
        ct = response.headers.get("content-type", "")
        _log(f"strategy B: {response.status} {len(body)} bytes ct={ct!r}")
        if is_valid_pdf(body):
            _log("strategy B: valid PDF")
            out.write_bytes(body)
            return len(body)
        elif len(body) >= 50_000 and b"<html" not in body[:2048].lower():
            _log(f"strategy B: large binary ({len(body)} bytes) — saving")
            out.write_bytes(body)
            return len(body)
    except Exception as e:
        _log(f"strategy B failed: {e}")

    # ----------------------------------------------------------------
    # Strategy C: requests.Session() with extracted cookies
    # ----------------------------------------------------------------
    _log("Phase2 strategy C: requests.Session()")
    try:
        try:
            frame.evaluate(f"""() => {{
                var link = document.getElementById({json.dumps(link_id)});
                if (link && link.onclick) link.onclick(new Event('click'));
            }}""")
        except Exception:
            pass
        time.sleep(5)

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
        resp = session.get(DOWNLOAD_BINARY_URL, timeout=180, stream=True)
        ct = resp.headers.get("content-type", "")
        _log(f"strategy C: HTTP {resp.status_code} {len(resp.content)} bytes ct={ct!r}")
        if resp.status_code == 200 and is_valid_pdf(resp.content):
            _log("strategy C: valid PDF")
            out.write_bytes(resp.content)
            return len(resp.content)
        elif resp.status_code == 200 and len(resp.content) >= 50_000 and b"<html" not in resp.content[:2048].lower():
            out.write_bytes(resp.content)
            return len(resp.content)
    except Exception as e:
        _log(f"strategy C failed: {e}")

    raise RuntimeError(
        "all download strategies failed — check /tmp/pje-debug-autos.png "
        "for the page state"
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
                browser = p.chromium.launch(
                    headless=True,
                    args=["--disable-blink-features=AutomationControlled"],
                )
                context = browser.new_context(
                    accept_downloads=True,
                    viewport={"width": 1400, "height": 900},
                    locale="pt-BR",
                )
                # Auto-accept any JS confirm/alert dialogs (Autos Digitais
                # sometimes triggers a "Download em andamento" confirm).
                context.add_init_script(
                    "window.confirm = () => true; window.alert = () => true;"
                )
                page = context.new_page()
                page.on("dialog", lambda d: d.accept())
                context.on(
                    "page",
                    lambda new_page: new_page.on("dialog", lambda d: d.accept()),
                )
                try:
                    login(page, cpf, senha)
                    frame, row_info = _search_peticionar(page, args.numero)
                    if row_info.get("has_autos_link"):
                        # Júri path: click Autos Digitais link directly
                        _log("Júri path: clicking Autos Digitais link")
                        link_id = row_info["link_id"]
                        bytes_written = download_autos_pdf(
                            context, page, frame, link_id, out_path
                        )
                    else:
                        # VVD path: popup → ca → listProcessoCompleto → Download
                        _log("VVD path: no Autos Digitais link, using popup route")
                        autos_popup = _navigate_to_autos_via_peticionar(
                            page, context, args.numero,
                            frame=frame, row_info=row_info,
                        )
                        bytes_written = _download_from_autos_page(
                            context, autos_popup, out_path
                        )
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
