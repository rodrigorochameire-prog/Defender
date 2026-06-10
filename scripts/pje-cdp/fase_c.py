#!/usr/bin/env python3
"""
Fase C — download direto: busca Peticionar → ca → viewer → diálogo de download
(Crescente) → DOWNLOAD → captura a NOVA ABA S3 → baixa via curl → fecha abas.

Uso: fase_c.py --staging DIR --cnjs lista.txt
"""
import argparse, json, re, subprocess, time
from pathlib import Path
from patchright.sync_api import sync_playwright

PANEL = "https://pje.tjba.jus.br/pje/Painel/painel_usuario/advogado.seam"
VIEWER = "https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam"


def parse_numero(num):
    p = num.replace("-", ".").split(".")
    return {"seq": p[0], "dig": p[1], "ano": p[2], "org": p[5]}


def log(m): print(m, flush=True)


def get_ca(ctx, page, numero):
    page.goto(PANEL, wait_until="domcontentloaded", timeout=90000)
    time.sleep(5)
    page.evaluate("""() => { var c=document.querySelectorAll('td');
        for (var i=0;i<c.length;i++) if (c[i].textContent.trim()==='PETICIONAR'){c[i].click();return;} }""")
    time.sleep(6)
    el = page.query_selector("iframe")
    frame = el.content_frame()
    frame.wait_for_selector('input[id*="numeroSequencial"]', timeout=20000)
    parts = parse_numero(numero)
    frame.evaluate("""(p) => {
        document.querySelector('input[id*="numeroSequencial"]').value = p.seq;
        document.querySelector('input[id*="Verificador"]').value = p.dig;
        document.querySelector('input[id*="Ano"]').value = p.ano;
        document.querySelector('input[id*="OrgaoJustica"]').value = p.org;
    }""", parts)
    frame.click('input[id*="searchProcessos"]')
    time.sleep(8)
    if not frame.evaluate("() => !!document.querySelector('a[title=\"Peticionar\"]')"):
        return None, None
    with ctx.expect_page(timeout=30000) as pop:
        frame.evaluate("() => document.querySelector('a[title=\"Peticionar\"]').click()")
    popup = pop.value
    popup.wait_for_load_state("domcontentloaded", timeout=30000)
    m = re.search(r"idProcesso=(\d+)&ca=([a-f0-9]+)", popup.url)
    popup.close()
    return (m.group(1), m.group(2)) if m else (None, None)


def baixar(ctx, page, numero, staging):
    idp, ca = get_ca(ctx, page, numero)
    if not idp:
        return None, "nao_encontrado"
    pg = ctx.new_page()
    pg.on("dialog", lambda d: d.accept())
    pg.goto(f"{VIEWER}?id={idp}&ca={ca}", wait_until="domcontentloaded", timeout=90000)
    time.sleep(6)
    pg.evaluate("""() => {
        var els = document.querySelectorAll('a, button, i, span');
        for (var i=0;i<els.length;i++){
            var t=((els[i].getAttribute('aria-label')||'')+' '+(els[i].title||'')+' '+(els[i].innerText||'')).toLowerCase();
            if (t.indexOf('download')>=0 && t.trim().length<40){ els[i].click(); return; }
        }
    }""")
    time.sleep(3)
    pg.evaluate("""() => {
        var labels = document.querySelectorAll('label, span');
        for (var i=0;i<labels.length;i++)
            if ((labels[i].innerText||'').trim()==='Crescente'){ labels[i].click(); break; }
    }""")
    time.sleep(1)
    try:
        with ctx.expect_page(timeout=120000) as s3pop:
            pg.evaluate("""() => {
                var btns = document.querySelectorAll('button, input, a');
                for (var i=0;i<btns.length;i++){
                    var r = btns[i].getBoundingClientRect();
                    var t = (btns[i].innerText||btns[i].value||'').trim();
                    if (r.width>0 && t.toUpperCase()==='DOWNLOAD'){ btns[i].click(); return; }
                }
            }""")
        s3 = s3pop.value
        # esperar URL S3 resolver
        for _ in range(60):
            if "amazonaws.com" in s3.url:
                break
            time.sleep(2)
        url = s3.url
        s3.close()
    except Exception as e:
        pg.close()
        return None, f"sem_aba_s3: {str(e)[:80]}"
    pg.close()
    if "amazonaws.com" not in url:
        return None, f"url_inesperada: {url[:80]}"
    dst = staging / f"autos-{numero}.pdf"
    subprocess.run(["curl", "-s", "-o", str(dst), url], check=True, timeout=600)
    if dst.exists() and dst.stat().st_size > 5000:
        return dst, "ok"
    return None, "pdf_vazio"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--staging", required=True)
    ap.add_argument("--cnjs", required=True)
    args = ap.parse_args()
    staging = Path(args.staging).expanduser()
    metaf = staging / "meta.json"
    meta = json.loads(metaf.read_text())
    cnjs = [l.strip() for l in open(args.cnjs) if l.strip()]

    with sync_playwright() as pw:
        browser = pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
        ctx = browser.contexts[0]
        page = ctx.pages[0]
        page.on("dialog", lambda d: d.accept())
        for numero in cnjs:
            rec = meta["processos"].setdefault(numero, {})
            if rec.get("pdf") and Path(rec["pdf"]).exists():
                log(f"[C] {numero} já tem pdf — skip")
                continue
            log(f"[C] {numero}")
            try:
                pdf, status = baixar(ctx, page, numero, staging)
                if pdf:
                    rec["pdf"] = str(pdf); rec["pdf_size"] = pdf.stat().st_size
                    log(f"    OK ({pdf.stat().st_size//1024}KB)")
                else:
                    rec["erro_download"] = status
                    log(f"    FALHA: {status}")
            except Exception as e:
                rec["erro_download"] = str(e)[:150]
                log(f"    ERRO: {str(e)[:120]}")
                for extra in ctx.pages[1:]:
                    try: extra.close()
                    except Exception: pass
            metaf.write_text(json.dumps(meta, ensure_ascii=False, indent=2))
            time.sleep(2)
    ok = sum(1 for v in meta["processos"].values() if v.get("pdf"))
    log(f"=== fase C fim: {ok} PDFs ===")


if __name__ == "__main__":
    main()
