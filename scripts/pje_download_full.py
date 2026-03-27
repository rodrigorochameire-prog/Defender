#!/usr/bin/env python3
"""
PJe TJBA - Download Autos Digitais (Full Pipeline)
Unifica Fase 1 (enfileirar) + Fase 2 (baixar) em um script Playwright.

NOTA: A Fase 1 (enfileirar) funciona melhor via agent-browser (pje_download_v4.sh)
porque o iframe do Peticionar é same-origin e o JSF onclick funciona via eval.
No Playwright, o JSF onclick não dispara a navegação corretamente.

Para uso normal:
  1. PJE_SESSION=pjeN bash scripts/pje_download_v4.sh lista.txt   # Fase 1
  2. python3 scripts/pje_area_download.py                          # Fase 2

Este script full é para quando ambas as fases devem rodar no mesmo pipeline.
"""
import os, sys, time, re, random, subprocess, base64
from pathlib import Path
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

# ============================================================================
# Config
# ============================================================================
load_dotenv(Path.home() / "Projetos/Defender/.env.local")
CPF = os.environ.get("PJE_CPF", "")
SENHA = os.environ.get("PJE_SENHA", "")
OUTPUT_DIR = Path.home() / "Desktop/pje-autos-juri"
LIST_FILE = sys.argv[1] if len(sys.argv) > 1 else str(Path.home() / "Desktop/juri-pendentes.txt")
BASE = "https://pje.tjba.jus.br/pje"
RELOGIN_EVERY = 8
PROFILE_DIR = str(Path.home() / ".pje-playwright-profile")

OUTPUT_DIR.mkdir(exist_ok=True)

# Load process list
with open(LIST_FILE) as f:
    PROCESSOS = [l.strip() for l in f if l.strip()]

print(f"=== PJe Download Full Pipeline ===")
print(f"Processos: {len(PROCESSOS)} | Output: {OUTPUT_DIR}")
print()


# ============================================================================
# Helpers
# ============================================================================
def parse_num(num):
    """'8015405-36.2022.8.05.0039' → (seq, dig, ano, org)"""
    m = re.match(r'(\d+)-(\d+)\.(\d+)\.\d+\.\d+\.(\d+)', num)
    return (m.group(1), m.group(2), m.group(3), m.group(4)) if m else (None,)*4


def human_sleep(min_s=1.0, max_s=2.0):
    time.sleep(random.uniform(min_s, max_s))


def curl_download(url, path, timeout=300):
    """Download via curl, return file size or 0"""
    subprocess.run(["curl", "-sL", url, "-o", str(path), "--max-time", str(timeout)],
                   capture_output=True)
    return path.stat().st_size if path.exists() else 0


# ============================================================================
# Login
# ============================================================================
def do_login(page):
    page.goto(f"{BASE}/login.seam", wait_until="networkidle", timeout=30000)
    time.sleep(3)

    if "Painel" in page.title() or "advogado" in page.url:
        print("  [LOGIN] Já logado")
        return True

    try:
        page.fill('#username, input[name="username"]', CPF, timeout=5000)
        page.fill('#password, input[name="password"]', SENHA, timeout=5000)
        for sel in ['#kc-login', 'input[type="submit"]', 'button:has-text("Entrar")']:
            try:
                page.click(sel, timeout=3000)
                break
            except:
                pass
        page.wait_for_url("**/advogado**", timeout=25000)
        print("  [LOGIN] OK")
        return True
    except Exception as e:
        # Check for code verification
        if "Informe o código" in page.content():
            print("  [LOGIN] PJe pediu código de verificação por email!")
            code = input("  Digite o código recebido por email: ").strip()
            if code:
                page.fill('input[type="number"], input[name*="code"]', code, timeout=5000)
                page.click('button:has-text("Validar")', timeout=5000)
                page.wait_for_url("**/advogado**", timeout=20000)
                print("  [LOGIN] OK (com código)")
                return True
        print(f"  [LOGIN] Erro: {e}")
        return False


