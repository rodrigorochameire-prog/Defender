#!/usr/bin/env python3
"""
PJe TJBA - Download de Autos Digitais completos.

Fluxo: Login → Peticionar (sem captcha) → Busca processo → Autos Digitais → Download PDF
3 estratégias em cascata:
  A) context.route("**/downloadBinario**") — intercepta iframe navigation
  B) context.request.get() — API nativa do Playwright com cookies compartilhados
  C) requests.Session() com cookies extraídos — fallback Python puro

Uso:
  python3 pje_download_autos.py                          # Todos os VVD
  python3 pje_download_autos.py -p 8017921-24.2025.8.05.0039  # Um processo
  python3 pje_download_autos.py -l processos.txt         # Lista de processos
  python3 pje_download_autos.py -o ~/Desktop/autos       # Output dir custom
"""

import argparse
import json
import os
import sys
import time
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional, List

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
PJE_LOGIN_URL = "https://pje.tjba.jus.br/pje/login.seam"
PANEL_URL = "https://pje.tjba.jus.br/pje/Painel/painel_usuario/advogado.seam"
DOWNLOAD_BINARY_URL = "https://pje.tjba.jus.br/pje/downloadBinario.seam"
DEFAULT_OUTPUT_DIR = Path.home() / "Desktop" / "pje-autos-vvd"
HEADLESS = False

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def parse_numero(num):
    """NNNNNNN-DD.YYYY.J.TR.OOOO → {seq, dig, ano, org}"""
    parts = num.replace("-", ".").split(".")
    return {"seq": parts[0], "dig": parts[1], "ano": parts[2], "org": parts[5]}


def load_env():
    env_path = Path(__file__).parent.parent / ".env.local"
    cpf = os.environ.get("PJE_CPF", "")
    senha = os.environ.get("PJE_SENHA", "")
    if env_path.exists() and (not cpf or not senha):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    k, v = k.strip(), v.strip()
                    if k == "PJE_CPF": cpf = v
                    elif k == "PJE_SENHA": senha = v
    return cpf, senha


def load_default_processos():
    """Load from previously scraped JSON files."""
    nums = []
    for fname in ["pje-movimentos-vvd.json", "pje-movimentos-vvd-batch2.json"]:
        fpath = Path.home() / "Desktop" / fname
        if fpath.exists():
            with open(fpath) as f:
                data = json.load(f)
            for p in data.get("processos", []):
                if p.get("status", "").startswith("ok"):
                    nums.append(p["numero"])
    return list(dict.fromkeys(nums))


# ---------------------------------------------------------------------------
# PJe Automation
# ---------------------------------------------------------------------------

def do_login(page, cpf, senha):
    print("[LOGIN] Abrindo PJe...")
    page.goto(PJE_LOGIN_URL, wait_until="domcontentloaded", timeout=60000)
    time.sleep(5)

    if "sso.cloud.pje" in page.url:
        page.fill("#username", cpf)
        page.fill("#password", senha)
        page.click("#kc-login")
    time.sleep(8)

    if "advogado.seam" not in page.url:
        page.goto(PANEL_URL, wait_until="domcontentloaded", timeout=30000)
        time.sleep(8)

    ok = "advogado.seam" in page.url or "Painel" in page.title()
    print(f"[LOGIN] {'OK' if ok else 'FALHOU'}: {page.title()}")
    return ok


def open_peticionar(page):
    """Click PETICIONAR tab and return the iframe Frame."""
    if "advogado.seam" not in page.url:
        page.goto(PANEL_URL, wait_until="domcontentloaded", timeout=30000)
        time.sleep(5)

    page.wait_for_selector("text=PETICIONAR", timeout=15000)
    page.evaluate("""() => {
        var cells = document.querySelectorAll('td');
        for (var i = 0; i < cells.length; i++) {
            if (cells[i].textContent.trim() === 'PETICIONAR') { cells[i].click(); return true; }
        }
        return false;
    }""")
    time.sleep(8)

    iframe_el = page.query_selector("iframe")
    if not iframe_el:
        return None
    frame = iframe_el.content_frame()
    if not frame:
        return None
    frame.wait_for_selector('input[id*="numeroSequencial"]', timeout=15000)
    return frame


