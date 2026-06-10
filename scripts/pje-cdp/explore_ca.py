#!/usr/bin/env python3
"""Clica Peticionar, captura ca token, abre Detalhe e lista associados."""
import sys, time, json, re
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

    # estado atual: aba Peticionar com resultado da busca anterior
    iframe_el = page.query_selector("iframe")
    frame = iframe_el.content_frame()

    # garantir busca
    if not frame.evaluate("() => !!document.querySelector('tr.rich-table-row')"):
        parts = parse_numero(NUMERO)
        frame.evaluate("""(p) => {
            document.querySelector('input[id*="numeroSequencial"]').value = p.seq;
            document.querySelector('input[id*="Verificador"]').value = p.dig;
            document.querySelector('input[id*="Ano"]').value = p.ano;
            document.querySelector('input[id*="OrgaoJustica"]').value = p.org;
        }""", parts)
        frame.click('input[id*="searchProcessos"]')
        time.sleep(7)

    # clicar Peticionar e capturar popup
    with ctx.expect_page(timeout=30000) as pop_info:
        frame.evaluate("""() => {
            var a = document.querySelector('a[title="Peticionar"]');
            a.click();
        }""")
    popup = pop_info.value
    popup.wait_for_load_state("domcontentloaded", timeout=30000)
    time.sleep(2)
    print("POPUP URL:", popup.url[:250])
    m = re.search(r"[?&]ca=([a-f0-9]+)", popup.url)
    ca = m.group(1) if m else None
    print("CA:", ca)
    popup.close()

    if ca:
        det = ctx.new_page()
        det.goto(f"https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listView.seam?ca={ca}",
                 wait_until="domcontentloaded", timeout=60000)
        time.sleep(4)
        info = det.evaluate("""() => {
            var txt = document.body.innerText;
            return txt.slice(0, 3000);
        }""")
        print("=== DETALHE ===")
        print(info)
        det.close()