# ============================================================================
# Fase 1: Enfileirar
# ============================================================================
def goto_peticionar(page):
    for attempt in range(3):
        try:
            page.goto(f"{BASE}/Painel/painel_usuario/advogado.seam",
                      wait_until="networkidle", timeout=20000)
            time.sleep(4)

            # Check if logged out
            if "login" in page.url.lower() or "sso.cloud" in page.url:
                do_login(page)
                continue

            # Click PETICIONAR tab via JS (most reliable)
            result = page.evaluate("""() => {
                var els = document.querySelectorAll('table[onclick], td[onclick]');
                for (var el of els) {
                    if (el.textContent.trim().startsWith('Peticionar') ||
                        el.textContent.trim() === 'PETICIONAR') {
                        el.onclick ? el.onclick(new Event('click')) : el.click();
                        return 'clicked';
                    }
                }
                var cells = document.querySelectorAll('td');
                for (var c of cells) {
                    if (c.textContent.trim() === 'PETICIONAR') { c.click(); return 'clicked_td'; }
                }
                return 'not_found';
            }""")

            if 'not_found' in result:
                print(f"  [goto_pet] attempt {attempt+1}: PETICIONAR not found")
                continue

            time.sleep(10)

            # Verify iframe loaded (same-origin in Peticionar)
            ready = page.evaluate("""() => {
                var f = document.querySelector('iframe');
                return f && f.contentDocument &&
                       f.contentDocument.querySelector('input[id*="searchProcessos"]') ? 'ready' : 'fail';
            }""")

            if ready == 'ready':
                return True

            print(f"  [goto_pet] attempt {attempt+1}: iframe not ready ({ready})")
        except Exception as e:
            print(f"  [goto_pet] attempt {attempt+1}: {e}")

        time.sleep(3)
    return False


def search_proc(page, num):
    seq, dig, ano, org = parse_num(num)
    if not seq:
        return False

    try:
        # Try same-origin eval first
        page.evaluate(f"""() => {{
            var iframe = document.querySelector('iframe');
            try {{
                var d = iframe.contentDocument;
                var c = d.querySelector('input[id*="clearButton"]');
                if (c) c.click();
            }} catch(e) {{}}
        }}""")
        time.sleep(2)

        result = page.evaluate(f"""() => {{
            var iframe = document.querySelector('iframe');
            try {{
                var d = iframe.contentDocument;
                d.querySelector('input[id*="numeroSequencial"]').value = '{seq}';
                d.querySelector('input[id*="Verificador"]').value = '{dig}';
                d.querySelector('input[id*="Ano"]').value = '{ano}';
                d.querySelector('input[id*="OrgaoJustica"]').value = '{org}';
                d.querySelector('input[id*="searchProcessos"]').click();
                return 'searched';
            }} catch(e) {{
                return 'error:' + e.message;
            }}
        }}""")

        if 'error' in result:
            # Fallback: use frame_locator
            fl = page.frame_locator("iframe").first
            try:
                fl.locator('input[id*="clearButton"]').click(timeout=3000)
                time.sleep(1)
            except:
                pass
            fl.locator('input[id*="numeroSequencial"]').fill(seq, timeout=3000)
            fl.locator('input[id*="Verificador"]').fill(dig, timeout=3000)
            fl.locator('input[id*="Ano"]').fill(ano, timeout=3000)
            fl.locator('input[id*="OrgaoJustica"]').fill(org, timeout=3000)
            fl.locator('input[id*="searchProcessos"]').click(timeout=3000)

        time.sleep(7)

        # Check result
        try:
            found = page.evaluate("""() => {
                try {
                    var d = document.querySelector('iframe').contentDocument;
                    return d.querySelector('tr.rich-table-row') ? 'found' : 'not_found';
                } catch(e) { return 'error'; }
            }""")
            if found == 'found':
                return True
        except:
            pass

        # Fallback check via frame_locator
        try:
            fl = page.frame_locator("iframe").first
            rows = fl.locator('tr.rich-table-row')
            return rows.count() > 0
        except:
            return False

    except Exception as e:
        print(f"  [search] {e}")
        return False


