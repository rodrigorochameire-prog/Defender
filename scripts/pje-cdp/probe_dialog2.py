#!/usr/bin/env python3
"""Sonda completa do diálogo de download: lista TODOS os controles visíveis após abrir."""
import sys, time, json, re
from patchright.sync_api import sync_playwright

NUMERO = sys.argv[1] if len(sys.argv) > 1 else "8006888-03.2026.8.05.0039"
PANEL = "https://pje.tjba.jus.br/pje/Painel/painel_usuario/advogado.seam"

def parse_numero(num):
    p = num.replace("-", ".").split(".")
    return {"seq": p[0], "dig": p[1], "ano": p[2], "org": p[5]}

with sync_playwright() as pw:
    browser = pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
    ctx = browser.contexts[0]
    page = ctx.pages[0]
    page.on("dialog", lambda d: d.accept())
    page.goto(PANEL, wait_until="domcontentloaded", timeout=60000)
    time.sleep(5)
    page.evaluate("""() => { var c=document.querySelectorAll('td');
        for (var i=0;i<c.length;i++) if (c[i].textContent.trim()==='PETICIONAR'){c[i].click();return;} }""")
    time.sleep(6)
    frame = page.query_selector("iframe").content_frame()
    frame.wait_for_selector('input[id*="numeroSequencial"]', timeout=20000)
    parts = parse_numero(NUMERO)
    frame.evaluate("""(p) => {
        document.querySelector('input[id*="numeroSequencial"]').value = p.seq;
        document.querySelector('input[id*="Verificador"]').value = p.dig;
        document.querySelector('input[id*="Ano"]').value = p.ano;
        document.querySelector('input[id*="OrgaoJustica"]').value = p.org;
    }""", parts)
    frame.click('input[id*="searchProcessos"]')
    time.sleep(8)
    with ctx.expect_page(timeout=30000) as pop_info:
        frame.evaluate("() => document.querySelector('a[title=\"Peticionar\"]').click()")
    popup = pop_info.value
    popup.wait_for_load_state("domcontentloaded", timeout=30000)
    m = re.search(r"idProcesso=(\d+)&ca=([a-f0-9]+)", popup.url)
    idp, ca = m.group(1), m.group(2)
    popup.close()
    pg = ctx.new_page()
    pg.on("dialog", lambda d: d.accept())
    pg.goto(f"https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id={idp}&ca={ca}",
            wait_until="domcontentloaded", timeout=60000)
    time.sleep(6)
    print("FRAMES viewer:", [f.url[:90] for f in pg.frames])
    # clicar icone download
    ok = pg.evaluate("""() => {
        var els = document.querySelectorAll('a, button, i, span');
        for (var i=0;i<els.length;i++){
            var t=((els[i].getAttribute('aria-label')||'')+' '+(els[i].title||'')+' '+(els[i].innerText||'')).toLowerCase();
            if (t.indexOf('download')>=0 && t.trim().length<40){ els[i].click(); return t.trim(); }
        }
        return null;
    }""")
    print("icone:", ok)
    time.sleep(4)
    # dump visible buttons/inputs em TODOS os frames
    for f in pg.frames:
        try:
            ctrls = f.evaluate("""() => {
                var out=[];
                document.querySelectorAll('button, input, a, [role=button]').forEach(function(el){
                    var r = el.getBoundingClientRect();
                    if (r.width>2 && r.height>2){
                        out.push({tag:el.tagName, type:el.type||'', id:(el.id||'').slice(0,50),
                                  txt:(el.innerText||el.value||el.title||'').trim().slice(0,40),
                                  cls:(el.className||'').toString().slice(0,40)});
                    }
                });
                return out;
            }""")
            vis = [c for c in ctrls if c["txt"]]
            if vis:
                print("== frame", f.url[:70])
                print(json.dumps(vis, ensure_ascii=False, indent=0))
        except Exception as e:
            print("frame err", e)
    pg.close()
