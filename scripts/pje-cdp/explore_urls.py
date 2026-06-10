#!/usr/bin/env python3
import time, json, re
from patchright.sync_api import sync_playwright

CA = "a2b01eeab2e651d6326d6710acc8451b9e7f30003b9b4acf93ad2eb488b4dd25d790a56a15f6af63197881c251d7f01e67e6a6f51a50da1d"
IDP = "17378908"
URLS = [
    f"https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompleto.seam?ca={CA}",
    f"https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam?ca={CA}",
    f"https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listView.seam?ca={CA}&idProcesso={IDP}",
    f"https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Documentos/listAutosDigitais.seam?ca={CA}",
]
with sync_playwright() as pw:
    browser = pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
    ctx = browser.contexts[0]
    pg = ctx.new_page()
    for u in URLS:
        try:
            pg.goto(u, wait_until="domcontentloaded", timeout=45000)
            time.sleep(3)
            body = pg.evaluate("() => document.body.innerText.slice(0,400)")
            ok = "não encontrada" not in body and "nao encontrada" not in body
            print("URL:", u.split('/pje/')[1].split('?')[0], "→", "OK" if ok else "404")
            if ok:
                print(body.replace("\n"," | ")[:400])
                print("TITLE:", pg.title())
        except Exception as e:
            print("URL:", u[:80], "ERRO:", str(e)[:80])
        print("---")
    pg.close()
