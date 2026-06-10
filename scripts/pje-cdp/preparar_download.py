#!/usr/bin/env python3
"""
Preparar audiências — download de autos via CDP (Chromium logado).

Fase A (enfileirar): para cada CNJ, busca na rota Peticionar, captura
idProcesso+ca no popup, abre listProcessoCompletoAdvogado.seam (funciona
para sigilosos VVD), extrai classe/partes, lista processos ASSOCIADOS
(menu > Associados (N)) e enfileira o PDF na Área de Download (Crescente).
Associados entram na fila com profundidade 1.

Fase B (baixar): vai à Área de Download, espera status Sucesso e baixa
cada PDF via expect_download para o staging.

Uso:
  preparar_download.py --staging ~/Desktop/pje-autos-vvd-2026-06-11 \
      --cnjs lista.txt [--fase A|B|AB]

Estado em <staging>/meta.json (resume-safe: pula CNJ já enfileirado/baixado).
"""
import argparse, json, re, sys, time
from pathlib import Path
from patchright.sync_api import sync_playwright, TimeoutError as PwTimeout

PANEL = "https://pje.tjba.jus.br/pje/Painel/painel_usuario/advogado.seam"
VIEWER = "https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam"
AREA = "https://pje.tjba.jus.br/pje/AreaDeDownload/listView.seam"
CNJ_RE = re.compile(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}")


def parse_numero(num):
    p = num.replace("-", ".").split(".")
    return {"seq": p[0], "dig": p[1], "ano": p[2], "org": p[5]}


def log(msg):
    print(msg, flush=True)


def load_meta(staging: Path):
    f = staging / "meta.json"
    if f.exists():
        return json.loads(f.read_text())
    return {"processos": {}}


def save_meta(staging: Path, meta):
    (staging / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2))


def open_peticionar(page):
    page.goto(PANEL, wait_until="domcontentloaded", timeout=60000)
    time.sleep(5)
    page.evaluate("""() => { var c=document.querySelectorAll('td');
        for (var i=0;i<c.length;i++) if (c[i].textContent.trim()==='PETICIONAR'){c[i].click();return;} }""")
    time.sleep(6)
    el = page.query_selector("iframe")
    if not el:
        raise RuntimeError("iframe Peticionar não carregou")
    frame = el.content_frame()
    frame.wait_for_selector('input[id*="numeroSequencial"]', timeout=20000)
    return frame


def get_ca(ctx, page, numero):
    """Busca o CNJ no Peticionar e captura (idProcesso, ca) do popup."""
    frame = open_peticionar(page)
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
    with ctx.expect_page(timeout=30000) as pop_info:
        frame.evaluate("() => document.querySelector('a[title=\"Peticionar\"]').click()")
    popup = pop_info.value
    popup.wait_for_load_state("domcontentloaded", timeout=30000)
    m = re.search(r"idProcesso=(\d+)&ca=([a-f0-9]+)", popup.url)
    popup.close()
    if not m:
        return None, None
    return m.group(1), m.group(2)


def open_menu(pg):
    return pg.evaluate("""() => {
        var els = document.querySelectorAll('a, button, i, span');
        for (var i=0;i<els.length;i++){
            var t=((els[i].getAttribute('aria-label')||'')+' '+(els[i].title||'')+' '+(els[i].innerText||'')).toLowerCase();
            if (t.indexOf('menu')>=0 && t.trim().length<40){ els[i].click(); return true; }
        }
        return false;
    }""")


def get_associados(pg):
    """Abre o menu, lê 'Associados (N)'; se N>0 clica e extrai CNJs."""
    if not open_menu(pg):
        return [], "menu_nao_encontrado"
    time.sleep(2)
    n = pg.evaluate("""() => {
        var els = document.querySelectorAll('a, li, span, div');
        for (var i=0;i<els.length;i++){
            var t=(els[i].innerText||'').trim();
            var m = t.match(/^Associados \\((\\d+)\\)$/);
            if (m) return parseInt(m[1]);
        }
        return -1;
    }""")
    if n <= 0:
        # fechar menu (ESC)
        pg.keyboard.press("Escape")
        return [], ("ok" if n == 0 else "contador_nao_encontrado")
    before = pg.evaluate("() => document.body.innerText")
    pg.evaluate("""() => {
        var els = document.querySelectorAll('a, li, span, div');
        for (var i=0;i<els.length;i++){
            var t=(els[i].innerText||'').trim();
            if (/^Associados \\(\\d+\\)$/.test(t)){ els[i].click(); return; }
        }
    }""")
    time.sleep(5)
    after = pg.evaluate("() => document.body.innerText")
    novas = "\n".join(l for l in after.split("\n") if l not in set(before.split("\n")))
    cnjs = sorted(set(CNJ_RE.findall(novas)) or set(CNJ_RE.findall(after)))
    pg.keyboard.press("Escape")
    return cnjs, "ok"