def click_autos(page, num):
    try:
        # Try evaluate first (same-origin iframe)
        result = page.evaluate("""() => {
            var d = document.querySelector('iframe');
            if (!d) return 'no_iframe';
            try {
                var doc = d.contentDocument;
                if (!doc) return 'cross_origin';
                var link = doc.querySelector('a[title="Autos Digitais"]');
                if (link && link.onclick) { link.onclick(new Event('click')); return 'clicked'; }
                if (link) { link.click(); return 'clicked_direct'; }
                return 'no_link';
            } catch(e) {
                return 'error:' + e.message;
            }
        }""")
        print(f"({result}) ", end="", flush=True)

        if 'cross_origin' in result or 'error' in result:
            # Fallback: use frame_locator for cross-origin iframe
            try:
                iframe = page.frame_locator("iframe").first
                autos = iframe.locator('a[title="Autos Digitais"]')
                if autos.count() > 0:
                    autos.first.click(timeout=5000)
                    result = 'clicked_fl'
                    print(f"(frame_locator) ", end="", flush=True)
            except Exception as e2:
                # Fallback 2: use page.frames
                for f in page.frames:
                    if f != page.main_frame:
                        try:
                            link = f.query_selector('a[title="Autos Digitais"]')
                            if link:
                                link.click()
                                result = 'clicked_frame'
                                print(f"(frame) ", end="", flush=True)
                                break
                        except:
                            pass

        if 'clicked' not in result and 'no_link' not in result:
            return False
        if 'no_link' in result:
            return False

        time.sleep(15)  # Wait longer for page to load

        title = page.title()
        url = page.url
        print(f"[title={title[:40]}] [url={url[:60]}] ", end="", flush=True)

        # More flexible check: title contains process number or URL changed
        is_autos = (
            len(title) > 0 and title[0].isdigit()
            or 'DetalheProcesso' in url
            or 'listProcessoCompleto' in url
            or 'ConsultaProcesso' in url
            or num[:7] in title  # Process number in title
            or 'Painel' not in title  # At least not on the panel anymore
        )
        return is_autos
    except Exception as e:
        print(f"  [autos] {e}")
        return False


def queue_download(page, num):
    """Click download icon → Cronologia Crescente → Download → confirmation"""
    try:
        # Find download icon button
        # Pattern: button with "Ícone de download" or aria-expanded with download
        dl_btn = None
        for selector in [
            'button:has-text("Ícone de download")',
            'button[title*="download" i]',
            'button:has(i.fa-download)',
        ]:
            try:
                loc = page.locator(selector)
                if loc.count() > 0:
                    dl_btn = loc.first
                    break
            except:
                pass

        if not dl_btn:
            # Fallback: look for expandable buttons (download is usually the first one)
            buttons = page.locator('button[aria-expanded]')
            for i in range(buttons.count()):
                text = buttons.nth(i).inner_text().lower()
                if 'download' in text:
                    dl_btn = buttons.nth(i)
                    break

        if not dl_btn:
            return "no_dl_icon"

        dl_btn.click()
        time.sleep(3)

        # Set Cronologia to Crescente
        try:
            combo = page.locator('select, [role="combobox"]').first
            combo.select_option(label="Crescente")
            human_sleep(0.5, 1.0)
        except:
            pass  # May not have cronologia selector

        # Click Download button
        try:
            page.locator('button:has-text("Download")').first.click(timeout=5000)
        except:
            return "no_dl_btn"

        time.sleep(5)

        # Check confirmation
        text = page.locator('body').inner_text()
        if "Área de download" in text or "será disponibilizado" in text or "ÁREA DE DOWNLOAD" in text:
            return "queued"
        return "queue_unknown"

    except Exception as e:
        return f"error:{e}"


