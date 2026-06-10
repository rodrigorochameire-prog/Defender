#!/usr/bin/env python3
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
    links = frame.evaluate("""() => {
        var out=[];
        document.querySelectorAll('table a, .rich-table a').forEach(function(a){
            out.push({id:a.id, title:a.title, cls:a.className.slice(0,40),
                      txt:a.innerText.trim().slice(0,30),
                      icon: a.querySelector('i,span') ? (a.querySelector('i,span').className||'').slice(0,50) : ''});
        });
        return out;
    }""")
    print(json.dumps(links, ensure_ascii=False, indent=1))
    # texto da tabela de resultados
    ttxt = frame.evaluate("""() => { var t=document.querySelector('.rich-table, table[id*="processosTable"]'); return t? t.innerText.slice(0,800):'no-table'; }""")
    print("TABELA:", ttxt.replace("\\n"," | ")[:600])
