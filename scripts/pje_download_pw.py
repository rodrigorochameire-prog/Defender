#!/usr/bin/env python3
"""
PJe TJBA - Download Autos Digitais via Playwright
Auto-aceita dialogs, acessa iframes, gerencia downloads nativamente.
"""
import os, sys, time, re
from pathlib import Path
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright, Dialog, Download

# Config
load_dotenv(Path.home() / "Projetos/Defender/.env.local")
CPF = os.environ.get("PJE_CPF", "")
SENHA = os.environ.get("PJE_SENHA", "")
OUTPUT_DIR = Path.home() / "Desktop/pje-autos-juri"
LIST_FILE = sys.argv[1] if len(sys.argv) > 1 else str(Path.home() / "Desktop/juri-pendentes.txt")
RELOGIN_EVERY = 8
BASE = "https://pje.tjba.jus.br/pje"

OUTPUT_DIR.mkdir(exist_ok=True)

# Load process list
with open(LIST_FILE) as f:
    PROCESSOS = [l.strip() for l in f if l.strip()]

print(f"=== PJe Download Autos (Playwright) ===")
print(f"Processos: {len(PROCESSOS)} | Output: {OUTPUT_DIR}")
print()


def parse_num(num):
    """Parse '8015405-36.2022.8.05.0039' into parts"""
    m = re.match(r'(\d+)-(\d+)\.(\d+)\.\d+\.\d+\.(\d+)', num)
    if m:
        return m.group(1), m.group(2), m.group(3), m.group(4)
    return None, None, None, None


def do_login(page):
    """Login to PJe"""
    page.goto(f"{BASE}/login.seam", wait_until="networkidle", timeout=30000)
    time.sleep(3)

    if "Painel" in page.title():
        print("  [LOGIN] Já logado")
        return True

    # Fill login form
    try:
        page.fill('#username, input[name="username"]', CPF, timeout=5000)
        page.fill('#password, input[name="password"]', SENHA, timeout=5000)
        # Try multiple selectors for the login button
        for btn_sel in ['#kc-login', 'input[type="submit"]', 'button:has-text("Entrar")', 'input[value="Entrar"]']:
            try:
                page.click(btn_sel, timeout=3000)
                break
            except:
                pass
        page.wait_for_load_state("networkidle", timeout=20000)
        time.sleep(5)

        if "Painel" in page.title() or "advogado" in page.url:
            print("  [LOGIN] OK")
            return True

        # Check for code verification page
        if "Informe o código" in page.content():
            print("  [LOGIN] ERRO: PJe pediu código de verificação!")
            return False
    except Exception as e:
        print(f"  [LOGIN] Erro: {e}")

    return False


def goto_peticionar(page):
    """Navigate to Peticionar tab"""
    for attempt in range(3):
        try:
            page.goto(f"{BASE}/Painel/painel_usuario/advogado.seam",
                      wait_until="networkidle", timeout=20000)
            time.sleep(3)

            # Check if logged out
            if "login" in page.url.lower() or "sso.cloud" in page.url:
                print("  [goto_pet] Sessão perdida, relogando...")
                if not do_login(page):
                    continue
                page.goto(f"{BASE}/Painel/painel_usuario/advogado.seam",
                          wait_until="networkidle", timeout=20000)
                time.sleep(3)

            # Click PETICIONAR via JS (most reliable)
            result = page.evaluate("""
                () => {
                    // Method 1: Find table/td with onclick containing 'Peticionar' text
                    var els = document.querySelectorAll('table[onclick], td[onclick]');
                    for (var el of els) {
                        if (el.textContent.trim().startsWith('Peticionar') ||
                            el.textContent.trim() === 'PETICIONAR') {
                            el.onclick ? el.onclick(new Event('click')) : el.click();
                            return 'clicked_onclick: ' + el.tagName;
                        }
                    }
                    // Method 2: Find td with exact PETICIONAR text
                    var cells = document.querySelectorAll('td');
                    for (var c of cells) {
                        var t = c.textContent.trim();
                        if (t === 'PETICIONAR' || t.startsWith('PETICIONAR')) {
                            c.click();
                            return 'clicked_td';
                        }
                    }
                    // Method 3: Find LayoutTableCell
                    var ltcells = document.querySelectorAll('[role="cell"], [class*="LayoutTableCell"]');
                    for (var c of ltcells) {
                        if (c.textContent.includes('PETICIONAR')) {
                            c.click();
                            return 'clicked_ltcell';
                        }
                    }
                    return 'not_found';
                }
            """)
            print(f"    PETICIONAR click: {result}")

            if 'not_found' in result:
                print(f"  [goto_pet] Tentativa {attempt+1}: aba não encontrada")
                continue

            # Wait longer for iframe to load
            time.sleep(12)

            # Wait for iframe with search form
            # Try frame_locator first, then page.frames for cross-origin
            try:
                iframe = page.frame_locator("iframe").first
                iframe.locator('input[id*="numeroSequencial"], input[id*="searchProcessos"]').wait_for(timeout=5000)
                return True
            except:
                pass

            # Try accessing frames directly (cross-origin)
            for f in page.frames:
                try:
                    if f.url and "pje" in f.url and f != page.main_frame:
                        el = f.query_selector('input[id*="numeroSequencial"], input[id*="searchProcessos"]')
                        if el:
                            return True
                except:
                    pass

            print(f"  [goto_pet] Tentativa {attempt+1}: iframe não carregou")
            # Debug: print frame URLs and iframe elements
            for f in page.frames:
                print(f"    frame: {f.url[:80]}")
            # Check for iframes in DOM
            iframes = page.query_selector_all("iframe")
            print(f"    iframes in DOM: {len(iframes)}")
            for ifr in iframes:
                src = ifr.get_attribute("src") or "(no src)"
                print(f"      iframe src: {src[:80]}")

        except Exception as e:
            print(f"  [goto_pet] Tentativa {attempt+1}: {e}")

        time.sleep(3)

    return False


