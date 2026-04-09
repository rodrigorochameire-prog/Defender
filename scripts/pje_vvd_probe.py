"""Diagnostic probe: investigate why VVD Camaçari captures HTML instead of PDF.

Runs headful, logs EVERY network request/response, so we can identify
which URL actually serves the autos PDF for VVD processes.

Usage:
  source ~/ombuds-worker/.venv/bin/activate
  source ~/ombuds-worker/.env
  export PJE_TEST_NUMERO="8000833-70.2025.8.05.0039"
  python3 scripts/pje_vvd_probe.py
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from patchright.sync_api import sync_playwright
from pje_downloader import login, find_processo_autos_url

CPF = os.environ["PJE_CPF"]
SENHA = os.environ["PJE_SENHA"]
NUMERO = os.environ.get("PJE_TEST_NUMERO", "8000833-70.2025.8.05.0039")

print(f"probing VVD download for processo {NUMERO}")


def log_request(req):
    # Filter obvious noise
    url = req.url
    if any(x in url for x in ("/_next/", "/static/", ".css", ".woff", ".ico", ".png", ".jpg", ".svg")):
        return
    print(f"  → {req.method} {url[:120]}")


def log_response(resp):
    url = resp.url
    if any(x in url for x in ("/_next/", "/static/", ".css", ".woff", ".ico", ".png", ".jpg", ".svg")):
        return
    try:
        ct = resp.headers.get("content-type", "")
        cl = resp.headers.get("content-length", "?")
    except Exception:
        ct = ""
        cl = "?"
    marker = ""
    if "pdf" in ct.lower() or "octet" in ct.lower():
        marker = "  ★★★ PDF/OCTET ★★★"
    elif url.lower().endswith(".pdf"):
        marker = "  ★★★ .pdf URL ★★★"
    print(f"  ← {resp.status} ct={ct[:40]!r} cl={cl} {url[:100]}{marker}")


with sync_playwright() as p:
    browser = p.chromium.launch(headless=False, slow_mo=200)
    context = browser.new_context()
    page = context.new_page()

    # Hook request/response logging on the main context
    context.on("request", log_request)
    context.on("response", log_response)

    # Also listen to new popups (VVD may open autos in a popup)
    def on_popup(popup):
        print(f"\n>>> POPUP opened: {popup.url}")
        popup.on("request", log_request)
        popup.on("response", log_response)

    context.on("page", lambda p: (p.on("request", log_request), p.on("response", log_response)))

    try:
        print("\n--- PHASE 1: login ---")
        login(page, CPF, SENHA)

        print(f"\n--- PHASE 1: search processo {NUMERO} ---")
        autos_url = find_processo_autos_url(page, NUMERO)
        print(f"\n>>> Phase 1 returned autos_url: {autos_url}")

        print("\n--- PHASE 2: navigate to autos (watching network) ---")
        # Open in a NEW page so we see all requests fresh
        autos_page = context.new_page()
        print(f"navigating to {autos_url}")
        autos_page.goto(autos_url, wait_until="domcontentloaded", timeout=60_000)

        print("\n--- wait 15s so any async XHR/download fires ---")
        time.sleep(15)

        # Take a screenshot to see what the page looks like
        autos_page.screenshot(path="/tmp/pje-vvd-autos.png", full_page=True)
        print("\n>>> screenshot saved to /tmp/pje-vvd-autos.png")

        # Print the title and URL
        print(f">>> current URL: {autos_page.url}")
        print(f">>> current title: {autos_page.title()}")

        # Try to find a "baixar" / "download" / "exportar autos" button/link
        print("\n--- looking for download buttons/links ---")
        candidates = [
            "text=/Baixar/i",
            "text=/Download/i",
            "text=/Exportar/i",
            "text=/PDF/i",
            "text=/Autos/i",
            "a[href*='downloadBinario']",
            "a[href*='.pdf']",
            "button:has-text('Baixar')",
            "button:has-text('Download')",
        ]
        for sel in candidates:
            try:
                elements = autos_page.locator(sel).all()
                if elements:
                    print(f"  found {len(elements)} matches for {sel}")
                    for i, el in enumerate(elements[:3]):
                        try:
                            text = el.inner_text(timeout=1_000)[:60]
                            href = el.get_attribute("href") if el.evaluate("el => el.tagName") == "A" else None
                            print(f"    [{i}] text={text!r} href={href}")
                        except Exception:
                            pass
            except Exception:
                pass

        print("\n--- Listing all iframes ---")
        try:
            for i, frame in enumerate(autos_page.frames):
                print(f"  frame[{i}]: url={frame.url[:120]}")
        except Exception as e:
            print(f"  iframe list error: {e}")

        print("\n--- WAITING 30s for you to watch the browser manually ---")
        print("    Interact with the page if needed, look for a download trigger")
        time.sleep(30)

    finally:
        browser.close()
        print("\n--- probe finished ---")