def queue_download(pg):
    """Abre o diálogo de download, seleciona Crescente e confirma."""
    ok = pg.evaluate("""() => {
        var els = document.querySelectorAll('a, button, i, span');
        for (var i=0;i<els.length;i++){
            var t=((els[i].getAttribute('aria-label')||'')+' '+(els[i].title||'')+' '+(els[i].innerText||'')).toLowerCase();
            if (t.indexOf('download')>=0 && t.trim().length<40){ els[i].click(); return true; }
        }
        return false;
    }""")
    if not ok:
        return "icone_nao_encontrado"
    time.sleep(3)
    # selecionar Crescente (radio ou label)
    pg.evaluate("""() => {
        var labels = document.querySelectorAll('label, span');
        for (var i=0;i<labels.length;i++){
            if ((labels[i].innerText||'').trim()==='Crescente'){ labels[i].click();
                var inp = labels[i].querySelector('input') || document.getElementById(labels[i].getAttribute('for')||'');
                if (inp) inp.click();
                return true; }
        }
        var radios = document.querySelectorAll('input[type=radio]');
        for (var j=0;j<radios.length;j++){
            if (/cresc/i.test(radios[j].value||'')){ radios[j].click(); return true; }
        }
        return false;
    }""")
    time.sleep(1)
    clicked = pg.evaluate("""() => {
        var btns = document.querySelectorAll('button, input[type=button], input[type=submit], a');
        for (var i=0;i<btns.length;i++){
            var r = btns[i].getBoundingClientRect();
            var t = (btns[i].innerText||btns[i].value||'').trim();
            if (r.width>0 && t.toUpperCase()==='DOWNLOAD'){ btns[i].click(); return true; }
        }
        return false;
    }""")
    if not clicked:
        return "botao_nao_encontrado"
    time.sleep(5)
    txt = pg.evaluate("() => document.body.innerText")
    if re.search(r"[áa]rea de download|ser[áa] disponibilizado", txt, re.I):
        return "queued"
    return "queued_sem_confirmacao"


def fase_a(ctx, page, staging: Path, cnjs, meta, depth=0):
    fila = list(cnjs)
    while fila:
        numero = fila.pop(0)
        rec = meta["processos"].get(numero, {})
        if rec.get("queued"):
            log(f"[A] {numero} já enfileirado — skip")
            continue
        log(f"[A] {numero} (depth={rec.get('depth', depth)})")
        try:
            idp, ca = get_ca(ctx, page, numero)
            if not idp:
                rec.update({"erro": "nao_encontrado_peticionar"})
                meta["processos"][numero] = rec
                save_meta(staging, meta)
                continue
            pg = ctx.new_page()
            pg.on("dialog", lambda d: d.accept())
            pg.goto(f"{VIEWER}?id={idp}&ca={ca}", wait_until="domcontentloaded", timeout=60000)
            time.sleep(6)
            header = pg.evaluate("() => document.body.innerText.slice(0, 400)")
            lines = [l.strip() for l in header.split("\n") if l.strip()]
            classe, partes = "", ""
            if lines:
                m = re.match(r"^(\S+)\s+" + re.escape(numero), lines[0])
                classe = m.group(1) if m else lines[0].split(" ")[0]
                if len(lines) > 1 and " X " in lines[1]:
                    partes = lines[1]
            associados, asso_status = get_associados(pg)
            associados = [a for a in associados if a != numero]
            status = queue_download(pg)
            pg.close()
            rec.update({
                "idProcesso": idp, "classe": classe, "partes": partes,
                "associados": associados, "asso_status": asso_status,
                "queued": status.startswith("queued"), "queue_status": status,
                "depth": rec.get("depth", depth),
            })
            meta["processos"][numero] = rec
            save_meta(staging, meta)
            log(f"    classe={classe} partes={partes[:60]} associados={associados} queue={status}")
            if rec["depth"] == 0:
                for a in associados:
                    if a not in meta["processos"]:
                        meta["processos"][a] = {"depth": 1, "pai": numero}
                        fila.append(a)
                save_meta(staging, meta)
        except Exception as e:
            log(f"    ERRO: {str(e)[:150]}")
            rec.update({"erro": str(e)[:200]})
            meta["processos"][numero] = rec
            save_meta(staging, meta)
            try:
                for extra in ctx.pages[1:]:
                    extra.close()
            except Exception:
                pass
        time.sleep(2)