def search_proc(page, num):
    """Search for a process in Peticionar iframe"""
    seq, dig, ano, org = parse_num(num)
    if not seq:
        return False

    iframe = page.frame_locator("iframe").first

    # Clear previous search
    try:
        iframe.locator('input[id*="clearButton"], button:has-text("Limpar")').click(timeout=3000)
        time.sleep(2)
    except:
        pass

    # Fill search fields
    try:
        iframe.locator('input[id*="numeroSequencial"]').fill(seq, timeout=3000)
        iframe.locator('input[id*="Verificador"]').fill(dig, timeout=3000)
        iframe.locator('input[id*="Ano"]').fill(ano, timeout=3000)
        iframe.locator('input[id*="OrgaoJustica"]').fill(org, timeout=3000)

        # Click search
        iframe.locator('input[id*="searchProcessos"], button:has-text("Pesquisar")').first.click(timeout=3000)
        time.sleep(7)

        # Check results
        result_text = iframe.locator('body').inner_text(timeout=5000)
        if "Nenhum resultado" in result_text or "0 resultados" in result_text:
            return False
        if "resultados encontrados" in result_text or num[:7] in result_text:
            return True
    except Exception as e:
        print(f"    [search] Erro: {e}")

    return False


def click_autos(page, num):
    """Click 'Autos Digitais' link in search results"""
    iframe = page.frame_locator("iframe").first

    try:
        # Click Autos Digitais link
        autos_link = iframe.locator('a[title="Autos Digitais"]')
        if autos_link.count() > 0:
            # The onclick triggers navigation on the MAIN page
            autos_link.first.evaluate("el => el.onclick(new Event('click'))")
            time.sleep(12)

            # Check if main page navigated to autos
            if num[:7] in page.title() or "listProcessoCompleto" in page.url:
                return True
    except Exception as e:
        print(f"    [autos] Erro: {e}")

    return False


def queue_download(page, num):
    """Click download icon and confirm to queue for Área de Download"""
    try:
        # Find download icon button (the one with "Ícone de download" or similar)
        # It's usually a button with aria-expanded or a specific class
        page.wait_for_load_state("networkidle", timeout=10000)

        # Try to find download button by various means
        dl_btn = None
        for selector in [
            'button[title*="download" i]',
            'button[title*="Download" i]',
            'a[title*="download" i]',
            'button:has(i.fa-download)',
            'button:has(span.fa-download)',
        ]:
            try:
                loc = page.locator(selector)
                if loc.count() > 0:
                    dl_btn = loc.first
                    break
            except:
                pass

        if not dl_btn:
            # Fallback: find by snapshot text pattern
            buttons = page.locator('button[aria-expanded]')
            for i in range(buttons.count()):
                try:
                    btn = buttons.nth(i)
                    # Download icon is usually the first or second expandable button
                    if btn.is_visible():
                        dl_btn = btn
                        break
                except:
                    pass

        if not dl_btn:
            return "no_dl_btn"

        dl_btn.click()
        time.sleep(3)

        # Now find and click "Download" confirm button
        try:
            confirm = page.locator('button:has-text("Download"):visible').first
            confirm.click(timeout=5000)
            time.sleep(5)
        except:
            return "no_confirm"

        # Check success message
        text = page.locator('body').inner_text()
        if "Área de download" in text or "será disponibilizado" in text:
            return "queued"

        return "queue_unknown"

    except Exception as e:
        return f"error:{e}"


