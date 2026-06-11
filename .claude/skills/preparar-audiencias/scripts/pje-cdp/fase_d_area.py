#!/usr/bin/env python3
"""
Fase D — baixa PDFs prontos da Área de Download (iframe pje-frontend-1g).
Para cada CNJ pedido: encontra a ÚLTIMA linha com Situação=Sucesso, clica o botão,
captura nova aba S3 (ou download direto) e salva via curl.

Uso: fase_d_area.py --staging DIR --cnjs lista.txt
"""
import argparse, json, re, subprocess, time
from pathlib import Path
from patchright.sync_api import sync_playwright

AREA = "https://pje.tjba.jus.br/pje/AreaDeDownload/listView.seam"


def log(m): print(m, flush=True)


def area_frame(pg, max_wait=60):
    """Localiza o iframe da área pelo CONTEÚDO (URL pode vir vazia em OOPIF)."""
    deadline = time.time() + max_wait
    while time.time() < deadline:
        for f in pg.frames:
            try:
                if f.evaluate("() => document.body && document.body.innerText.indexOf('Situação') >= 0 && document.body.innerText.indexOf('Expiração') >= 0"):
                    return f
            except Exception:
                continue
        time.sleep(3)
    return None


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
        pendentes = [n for n in cnjs
                     if not (meta["processos"].get(n, {}).get("pdf")
                             and Path(meta["processos"][n]["pdf"]).exists())]
        for rodada in range(1, 12):
            if not pendentes:
                break
            log(f"[D] rodada {rodada} — pendentes: {len(pendentes)}")
            pg = ctx.new_page()
            pg.on("dialog", lambda d: d.accept())
            pg.goto(AREA, wait_until="domcontentloaded", timeout=90000)
            time.sleep(12)
            fr = area_frame(pg)
            if not fr:
                log("    iframe da área não carregou")
                pg.close(); time.sleep(15); continue
            for numero in list(pendentes):
                try:
                    # achar índice da ÚLTIMA linha Sucesso desse CNJ
                    idx = fr.evaluate("""(num) => {
                        var rows = document.querySelectorAll('tr');
                        var best = -1;
                        for (var i=0;i<rows.length;i++){
                            var t = rows[i].innerText || '';
                            if (t.indexOf(num)>=0 && t.indexOf('Sucesso')>=0 && rows[i].querySelector('button')) best = i;
                        }
                        return best;
                    }""", numero)
                    if idx < 0:
                        log(f"    {numero}: ainda sem linha Sucesso")
                        continue
                    handles = fr.query_selector_all("tr")
                    btn = handles[idx].query_selector("button")
                    url = None
                    try:
                        with ctx.expect_page(timeout=30000) as s3pop:
                            btn.click()
                        s3 = s3pop.value
                        for _ in range(30):
                            if "amazonaws.com" in s3.url:
                                break
                            time.sleep(1)
                        url = s3.url
                        s3.close()
                    except Exception:
                        try:
                            with pg.expect_download(timeout=20000) as dl:
                                btn.click()
                            d = dl.value
                            dst = staging / f"autos-{numero}.pdf"
                            d.save_as(str(dst))
                            url = "direct"
                        except Exception as e2:
                            log(f"    {numero}: sem aba nem download ({str(e2)[:60]})")
                            continue
                    if url and url != "direct" and "amazonaws.com" in url:
                        dst = staging / f"autos-{numero}.pdf"
                        subprocess.run(["curl", "-s", "-o", str(dst), url], check=True, timeout=600)
                    dst = staging / f"autos-{numero}.pdf"
                    if dst.exists() and dst.stat().st_size > 5000:
                        rec = meta["processos"].setdefault(numero, {})
                        rec["pdf"] = str(dst); rec["pdf_size"] = dst.stat().st_size
                        rec.pop("erro_download", None)
                        metaf.write_text(json.dumps(meta, ensure_ascii=False, indent=2))
                        pendentes.remove(numero)
                        log(f"    {numero} OK ({dst.stat().st_size//1024}KB)")
                except Exception as e:
                    log(f"    {numero} erro: {str(e)[:100]}")
            pg.close()
            if pendentes:
                log(f"    aguardando 30s ({pendentes})")
                time.sleep(30)
    log(f"=== fase D fim — faltam: {pendentes} ===")


if __name__ == "__main__":
    main()
