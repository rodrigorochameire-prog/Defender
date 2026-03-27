#!/usr/bin/env python3
"""
PJe TJBA - Baixar PDFs da Área de Download via Playwright

Técnicas aplicadas (pesquisa comunidade 2025-2026):
- CDP Page.javascriptDialogOpening: aceita confirm() de todos os frames
- CDP Target.setAutoAttach: controla iframes cross-origin
- Route interception: força Content-Disposition:attachment em PDFs
- Resource blocking: bloqueia imagens/CSS/fonts (6.5x mais rápido)
- domcontentloaded: evita travamento em JSF com AJAX polling
- expect_download como estratégia primária (100% taxa sucesso)
- Retry com backoff para operações frágeis
- Page reload entre downloads (essencial para estado do iframe)
- Anti-detection: webdriver flag removal, Chrome runtime mock
"""
import os, sys, time, subprocess
from pathlib import Path
from functools import wraps
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout

# ============================================================================
# Config
# ============================================================================
load_dotenv(Path.home() / "Projetos/Defender/.env.local")
CPF = os.environ.get("PJE_CPF", "")
SENHA = os.environ.get("PJE_SENHA", "")
OUTPUT_DIR = Path.home() / "Desktop/pje-autos-juri"
BASE = "https://pje.tjba.jus.br/pje"
PROFILE_DIR = str(Path.home() / ".pje-playwright-profile")

# Recursos a bloquear (performance)
BLOCKED_PATTERNS = [
    "**/*.png", "**/*.jpg", "**/*.jpeg", "**/*.gif", "**/*.svg",
    "**/*.woff", "**/*.woff2", "**/*.ttf",
    "**/google-analytics*", "**/facebook*", "**/doubleclick*",
]

OUTPUT_DIR.mkdir(exist_ok=True)


# ============================================================================
# Retry decorator (inspirado no tenacity, sem dependência extra)
# ============================================================================
def retry(max_attempts=3, backoff_base=2, exceptions=(Exception,)):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts:
                        raise
                    wait = backoff_base ** attempt
                    print(f"  [retry] {func.__name__} attempt {attempt} failed: {e}. Wait {wait}s...")
                    time.sleep(wait)
        return wrapper
    return decorator