def download_from_area(page, queued_procs):
    """Download PDFs from Área de Download"""
    downloaded = 0
    remaining = list(queued_procs)

    for round_num in range(1, 31):
        if not remaining:
            break

        print(f"  --- Round {round_num} ---")

        page.goto(f"{BASE}/AreaDeDownload/listView.seam",
                  wait_until="networkidle", timeout=20000)
        time.sleep(8)

        # The table is inside a cross-origin iframe
        # Use frame() to access it
        frames = page.frames
        area_frame = None
        for f in frames:
            try:
                if "area-download" in f.url or "AreaDeDownload" in f.url:
                    area_frame = f
                    break
            except:
                pass

        if not area_frame:
            # Try the first iframe
            iframe_el = page.query_selector("iframe")
            if iframe_el:
                src = iframe_el.get_attribute("src") or ""
                for f in frames:
                    if src and src in f.url:
                        area_frame = f
                        break

        if not area_frame:
            print("  [AREA] Iframe não encontrado, tentando page direta...")
            area_frame = page

        still_waiting = []

        for num in remaining:
            pdf_path = OUTPUT_DIR / f"autos-{num}.pdf"
            if pdf_path.exists() and pdf_path.stat().st_size > 10000:
                downloaded += 1
                continue

            try:
                # Find row with this process number
                rows = area_frame.query_selector_all("tr")
                found_row = None
                status = None

                for row in rows:
                    cells = row.query_selector_all("td")
                    if len(cells) >= 4:
                        cell_text = cells[0].inner_text().strip()
                        if num in cell_text:
                            status = cells[3].inner_text().strip()
                            found_row = row
                            break

                if not found_row:
                    still_waiting.append(num)
                    continue

                if status == "Sucesso":
                    print(f"  {num}: ", end="", flush=True)

                    # Click download button in this row
                    btn = found_row.query_selector("button:not([disabled])")
                    if not btn:
                        print("no button")
                        still_waiting.append(num)
                        continue

                    # Click and wait for navigation or download
                    btn.click()
                    time.sleep(8)

                    # Check if page navigated to S3 or a download page
                    current_url = page.url

                    # Check if there's a second "Download" button (new page)
                    try:
                        dl2 = page.locator('button:has-text("Download"):visible, a:has-text("Download"):visible')
                        if dl2.count() > 0:
                            print("(2nd page) ", end="", flush=True)

                            # Try to intercept the download
                            with page.expect_download(timeout=30000) as download_info:
                                dl2.first.click()

                            download = download_info.value
                            download.save_as(str(pdf_path))
                            size = pdf_path.stat().st_size
                            if size > 10000:
                                print(f"OK ({size//1024}KB)")
                                downloaded += 1
                                continue
                            else:
                                pdf_path.unlink(missing_ok=True)
                    except Exception as e:
                        pass

                    # Fallback: check if navigated to S3 URL
                    current_url = page.url
                    if "amazonaws" in current_url or "s3." in current_url:
                        # Download via the URL
                        import subprocess
                        result = subprocess.run(
                            ["curl", "-sL", current_url, "-o", str(pdf_path), "--max-time", "300"],
                            capture_output=True
                        )
                        size = pdf_path.stat().st_size if pdf_path.exists() else 0
                        if size > 10000:
                            print(f"OK via S3 ({size//1024}KB)")
                            downloaded += 1
                        else:
                            print(f"SMALL ({size}B)")
                            pdf_path.unlink(missing_ok=True)
                            still_waiting.append(num)
                    else:
                        # Check ~/Downloads
                        dl_dir = Path.home() / "Downloads"
                        pdfs = sorted(dl_dir.glob("*.pdf"), key=lambda p: p.stat().st_mtime, reverse=True)
                        if pdfs:
                            newest = pdfs[0]
                            if newest.stat().st_size > 10000 and (time.time() - newest.stat().st_mtime) < 30:
                                newest.rename(pdf_path)
                                size = pdf_path.stat().st_size
                                print(f"OK via Downloads ({size//1024}KB)")
                                downloaded += 1
                                continue

                        print(f"FAIL (url: {current_url[:60]})")
                        still_waiting.append(num)

                elif status in ("Processando", "Em processamento", "Fila"):
                    still_waiting.append(num)
                else:
                    print(f"  {num}: status={status}")
                    still_waiting.append(num)

            except Exception as e:
                print(f"  {num}: ERROR {e}")
                still_waiting.append(num)

        remaining = still_waiting
        if remaining:
            print(f"  Aguardando {len(remaining)} processos... (round {round_num}/30)")
            time.sleep(15)

    return downloaded