def search_processo(frame, numero):
    """Search a processo in Peticionar. Returns True if found."""
    parts = parse_numero(numero)

    try:
        frame.click('input[id*="clearButton"]')
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

    return frame.evaluate("() => !!document.querySelector('tr.rich-table-row')")


def click_autos_digitais(frame):
    """Click the 'Autos Digitais' link via its JSF onclick. Returns link ID or None."""
    link_id = frame.evaluate("""() => {
        var link = document.querySelector('a[title="Autos Digitais"]');
        if (!link) {
            var links = document.querySelectorAll('a');
            for (var i = 0; i < links.length; i++) {
                if (links[i].querySelector('.fa-external-link')) { link = links[i]; break; }
            }
        }
        if (!link) return null;
        // Execute the A4J.AJAX.Submit onclick — this sets server state
        if (link.onclick) link.onclick(new Event('click'));
        return link.id;
    }""")
    return link_id


# ---------------------------------------------------------------------------
# Download Strategies
# ---------------------------------------------------------------------------

def strategy_a_context_route(context, page, frame, link_id, pdf_path):
    """
    Estratégia A: context.route() intercepta downloadBinario em todos os frames.
    O route.fetch() pega o body binário antes do browser processar.
    """
    captured = {"data": None, "done": False}

    def handle_route(route):
        if captured["done"]:
            try:
                route.abort()
            except Exception:
                pass
            return
        try:
            # Fetch the actual binary response from the server
            response = route.fetch()
            body = response.body
            ct = response.headers.get("content-type", "")

            if ("pdf" in ct or "octet" in ct) and len(body) > 5000:
                captured["data"] = body
                captured["done"] = True
                # Abort the navigation so the iframe doesn't break
                route.abort()
            elif len(body) > 50000:
                # Large response even if not PDF content-type — save it
                captured["data"] = body
                captured["done"] = True
                route.abort()
            else:
                # Small/HTML response — let it through
                route.fulfill(response=response)
        except Exception as e:
            print(f"\n      route error: {e}", end="", flush=True)
            try:
                route.abort()
            except Exception:
                pass

    # Register BEFORE clicking
    context.route("**/downloadBinario**", handle_route)

    try:
        # The onclick does A4J.AJAX.Submit which:
        # 1) POSTs form data to set server state (idProcessoSelecionado)
        # 2) Server responds with JS that navigates iframe to downloadBinario.seam
        # 3) Iframe navigates → context.route intercepts → route.fetch() gets PDF

        # Execute onclick
        frame.evaluate(f"""() => {{
            var link = document.getElementById('{link_id}');
            if (link && link.onclick) {{
                link.onclick(new Event('click'));
            }}
        }}""")

        # Wait for interception
        waited = 0
        while not captured["done"] and waited < 180:
            time.sleep(2)
            waited += 2
            if waited % 20 == 0:
                print(f"{waited}s..", end="", flush=True)

        if captured["data"]:
            with open(pdf_path, "wb") as f:
                f.write(captured["data"])
            return len(captured["data"])
        return None

    finally:
        try:
            context.unroute("**/downloadBinario**")
        except Exception:
            pass


def strategy_b_api_request(context, page, frame, link_id, pdf_path):
    """
    Estratégia B: context.request.get() com cookies compartilhados.
    O AJAX onclick já configurou o estado no servidor.
    """
    # Click Autos Digitais to set server state (if not already clicked)
    click_autos_digitais(frame)
    time.sleep(5)

    # Use Playwright's APIRequestContext — cookies are shared with browser
    try:
        response = context.request.get(DOWNLOAD_BINARY_URL)
        body = response.body()

        if len(body) > 5000:
            with open(pdf_path, "wb") as f:
                f.write(body)
            return len(body)
        return None
    except Exception as e:
        print(f"      api_request error: {e}")
        return None