# ============================================================================
# Browser setup
# ============================================================================
def setup_browser(playwright):
    """Launch persistent context with all optimizations."""
    context = playwright.chromium.launch_persistent_context(
        PROFILE_DIR,
        headless=False,
        accept_downloads=True,
        viewport={"width": 1366, "height": 768},
        locale="pt-BR",
        timezone_id="America/Bahia",
        args=[
            "--disable-blink-features=AutomationControlled",
            "--no-first-run",
        ],
    )

    page = context.pages[0] if context.pages else context.new_page()

    # --- Anti-detection init script ---
    context.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });
        window.chrome = { runtime: {} };
        window.confirm = () => true;
        window.alert = () => true;
    """)

    # --- Dialog handling (Playwright level) ---
    page.on("dialog", lambda d: d.accept())

    # --- Dialog handling (CDP level — covers ALL frames including cross-origin) ---
    try:
        cdp = context.new_cdp_session(page)
        cdp.send("Page.enable")
        cdp.on("Page.javascriptDialogOpening",
               lambda _: cdp.send("Page.handleJavaScriptDialog", {"accept": True}))

        # Auto-attach to all child targets (iframes, workers)
        cdp.send("Target.setAutoAttach", {
            "autoAttach": True,
            "waitForDebuggerOnStart": False,
            "flatten": True,
        })
    except Exception as e:
        print(f"  [CDP] Warning: {e}")

    # --- New tab handler ---
    def on_new_page(new_page):
        new_page.on("dialog", lambda d: d.accept())
    context.on("page", on_new_page)

    # --- Resource blocking (performance: ~6.5x faster page loads) ---
    for pattern in BLOCKED_PATTERNS:
        context.route(pattern, lambda route: route.abort())

    # --- Force PDF download instead of Chrome viewer ---
    def force_pdf_download(route):
        try:
            response = route.fetch()
            headers = dict(response.headers)
            content_type = headers.get("content-type", "")
            if "pdf" in content_type or route.request.url.endswith(".pdf"):
                headers["content-disposition"] = "attachment"
            route.fulfill(response=response, headers=headers)
        except Exception:
            route.continue_()

    context.route("**/*.pdf", force_pdf_download)
    context.route("**/downloadBinario*", force_pdf_download)

    return context, page


# ============================================================================
# Login
# ============================================================================
@retry(max_attempts=2, exceptions=(PwTimeout, Exception))
def do_login(page):
    page.goto(f"{BASE}/login.seam", wait_until="domcontentloaded", timeout=30000)
    time.sleep(3)

    if "Painel" in page.title() or "advogado" in page.url:
        print("[LOGIN] Já logado")
        return True

    page.fill('#username, input[name="username"]', CPF, timeout=5000)
    page.fill('#password, input[name="password"]', SENHA, timeout=5000)
    for sel in ['#kc-login', 'input[type="submit"]', 'button:has-text("Entrar")']:
        try:
            page.click(sel, timeout=3000)
            break
        except:
            pass
    page.wait_for_url("**/advogado**", timeout=25000)
    print("[LOGIN] OK")
    return True


# ============================================================================
# Iframe helpers
# ============================================================================
def find_iframe(page, max_wait=15):
    """Find the Área de Download iframe with retry."""
    for _ in range(max_wait // 3):
        for f in page.frames:
            if f != page.main_frame and ("area-download" in f.url or "pje-frontend" in f.url):
                return f
        # Fallback: any non-main frame
        for f in page.frames:
            if f != page.main_frame:
                return f
        time.sleep(3)
    return None


def find_button_for_process(iframe, num):
    """Find the download button for a specific process in the iframe table."""
    rows = iframe.query_selector_all("tr")
    for row in rows:
        cells = row.query_selector_all("td")
        if len(cells) >= 4 and num in cells[0].inner_text():
            return row.query_selector("button:not([disabled])")
    return None


def read_area_status(iframe):
    """Read status of all processes in the Área de Download."""
    procs = []
    rows = iframe.query_selector_all("tr")
    for row in rows:
        cells = row.query_selector_all("td")
        if len(cells) >= 4:
            num = cells[0].inner_text().strip()
            status = cells[3].inner_text().strip()
            if num and num[0].isdigit():
                procs.append({"num": num, "status": status})
    return procs


# ============================================================================
# Download strategies (cascading)
# ============================================================================
def download_pdf(page, btn, pdf_path):
    """
    Try multiple strategies to download the PDF.
    Returns True if successful.
    """
    # Strategy 1: expect_download (most reliable — proven 100% for PJe)
    try:
        with page.expect_download(timeout=30000) as dl_info:
            btn.click()
            time.sleep(2)
        dl = dl_info.value
        dl.save_as(str(pdf_path))
        size = pdf_path.stat().st_size
        if size > 10000:
            print(f"OK ({size // 1024}KB)")
            _close_extra_tabs(page)
            return True
        pdf_path.unlink(missing_ok=True)
    except Exception:
        pass

    # Strategy 2: new tab with S3 URL
    if len(page.context.pages) > 1:
        new_page = page.context.pages[-1]
        time.sleep(5)
        new_url = new_page.url
        if "amazonaws" in new_url or "s3." in new_url:
            print(f"(S3 tab) ", end="", flush=True)
            size = _curl_download(new_url, pdf_path)
            new_page.close()
            if size > 10000:
                print(f"OK ({size // 1024}KB)")
                return True
            pdf_path.unlink(missing_ok=True)
        else:
            # Try expect_download from new page
            try:
                with new_page.expect_download(timeout=10000) as dl_info:
                    pass
                dl = dl_info.value
                dl.save_as(str(pdf_path))
                size = pdf_path.stat().st_size
                new_page.close()
                if size > 10000:
                    print(f"OK via tab dl ({size // 1024}KB)")
                    return True
                pdf_path.unlink(missing_ok=True)
            except:
                pass
            new_page.close()

    # Strategy 3: main page redirected to S3
    url = page.url
    if "amazonaws" in url or "s3." in url:
        print(f"(S3 redirect) ", end="", flush=True)
        size = _curl_download(url, pdf_path)
        if size > 10000:
            print(f"OK ({size // 1024}KB)")
            return True
        pdf_path.unlink(missing_ok=True)

    print("FAIL")
    return False


def _curl_download(url, path, timeout=300):
    subprocess.run(["curl", "-sL", url, "-o", str(path), "--max-time", str(timeout)],
                   capture_output=True)
    return path.stat().st_size if path.exists() else 0


def _close_extra_tabs(page):
    while len(page.context.pages) > 1:
        page.context.pages[-1].close()


# ============================================================================
# Main download loop
# ============================================================================
def download_all(page):
    """Download all PDFs from Área de Download."""

    # Initial load — use domcontentloaded (faster, avoids JSF AJAX polling hang)
    page.goto(f"{BASE}/AreaDeDownload/listView.seam",
              wait_until="domcontentloaded", timeout=20000)
    time.sleep(8)

    iframe = find_iframe(page)
    if not iframe:
        print("[AREA] Nenhum iframe encontrado!")
        return 0

    print(f"[AREA] Iframe: {iframe.url[:60]}")

    # Read status
    procs = read_area_status(iframe)
    print(f"[AREA] {len(procs)} processos encontrados")

    # Classify
    to_download = []
    cached_count = 0
    for p in procs:
        pdf = OUTPUT_DIR / f"autos-{p['num']}.pdf"
        if pdf.exists() and pdf.stat().st_size > 10000:
            print(f"  {p['num']}: CACHED ({pdf.stat().st_size // 1024}KB)")
            cached_count += 1
        elif p["status"] == "Sucesso":
            to_download.append(p["num"])
        else:
            print(f"  {p['num']}: {p['status']} (skip)")

    print(f"\n[AREA] {len(to_download)} processos a baixar\n")

    downloaded = 0

    # Download one at a time, reloading page between each
    for i, num in enumerate(to_download):
        pdf_path = OUTPUT_DIR / f"autos-{num}.pdf"
        if pdf_path.exists() and pdf_path.stat().st_size > 10000:
            downloaded += 1
            continue

        print(f"  [{i+1}/{len(to_download)}] {num}: ", end="", flush=True)

        # RELOAD fresh each time (essential — iframe state goes stale)
        page.goto(f"{BASE}/AreaDeDownload/listView.seam",
                  wait_until="domcontentloaded", timeout=20000)
        time.sleep(6)

        # Re-find iframe
        iframe = find_iframe(page, max_wait=12)
        if not iframe:
            print("no iframe")
            continue

        # Find button with retry
        btn = None
        for attempt in range(3):
            btn = find_button_for_process(iframe, num)
            if btn:
                break
            time.sleep(3)

        if not btn:
            print("no button")
            continue

        # Download
        if download_pdf(page, btn, pdf_path):
            downloaded += 1

    return downloaded + cached_count


# ============================================================================
# Entry point
# ============================================================================
def main():
    with sync_playwright() as p:
        context, page = setup_browser(p)

        try:
            do_login(page)
        except Exception as e:
            print(f"Login falhou: {e}")
            context.close()
            sys.exit(1)

        downloaded = download_all(page)

        total_pdfs = len(list(OUTPUT_DIR.glob("*.pdf")))
        total_size = sum(f.stat().st_size for f in OUTPUT_DIR.glob("*.pdf"))
        print(f"\n=== RESUMO ===")
        print(f"Baixados nesta sessão: {downloaded}")
        print(f"Total PDFs: {total_pdfs} ({total_size // (1024*1024)}MB)")

        context.close()


if __name__ == "__main__":
    main()