def enqueue_all(page, processos):
    """Fase 1: Enfileirar todos os processos"""
    queued, cached, failed = [], [], []
    proc_counter = 0

    if not goto_peticionar(page):
        print("ERRO: Peticionar falhou no início")
        return queued, cached, failed

    for i, num in enumerate(processos):
        idx = i + 1
        pdf = OUTPUT_DIR / f"autos-{num}.pdf"

        if pdf.exists() and pdf.stat().st_size > 10000:
            print(f"[{idx}/{len(processos)}] {num} - CACHED")
            cached.append(num)
            continue

        # Relogin periodically
        if proc_counter >= RELOGIN_EVERY:
            print("  [RELOGIN]...")
            do_login(page)
            proc_counter = 0
            if not goto_peticionar(page):
                print("  Peticionar falhou após relogin")
                failed.append(f"{num}:peticionar_fail")
                break

        print(f"[{idx}/{len(processos)}] {num} - ", end="", flush=True)

        if not search_proc(page, num):
            print("NOT FOUND")
            failed.append(f"{num}:not_found")
            proc_counter += 1
            continue

        if not click_autos(page, num):
            print("AUTOS FAIL")
            failed.append(f"{num}:autos_fail")
            proc_counter += 1
            if not goto_peticionar(page):
                do_login(page)
                goto_peticionar(page)
            continue

        result = queue_download(page, num)
        if "queued" in result:
            print("QUEUED")
            queued.append(num)
        else:
            print(f"FAIL ({result})")
            failed.append(f"{num}:{result}")

        proc_counter += 1
        human_sleep(1.0, 2.0)

        if not goto_peticionar(page):
            do_login(page)
            if not goto_peticionar(page):
                failed.append(f"{num}:peticionar_fail")
                break

    return queued, cached, failed


# ============================================================================
# Fase 2: Baixar da Área de Download
# ============================================================================
def download_all(page, queued_procs):
    """Download PDFs from Área de Download"""
    if not queued_procs:
        return 0

    downloaded = 0
    remaining = list(queued_procs)

    for round_num in range(1, 31):
        if not remaining:
            break

        print(f"  --- Round {round_num} ---")

        page.goto(f"{BASE}/AreaDeDownload/listView.seam",
                  wait_until="networkidle", timeout=20000)
        time.sleep(8)

        # Find iframe
        iframe = None
        for f in page.frames:
            if f != page.main_frame:
                iframe = f
                break

        if not iframe:
            print("  [AREA] No iframe found")
            time.sleep(15)
            continue

        # Read status of all processes
        rows = iframe.query_selector_all("tr")
        status_map = {}
        for row in rows:
            cells = row.query_selector_all("td")
            if len(cells) >= 4:
                num = cells[0].inner_text().strip()
                status = cells[3].inner_text().strip()
                if num and num[0].isdigit():
                    status_map[num] = status

        still_waiting = []
        for num in remaining:
            pdf = OUTPUT_DIR / f"autos-{num}.pdf"
            if pdf.exists() and pdf.stat().st_size > 10000:
                downloaded += 1
                continue

            status = status_map.get(num)
            if not status:
                still_waiting.append(num)
                continue

            if status != "Sucesso":
                still_waiting.append(num)
                continue

            print(f"  {num}: ", end="", flush=True)

            # Reload page fresh for this download
            page.goto(f"{BASE}/AreaDeDownload/listView.seam",
                      wait_until="networkidle", timeout=20000)
            time.sleep(8)

            # Re-find iframe and button
            iframe = None
            for f in page.frames:
                if f != page.main_frame:
                    iframe = f
                    break

            if not iframe:
                print("no iframe")
                still_waiting.append(num)
                continue

            btn = None
            for row in iframe.query_selector_all("tr"):
                cells = row.query_selector_all("td")
                if len(cells) >= 4 and num in cells[0].inner_text():
                    btn = row.query_selector("button:not([disabled])")
                    break

            if not btn:
                print("no button")
                still_waiting.append(num)
                continue

            try:
                # Listen for new tab (S3 URL)
                with page.context.expect_page(timeout=25000) as new_page_info:
                    btn.click()
                    time.sleep(2)

                new_page = new_page_info.value
                time.sleep(5)
                new_url = new_page.url

                if "amazonaws" in new_url or "s3." in new_url:
                    size = curl_download(new_url, pdf)
                    if size > 10000:
                        print(f"OK ({size // 1024}KB)")
                        downloaded += 1
                    else:
                        print("SMALL")
                        pdf.unlink(missing_ok=True)
                        still_waiting.append(num)
                else:
                    # New tab opened but not S3 - might be PDF viewer
                    # Try to get download from it
                    try:
                        with new_page.expect_download(timeout=10000) as dl_info:
                            pass
                        dl = dl_info.value
                        dl.save_as(str(pdf))
                        size = pdf.stat().st_size
                        if size > 10000:
                            print(f"OK via viewer ({size // 1024}KB)")
                            downloaded += 1
                        else:
                            pdf.unlink(missing_ok=True)
                            still_waiting.append(num)
                            print("SMALL")
                    except:
                        print(f"FAIL (tab: {new_url[:50]})")
                        still_waiting.append(num)

                new_page.close()

            except Exception:
                # No new tab - check S3 redirect on main page
                url = page.url
                if "amazonaws" in url or "s3." in url:
                    size = curl_download(url, pdf)
                    if size > 10000:
                        print(f"OK via redirect ({size // 1024}KB)")
                        downloaded += 1
                    else:
                        print("SMALL")
                        pdf.unlink(missing_ok=True)
                        still_waiting.append(num)
                else:
                    print(f"FAIL (no popup)")
                    still_waiting.append(num)

        remaining = still_waiting
        if remaining:
            print(f"  Aguardando {len(remaining)}... (round {round_num}/30)")
            time.sleep(15)

    return downloaded


