#!/usr/bin/env python3
import sys, time, json, re
from patchright.sync_api import sync_playwright

NUMERO = sys.argv[1] if len(sys.argv) > 1 else "8006888-03.2026.8.05.0039"
PANEL = "https://pje.tjba.jus.br/pje/Painel/painel_usuario/advogado.seam"

def parse_numero(num):
    p = num.replace("-", ".").split(".")
    return {"seq": p[0], "dig": p[1], "ano": p[2], "org": p[5]}

def get_ca(ctx, page, numero):
    page.goto(PANEL, wait_until="domcontentloaded", timeout=60000)
    time.sleep(5)
    page.evaluate("""() => { var c=document.querySelectorAll('td');
        for (var i=0;i<c.length;i++) if (c[i].textContent.trim()==='PETICIONAR'){c[i].click();return;} }""")
    time.sleep(6)
    frame = page.query_selector("iframe").content_frame()
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
    with ctx.expect_page(timeout=30000) as pop_info:
        frame.evaluate("() => document.querySelector('a[title=\"Peticionar\"]').click()")
    popup = pop_info.value
    popup.wait_for_load_state("domcontentloaded", timeout=30000)
    m = re.search(r"idProcesso=(\d+)&ca=([a-f0-9]+)", popup.url)
    popup.close()
    return m.group(1), m.group(2)

with sync_playwright() as pw:
    browser = pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
    ctx = browser.contexts[0]
    page = ctx.pages[0]
    page.on("dialog", lambda d: d.accept())
    idp, ca = get_ca(ctx, page, NUMERO)
    pg = ctx.new_page()
    pg.on("dialog", lambda d: d.accept())
    pg.goto(f"https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id={idp}&ca={ca}",
            wait_until="domcontentloaded", timeout=60000)
    time.sleep(6)
    before = pg.evaluate("() => document.body.innerText")
    ok = pg.evaluate("""() => {
        var els = document.querySelectorAll('a, button, i, span');
        for (var i=0;i<els.length;i++){
            var t=((els[i].getAttribute('aria-label')||'')+' '+(els[i].title||'')+' '+(els[i].innerText||'')).toLowerCase();
            if (t.indexOf('download')>=0 && t.trim().length<40){ els[i].click(); return t.trim(); }
        }
        return null;
    }""")
    print("download clicado:", ok)
    time.sleep(4)
    after = pg.evaluate("() => document.body.innerText")
    # diff de linhas novas
    bset = set(before.split("\n"))
    novas = [l.strip() for l in after.split("\n") if l.strip() and l not in bset]
    print("NOVAS LINHAS:", json.dumps(novas[:50], ensure_ascii=False, indent=0))
    # inputs/botoes visiveis do dialogo
    ctrls = pg.evaluate("""() => {
        var out=[];
        document.querySelectorAll('input, button, select, label').forEach(function(el){
            var r = el.getBoundingClientRect();
            if (r.width>0 && r.height>0){
                out.push({tag:el.tagName, type:el.type||'', id:(el.id||'').slice(0,60),
                          txt:(el.innerText||el.value||'').trim().slice(0,40),
                          name:(el.name||'').slice(0,40), checked: el.checked===true});
            }
        });
        return out;
    }""")
    print("CTRLS:", json.dumps([c for c in ctrls if c["txt"] or c["type"] in ("radio","checkbox")][:40], ensure_ascii=False, indent=0))
    pg.close()