def main():
    with sync_playwright() as p:
        # Use persistent context to keep cookies/session across runs
        user_data_dir = str(Path.home() / ".pje-playwright-profile")
        context = p.chromium.launch_persistent_context(
            user_data_dir,
            headless=False,
            accept_downloads=True,
            viewport={"width": 1280, "height": 900},
            args=["--disable-blink-features=AutomationControlled"],
        )
        page = context.pages[0] if context.pages else context.new_page()

        # Auto-accept ALL dialogs (CNJ resolution warning)
        def handle_dialog(dialog: Dialog):
            print(f"  [DIALOG] {dialog.type}: {dialog.message[:60]}... → accept")
            dialog.accept()
        page.on("dialog", handle_dialog)

        # Login
        if not do_login(page):
            print("ERRO: Login falhou!")
            context.close()
            sys.exit(1)

        # ============================================================
        # FASE 1: Enfileirar downloads
        # ============================================================
        print("\n=== FASE 1: Enfileirar downloads ===")

        queued = []
        cached = []
        failed = []
        proc_counter = 0

        if not goto_peticionar(page):
            print("ERRO: Peticionar falhou!")
            context.close()
            sys.exit(1)

        for i, num in enumerate(PROCESSOS):
            idx = i + 1
            pdf_path = OUTPUT_DIR / f"autos-{num}.pdf"

            if pdf_path.exists() and pdf_path.stat().st_size > 10000:
                print(f"[{idx}/{len(PROCESSOS)}] {num} - CACHED")
                cached.append(num)
                continue

            # Relogin periodically
            if proc_counter >= RELOGIN_EVERY:
                print("  [RELOGIN]...")
                do_login(page)
                proc_counter = 0
                if not goto_peticionar(page):
                    print("  ERRO: Peticionar falhou após relogin")
                    break

            print(f"[{idx}/{len(PROCESSOS)}] {num} - ", end="", flush=True)

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
                print(f"QUEUE FAIL ({result})")
                failed.append(f"{num}:{result}")

            proc_counter += 1

            if not goto_peticionar(page):
                print("  WARN: goto_peticionar falhou")
                do_login(page)
                if not goto_peticionar(page):
                    print("  ERRO: Não conseguiu voltar ao Peticionar")
                    break

            time.sleep(1)

        print(f"\nEnfileirados: {len(queued)} | Cached: {len(cached)} | Falhas: {len(failed)}")
        if failed:
            for f in failed:
                print(f"  {f}")

        # ============================================================
        # FASE 2: Baixar da Área de Download
        # ============================================================
        if queued:
            print(f"\n=== FASE 2: Baixar PDFs ===")
            downloaded = download_from_area(page, queued)
        else:
            downloaded = 0
            if not cached:
                print("Nada a baixar.")

        # ============================================================
        # Resumo
        # ============================================================
        print(f"\n=== RESUMO ===")
        print(f"Baixados: {downloaded}")
        print(f"Cached: {len(cached)}")
        print(f"Falhas: {len(failed)}")

        total_pdfs = len(list(OUTPUT_DIR.glob("*.pdf")))
        total_size = sum(f.stat().st_size for f in OUTPUT_DIR.glob("*.pdf"))
        print(f"Total PDFs: {total_pdfs} ({total_size // (1024*1024)}MB)")

        input("\nPressione Enter para fechar o browser...")
        context.close()


if __name__ == "__main__":
    main()
