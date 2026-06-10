#!/usr/bin/env python3
"""Explora a rota Peticionar via CDP: busca 1 CNJ, lista colunas e links da linha."""
import sys, time, json
from patchright.sync_api import sync_playwright

NUMERO = sys.argv[1] if len(sys.argv) > 1 else "8006888-03.2026.8.05.0039"

def parse_numero(num):
    p = num.replace("-", ".").split(".")
    return {"seq": p[0], "dig": p[1], "ano": p[2], "org": p[5]}

with sync_playwright() as pw:
    browser = pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
    ctx = browser.contexts[0]
    page = ctx.pages[0]
    page.on("dialog", lambda d: d.accept())

    if "advogado.seam" not in page.url:
        page.goto("https://pje.tjba.jus.br/pje/Painel/painel_usuario/advogado.seam", wait_until="domcontentloaded")
        time.sleep(5)

    # Abrir aba PETICIONAR
    page.evaluate("""() => {
        var cells = document.querySelectorAll('td');
        for (var i=0;i<cells.length;i++)
            if (cells[i].textContent.trim()==='PETICIONAR'){cells[i].click();return true;}
        return false;
    }""")
    time.sleep(6)

    iframe_el = page.query_selector("iframe")
    frame = iframe_el.content_frame()
    frame.wait_for_selector('input[id*="numeroSequencial"]', timeout=20000)

    parts = parse_numero(NUMERO)
    frame.evaluate("""(p) => {
        document.querySelector('input[id*="numeroSequencial"]').value = p.seq;
        document.querySelector('input[id*="Verificador"]').value = p.dig;
        document.querySelector('input[id*="Ano"]').value = p.ano;
        document.querySelector('input[id*="OrgaoJustica"]').value = p.org;
    }""", parts)
    frame.click('input[id*="searchProcessos"]')
    time.sleep(7)

    rows = frame.evaluate("""() => {
        var out = [];
        document.querySelectorAll('tr.rich-table-row').forEach(function(tr){
            var cells = [];
            tr.querySelectorAll('td').forEach(function(td){ cells.push(td.innerText.trim().slice(0,120)); });
            var links = [];
            tr.querySelectorAll('a').forEach(function(a){
                links.push({id:a.id, title:a.title, text:a.innerText.trim().slice(0,40),
                            href:(a.href||'').slice(0,150), onclick: a.getAttribute('onclick') ? a.getAttribute('onclick').slice(0,200) : null});
            });
            out.push({cells:cells, links:links});
        });
        return out;
    }""")
    print(json.dumps(rows, ensure_ascii=False, indent=1))
