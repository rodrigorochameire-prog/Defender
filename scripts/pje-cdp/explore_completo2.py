#!/usr/bin/env python3
import time, json, re
from patchright.sync_api import sync_playwright

CA = "a2b01eeab2e651d6326d6710acc8451b9e7f30003b9b4acf93ad2eb488b4dd25d790a56a15f6af63197881c251d7f01e67e6a6f51a50da1d"
with sync_playwright() as pw:
    browser = pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
    ctx = browser.contexts[0]
    pg = ctx.new_page()
    pg.goto(f"https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompleto.seam?ca={CA}",
            wait_until="domcontentloaded", timeout=60000)
    time.sleep(6)
    print("FRAMES:", [f.url[:120] for f in pg.frames])
    for f in pg.frames:
        try:
            txt = f.evaluate("() => document.body ? document.body.innerText : ''")
        except Exception:
            continue
        cnjs = sorted(set(re.findall(r"\d{7}-\d{2}\.\d{4}\.8\.05\.\d{4}", txt)))
        has_asso = [l.strip() for l in txt.split("\n") if re.search(r"associad", l, re.I)][:5]
        print("--- frame:", f.url[:100])
        print("    len:", len(txt), "| CNJs:", cnjs, "| asso:", has_asso)
        if len(txt) > 1000:
            # imprimir trecho com metadados
            idx = txt.find("Classe")
            print("    CLASSE ctx:", txt[max(0,idx-100):idx+300].replace("\n"," | ") if idx>=0 else "n/a")
    pg.close()