# ============================================================================
# Main
# ============================================================================
def main():
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            PROFILE_DIR,
            headless=False,
            accept_downloads=True,
            viewport={"width": 1366, "height": 768},
            locale="pt-BR",
            timezone_id="America/Bahia",
            args=[
                "--disable-blink-features=AutomationControlled",
            ],
        )

        page = context.pages[0] if context.pages else context.new_page()

        # Anti-detection
        context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            window.confirm = () => true;
            window.alert = () => true;
        """)

        # Dialog handling (Playwright level)
        page.on("dialog", lambda d: d.accept())

        # CDP: global dialog handling (covers ALL frames including cross-origin)
        try:
            cdp = context.new_cdp_session(page)
            cdp.send("Page.enable")
            def handle_cdp_dialog(params):
                try:
                    cdp.send("Page.handleJavaScriptDialog", {"accept": True})
                except:
                    pass
            cdp.on("Page.javascriptDialogOpening", handle_cdp_dialog)
        except Exception as e:
            print(f"  [CDP] Warning: {e}")

        # New tab handler
        def on_new_page(new_page):
            new_page.on("dialog", lambda d: d.accept())
        context.on("page", on_new_page)

        # Login
        if not do_login(page):
            print("ERRO: Login falhou!")
            context.close()
            sys.exit(1)

        # Fase 1
        print("\n=== FASE 1: Enfileirar downloads ===")
        queued, cached, failed = enqueue_all(page, PROCESSOS)

        print(f"\nEnfileirados: {len(queued)} | Cached: {len(cached)} | Falhas: {len(failed)}")
        if failed:
            for f in failed:
                print(f"  {f}")

        # Fase 2
        if queued:
            print(f"\n=== FASE 2: Baixar PDFs ===")
            # Wait a bit for PJe to process
            print("  Aguardando 30s para PJe processar os downloads...")
            time.sleep(30)
            downloaded = download_all(page, queued)
        else:
            downloaded = 0

        # Summary
        total_pdfs = len(list(OUTPUT_DIR.glob("*.pdf")))
        total_size = sum(f.stat().st_size for f in OUTPUT_DIR.glob("*.pdf"))
        print(f"\n=== RESUMO FINAL ===")
        print(f"Enfileirados: {len(queued)}")
        print(f"Baixados (sessão): {downloaded}")
        print(f"Cached: {len(cached)}")
        print(f"Falhas: {len(failed)}")
        print(f"Total PDFs: {total_pdfs} ({total_size // (1024*1024)}MB)")

        context.close()


if __name__ == "__main__":
    main()
