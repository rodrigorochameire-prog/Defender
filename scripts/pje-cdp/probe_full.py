#!/usr/bin/env python3
"""Fluxo integrado: busca CNJ → popup Peticionar → ca fresco → listProcessoCompleto → dump."""
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
    page.evaluate("""() => {
        var cells = document.querySelectorAll('td');
        for (var i=0;i<cells.length;i++)
            if (cells[i].textContent.trim()==='PETICIONAR'){cells[i].click();return true;}
    }""")
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
    time.sleep(7)

    with ctx.expect_page(timeout=30000) as pop_info:
        frame.evaluate("() => document.querySelector('a[title=\"Peticionar\"]').click()")
    popup = pop_info.value
    popup.wait_for_load_state("domcontentloaded", timeout=30000)
    ca = re.search(r"[?&]ca=([a-f0-9]+)", popup.url).group(1)
    print("CA fresco ok")

    pg = ctx.new_page()
    pg.goto(f"https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompleto.seam?ca={ca}",
            wait_until="domcontentloaded", timeout=60000)
    time.sleep(6)
    txt = pg.evaluate("() => document.body.innerText")
    open(f"/tmp/probe-{NUMERO}.txt","w").write(txt)
    print("len:", len(txt))
    cnjs = sorted(set(re.findall(r"\d{7}-\d{2}\.\d{4}\.8\.05\.\d{4}", txt)))
    print("CNJs na página:", cnjs)
    asso = [l.strip() for l in txt.split("\n") if re.search(r"associad", l, re.I)][:8]
    print("Linhas 'associad':", asso)
    popup.close(); pg.close()
