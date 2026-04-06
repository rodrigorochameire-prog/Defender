#!/usr/bin/env python3
"""
scan_worker.py — Standalone worker daemon for PJe intimacoes scanning.

Polls scan_intimacoes_jobs table for pending jobs, navigates PJe via Chrome CDP,
extracts process data, analyzes with Gemini Flash, and updates results.

Usage:
    pip install supabase playwright google-generativeai python-dotenv
    python scripts/scan_worker.py
    python scripts/scan_worker.py --daemon &
"""

import asyncio
import json
import os
import re
import shutil
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------

ENV_FILE = Path(__file__).resolve().parent.parent / "enrichment-engine" / ".env"

if ENV_FILE.exists():
    load_dotenv(ENV_FILE)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("[FATAL] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
    sys.exit(1)

if not GEMINI_API_KEY:
    print("[FATAL] GEMINI_API_KEY must be set.")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Supabase client
# ---------------------------------------------------------------------------

from supabase import create_client, Client

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ---------------------------------------------------------------------------
# Gemini
# ---------------------------------------------------------------------------

import google.generativeai as genai

genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel("models/gemini-2.5-flash")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CDP_ENDPOINT = "http://127.0.0.1:9222"

PASTA_MAP = {
    "Violência Doméstica": "Processos - VVD (Criminal)",
    "Júri": "Processos - Júri",
    "Execução Penal": "Processos - Execução Penal",
    "Criminal": "Processos - Criminal",
}

PJE_SEARCH_URL = "https://pje.tjba.jus.br/pje/ConsultaProcesso/listView.seam"

POLL_INTERVAL = 5  # seconds

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean_processo(numero: str) -> str:
    """Keep digits, dashes and dots (PJe format: 8007645-94.2026.8.05.0039)."""
    return re.sub(r"[^\d\-\.]", "", numero)


def update_job(job_id: int, **fields):
    """Update a scan job row in Supabase."""
    supabase.table("scan_intimacoes_jobs").update(fields).eq("id", job_id).execute()


# ---------------------------------------------------------------------------
# Extraction JS — runs inside the PJe page
# ---------------------------------------------------------------------------

EXTRACT_JS = """
() => {
    const events = document.querySelectorAll(
        '[id$="divEventosTimeLine"] .media, .movimentacao-item, .timeline-item'
    );
    const textos = [];
    events.forEach(ev => {
        const texto = ev.querySelector('.texto-movimento, .conteudo, .descricao');
        const data = ev.querySelector('.data, span[class*="data"]');
        if (texto) {
            textos.push({
                data: data?.textContent?.trim() || '',
                texto: texto.textContent?.trim() || '',
            });
        }
    });

    const keywords = ['defensoria', 'defensor', 'intimação', 'intimado', 'prazo', 'audiência'];
    const relevant = textos.filter(t =>
        keywords.some(k => t.texto.toLowerCase().includes(k))
    );

    const classe = document.querySelector('dd, [id*="classe"]')?.textContent?.trim() || '';
    const assunto = document.querySelector('[id*="assunto"] dd, dd:nth-child(4)')?.textContent?.trim() || '';

    return {
        movimentacoes: textos.slice(0, 10),
        relevantes: relevant.slice(0, 5),
        classe,
        assunto,
        fullText: textos.map(t => `${t.data}: ${t.texto}`).join('\\n').slice(0, 5000),
    };
}
"""

# ---------------------------------------------------------------------------
# Core: process a single job
# ---------------------------------------------------------------------------

async def process_job(job: dict):
    job_id = job["id"]
    numero = job["numero_processo"]
    print(f"[JOB {job_id}] Processing {numero} ...")

    # 1. Mark running
    update_job(job_id, status="running", started_at=now_iso())

    page = None
    try:
        from playwright.async_api import async_playwright

        async with async_playwright() as pw:
            # 2. Connect to existing Chrome — use the tab that already has PJe open
            browser = await pw.chromium.connect_over_cdp(CDP_ENDPOINT)
            context = browser.contexts[0]

            # Find the PJe Painel tab (already open and logged in)
            painel_page = None
            for p in context.pages:
                if "pje" in p.url.lower() and "painel" in p.url.lower():
                    painel_page = p
                    break

            if not painel_page:
                # Fallback: use first PJe tab
                for p in context.pages:
                    if "pje" in p.url.lower():
                        painel_page = p
                        break

            if not painel_page:
                raise Exception("PJe tab not found. Open PJe Painel do Defensor first.")

            numero_clean = clean_processo(numero)
            print(f"[JOB {job_id}] Using PJe tab: {painel_page.url[:80]}")

            # 3. Find the process link in Expedientes
            # PJe links have class 'numero-processo-expediente' and use window.open() onclick
            # Extract the authenticated URL from onclick and open in new tab
            process_url = await painel_page.evaluate(f"""() => {{
                const links = document.querySelectorAll('a.numero-processo-expediente');
                for (const a of links) {{
                    if (a.textContent.includes('{numero_clean}')) {{
                        const onclick = a.getAttribute('onclick') || '';
                        const match = onclick.match(/window\\.open\\('([^']+)'/);
                        if (match) return match[1];
                    }}
                }}
                return null;
            }}""")

            if not process_url:
                raise Exception(f"Process {numero_clean} not found in PJe Expedientes")

            # Open in new tab using the authenticated URL
            full_url = f"https://pje.tjba.jus.br{process_url}" if process_url.startswith("/") else process_url
            print(f"[JOB {job_id}] Opening process in new tab ...")
            page = await context.new_page()
            await page.goto(full_url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(5000)  # JSF render

            # 5. Extract content
            print(f"[JOB {job_id}] Extracting content ...")
            extracted = await page.evaluate(EXTRACT_JS)

            if not extracted.get("fullText"):
                print(f"[JOB {job_id}] Warning: no movements extracted, trying full page text")
                extracted["fullText"] = (await page.inner_text("body"))[:5000]

            # 6. Analyze with Gemini
            print(f"[JOB {job_id}] Analyzing with Gemini ...")
            prompt = f"""Analise o conteudo deste processo judicial e a ultima intimacao a Defensoria Publica.

Processo: {numero}
Classe: {extracted.get('classe', '')}
Assunto: {extracted.get('assunto', '')}

Movimentacoes relevantes:
{extracted.get('fullText', '')}

Responda APENAS com JSON valido (sem markdown):
{{
  "ato": "nome do ato processual que a Defensoria deve praticar (ex: Resposta a Acusacao, Alegacoes Finais, Contrarrazoes, Ciencia designacao de audiencia, Manifestacao sobre laudo, etc.)",
  "confianca": "high ou medium",
  "providencias": "resumo de 2-3 frases: o que a DPE foi intimada para fazer + contexto do processo",
  "audiencia_data": "DD/MM/YYYY se houver audiencia designada, null caso contrario",
  "audiencia_hora": "HH:MM se houver, null caso contrario",
  "audiencia_tipo": "tipo da audiencia (AIJ, Justificacao, Instrucao, etc.) ou null"
}}"""

            response = gemini_model.generate_content(prompt)
            raw_text = response.text.strip()

            # Strip possible markdown fences
            if raw_text.startswith("```"):
                raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
                raw_text = re.sub(r"\s*```$", "", raw_text)

            result = json.loads(raw_text)

            # 7. Download PDF (best effort)
            pdf_path = None
            try:
                dl_btn = None
                for sel in [
                    "a[id*='download']",
                    "button[id*='download']",
                    "a[title*='Download']",
                ]:
                    dl_btn = await page.query_selector(sel)
                    if dl_btn:
                        break

                if dl_btn and job.get("drive_base_path"):
                    async with page.expect_download(timeout=30000) as dl_info:
                        await dl_btn.click()
                    download = await dl_info.value
                    tmp_path = await download.path()

                    atribuicao = job.get("atribuicao", "Criminal")
                    pasta = PASTA_MAP.get(atribuicao, "Processos - Criminal")
                    dest_dir = Path(job["drive_base_path"]) / pasta / job["assistido_nome"]
                    dest_dir.mkdir(parents=True, exist_ok=True)

                    dest_file = dest_dir / f"{numero_clean}-processo.pdf"
                    shutil.copy2(str(tmp_path), str(dest_file))
                    pdf_path = str(dest_file)
                    print(f"[JOB {job_id}] PDF saved: {pdf_path}")
            except Exception as pdf_err:
                print(f"[JOB {job_id}] PDF download skipped: {pdf_err}")

            # 8. Update job as completed
            update_job(
                job_id,
                status="completed",
                completed_at=now_iso(),
                ato_sugerido=result.get("ato", "")[:100],
                ato_confianca=result.get("confianca", "medium")[:10],
                providencias=result.get("providencias", ""),
                audiencia_data=result.get("audiencia_data") or None,
                audiencia_hora=result.get("audiencia_hora") or None,
                audiencia_tipo=result.get("audiencia_tipo") or None,
                conteudo_resumo=extracted.get("fullText", "")[:5000],
                pdf_path=pdf_path,
            )
            print(f"[JOB {job_id}] Completed: ato={result.get('ato')}, confianca={result.get('confianca')}")

    except Exception as exc:
        err_msg = f"{exc}\n{traceback.format_exc()}"[:2000]
        print(f"[JOB {job_id}] FAILED: {exc}")
        update_job(job_id, status="failed", completed_at=now_iso(), error=err_msg)

    finally:
        # Close the process detail tab (but NOT the Painel tab)
        if page:
            try:
                await page.close()
            except Exception:
                pass


# ---------------------------------------------------------------------------
# Poll loop
# ---------------------------------------------------------------------------

def poll_and_process():
    """Fetch one pending job and process it."""
    jobs = (
        supabase.table("scan_intimacoes_jobs")
        .select("*")
        .eq("status", "pending")
        .order("created_at")
        .limit(1)
        .execute()
    )

    if not jobs.data:
        return False

    job = jobs.data[0]
    asyncio.run(process_job(job))
    return True


def main():
    daemon = "--daemon" in sys.argv
    print(f"[scan_worker] Started {'(daemon)' if daemon else '(foreground)'}")
    print(f"[scan_worker] Supabase: {SUPABASE_URL}")
    print(f"[scan_worker] CDP: {CDP_ENDPOINT}")
    print(f"[scan_worker] Polling every {POLL_INTERVAL}s ...")

    while True:
        try:
            had_work = poll_and_process()
            if not had_work:
                time.sleep(POLL_INTERVAL)
        except KeyboardInterrupt:
            print("\n[scan_worker] Stopped by user.")
            break
        except Exception as loop_err:
            print(f"[scan_worker] Loop error: {loop_err}")
            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