def strategy_c_requests_session(context, page, frame, link_id, pdf_path):
    """
    Estratégia C: requests.Session() com cookies extraídos do Playwright.
    """
    import requests

    # Click Autos Digitais to set server state
    click_autos_digitais(frame)
    time.sleep(5)

    # Extract cookies from Playwright context
    cookies = context.cookies()
    session = requests.Session()
    for c in cookies:
        session.cookies.set(
            c["name"], c["value"],
            domain=c.get("domain", "pje.tjba.jus.br"),
            path=c.get("path", "/"),
        )

    # GET downloadBinario.seam
    try:
        resp = session.get(DOWNLOAD_BINARY_URL, timeout=120, stream=True)
        content_type = resp.headers.get("content-type", "")

        if resp.status_code == 200 and len(resp.content) > 5000:
            with open(pdf_path, "wb") as f:
                f.write(resp.content)
            return len(resp.content)
        else:
            print(f"      requests: HTTP {resp.status_code}, {len(resp.content)} bytes, type={content_type}")
            return None
    except Exception as e:
        print(f"      requests error: {e}")
        return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="PJe TJBA - Download Autos Digitais")
    parser.add_argument("-p", "--processo", help="Numero de um processo especifico")
    parser.add_argument("-l", "--lista", help="Arquivo com lista de numeros (um por linha)")
    parser.add_argument("-o", "--output", help="Diretorio de saida", default=str(DEFAULT_OUTPUT_DIR))
    parser.add_argument("--headless", action="store_true", help="Rodar sem interface grafica")
    args = parser.parse_args()

    cpf, senha = load_env()
    if not cpf or not senha:
        print("ERRO: Configure PJE_CPF e PJE_SENHA no .env.local")
        sys.exit(1)

    # Determine process list
    if args.processo:
        processos = [args.processo]
    elif args.lista:
        with open(args.lista) as f:
            processos = [l.strip() for l in f if l.strip() and not l.startswith("#")]
    else:
        processos = load_default_processos()

    if not processos:
        print("ERRO: Nenhum processo. Use -p, -l, ou tenha os JSONs no Desktop.")
        sys.exit(1)

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    headless = args.headless or HEADLESS

    print(f"=== PJe TJBA - Download Autos Digitais ===")
    print(f"Processos: {len(processos)}")
    print(f"Saida: {output_dir}")
    print(f"Estrategias: A (context.route) → B (api_request) → C (requests)\n")

    results = []
    strategies_used = {"A": 0, "B": 0, "C": 0, "fail": 0}

    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=headless,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = browser.new_context(
            viewport={"width": 1400, "height": 900},
            accept_downloads=True,
        )
        context.add_init_script("window.confirm = () => true; window.alert = () => true;")

        page = context.new_page()
        page.on("dialog", lambda d: d.accept())

        try:
            if not do_login(page, cpf, senha):
                print("ERRO: Login falhou")
                browser.close()
                return

            print("[PETICIONAR] Abrindo...")
            frame = open_peticionar(page)
            if not frame:
                print("ERRO: Peticionar nao carregou")
                browser.close()
                return
            print("[PETICIONAR] OK\n")

            for i, numero in enumerate(processos):
                pdf_path = output_dir / f"autos-{numero}.pdf"
                print(f"[{i+1}/{len(processos)}] {numero}")

                # Skip if already downloaded
                if pdf_path.exists() and pdf_path.stat().st_size > 10000:
                    size = pdf_path.stat().st_size
                    print(f"    Ja baixado ({size // 1024}KB) — skip")
                    results.append({"numero": numero, "status": "cached", "size": size})
                    continue

                # Search
                try:
                    found = search_processo(frame, numero)
                except Exception as e:
                    print(f"    ERRO busca: {e}")
                    results.append({"numero": numero, "status": "search_error"})
                    frame = open_peticionar(page)
                    continue

                if not found:
                    print(f"    Nao encontrado")
                    results.append({"numero": numero, "status": "not_found"})
                    continue

                # Find Autos Digitais link
                link_id = frame.evaluate("""() => {
                    var link = document.querySelector('a[title="Autos Digitais"]');
                    if (!link) {
                        var links = document.querySelectorAll('a');
                        for (var i = 0; i < links.length; i++) {
                            if (links[i].querySelector('.fa-external-link')) return links[i].id;
                        }
                    }
                    return link ? link.id : null;
                }""")

                if not link_id:
                    print(f"    Link Autos nao encontrado")
                    results.append({"numero": numero, "status": "no_link"})
                    continue

                # === Try download strategies A → B → C ===
                downloaded = False

                # Strategy A: context.route
                print(f"    [A] context.route...", end=" ", flush=True)
                try:
                    size = strategy_a_context_route(context, page, frame, link_id, pdf_path)
                    if size:
                        print(f"OK ({size // 1024}KB)")
                        results.append({"numero": numero, "status": "downloaded", "strategy": "A", "size": size})
                        strategies_used["A"] += 1
                        downloaded = True
                except Exception as e:
                    print(f"falhou ({str(e)[:60]})")

                # Strategy B: context.request.get
                if not downloaded:
                    print(f"    [B] api_request...", end=" ", flush=True)
                    try:
                        # Need to re-search and click since frame may be broken
                        frame = open_peticionar(page)
                        if frame and search_processo(frame, numero):
                            size = strategy_b_api_request(context, page, frame, link_id, pdf_path)
                            if size:
                                print(f"OK ({size // 1024}KB)")
                                results.append({"numero": numero, "status": "downloaded", "strategy": "B", "size": size})
                                strategies_used["B"] += 1
                                downloaded = True
                            else:
                                print("sem dados")
                        else:
                            print("busca falhou")
                    except Exception as e:
                        print(f"falhou ({str(e)[:60]})")

                # Strategy C: requests.Session
                if not downloaded:
                    print(f"    [C] requests...", end=" ", flush=True)
                    try:
                        frame = open_peticionar(page)
                        if frame and search_processo(frame, numero):
                            size = strategy_c_requests_session(context, page, frame, link_id, pdf_path)
                            if size:
                                print(f"OK ({size // 1024}KB)")
                                results.append({"numero": numero, "status": "downloaded", "strategy": "C", "size": size})
                                strategies_used["C"] += 1
                                downloaded = True
                            else:
                                print("sem dados")
                        else:
                            print("busca falhou")
                    except Exception as e:
                        print(f"falhou ({str(e)[:60]})")

                if not downloaded:
                    print(f"    FALHOU em todas as estrategias")
                    results.append({"numero": numero, "status": "failed"})
                    strategies_used["fail"] += 1

                # Reload Peticionar for next process
                try:
                    frame = open_peticionar(page)
                except Exception:
                    pass

                time.sleep(2)

        except Exception as e:
            print(f"\nERRO GERAL: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

    # Save log
    log_path = output_dir / "download-log.json"
    log = {
        "timestamp": datetime.now().isoformat(),
        "total": len(results),
        "downloaded": sum(1 for r in results if r.get("status") in ("downloaded", "cached")),
        "failed": strategies_used["fail"],
        "strategies": strategies_used,
        "processos": results,
    }
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(log, f, ensure_ascii=False, indent=2)

    total_size = sum(r.get("size", 0) for r in results)
    print(f"\n=== Resultado ===")
    print(f"Baixados: {log['downloaded']}/{log['total']} ({total_size // (1024*1024)}MB)")
    print(f"Estrategias: A={strategies_used['A']} B={strategies_used['B']} C={strategies_used['C']} fail={strategies_used['fail']}")
    print(f"Log: {log_path}")


if __name__ == "__main__":
    main()