def fase_b(ctx, page, staging: Path, meta, max_rounds=40):
    pendentes = [n for n, r in meta["processos"].items()
                 if r.get("queued") and not r.get("pdf")]
    log(f"[B] {len(pendentes)} PDFs a baixar")
    for rnd in range(1, max_rounds + 1):
        if not pendentes:
            break
        log(f"[B] round {rnd} — {len(pendentes)} pendentes")
        page.goto(AREA, wait_until="domcontentloaded", timeout=60000)
        time.sleep(10)
        ifr = None
        for f in page.frames:
            if "AreaDeDownload" in f.url or f != page.main_frame:
                ifr = f
        if ifr is None:
            ifr = page.main_frame
        rows = ifr.evaluate("""() => {
            var out=[];
            document.querySelectorAll('tr').forEach(function(tr, idx){
                var t = tr.innerText||'';
                var m = t.match(/\\d{7}-\\d{2}\\.\\d{4}\\.\\d\\.\\d{2}\\.\\d{4}/);
                if (m) out.push({idx: idx, numero: m[0], txt: t.replace(/\\s+/g,' ').slice(0,200),
                                 temBtn: !!tr.querySelector('button, a[href*="download"], a[onclick]')});
            });
            return out;
        }""")
        by_num = {}
        for r in rows:
            by_num.setdefault(r["numero"], []).append(r)
        for numero in list(pendentes):
            cand = by_num.get(numero, [])
            alvo = None
            for c in cand:
                if "Sucesso" in c["txt"] and c["temBtn"]:
                    alvo = c
                    break
            if not alvo:
                continue
            try:
                handles = ifr.query_selector_all("tr")
                tr = handles[alvo["idx"]]
                btn = tr.query_selector("button") or tr.query_selector("a[onclick]")
                if not btn:
                    continue
                pdf_path = staging / f"autos-{numero}.pdf"
                with page.expect_download(timeout=60000) as dl_info:
                    btn.click()
                dl = dl_info.value
                dl.save_as(str(pdf_path))
                size = pdf_path.stat().st_size
                meta["processos"][numero]["pdf"] = str(pdf_path)
                meta["processos"][numero]["pdf_size"] = size
                save_meta(staging, meta)
                pendentes.remove(numero)
                log(f"    {numero} OK ({size//1024}KB)")
                time.sleep(3)
                page.goto(AREA, wait_until="domcontentloaded", timeout=60000)
                time.sleep(8)
                ifr = None
                for f in page.frames:
                    if "AreaDeDownload" in f.url or f != page.main_frame:
                        ifr = f
                if ifr is None:
                    ifr = page.main_frame
            except Exception as e:
                log(f"    {numero} erro download: {str(e)[:120]}")
        if pendentes:
            log(f"    aguardando geração ({len(pendentes)} restam)...")
            time.sleep(30)
    return pendentes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--staging", required=True)
    ap.add_argument("--cnjs", help="arquivo com CNJs, um por linha")
    ap.add_argument("--fase", default="AB", choices=["A", "B", "AB"])
    args = ap.parse_args()

    staging = Path(args.staging).expanduser()
    staging.mkdir(parents=True, exist_ok=True)
    meta = load_meta(staging)

    cnjs = []
    if args.cnjs:
        cnjs = [l.strip() for l in open(args.cnjs) if l.strip() and not l.startswith("#")]

    with sync_playwright() as pw:
        browser = pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
        ctx = browser.contexts[0]
        page = ctx.pages[0]
        page.on("dialog", lambda d: d.accept())

        if "A" in args.fase:
            fase_a(ctx, page, staging, cnjs, meta)
        if "B" in args.fase:
            falta = fase_b(ctx, page, staging, meta)
            if falta:
                log(f"[B] NÃO baixados: {falta}")

    ok = sum(1 for r in meta["processos"].values() if r.get("pdf"))
    log(f"=== fim: {ok}/{len(meta['processos'])} PDFs no staging ===")


if __name__ == "__main__":
    main()
