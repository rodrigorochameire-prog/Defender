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
    time.sleep(5)
    data = pg.evaluate("""() => {
        var txt = document.body.innerText;
        // âncoras com 'Associa'
        var asso = [];
        document.querySelectorAll('a, td, div.tab, .rich-tab-header').forEach(function(el){
            var t = (el.innerText||'').trim();
            if (/associad/i.test(t) && t.length < 80) asso.push({tag: el.tagName, id: el.id, text: t});
        });
        // links de download
        var dls = [];
        document.querySelectorAll('a').forEach(function(a){
            var t=(a.title||a.innerText||'').trim();
            if (/download|autos|baixar/i.test(t) && t.length<60) dls.push({id:a.id,title:a.title,text:a.innerText.trim().slice(0,40)});
        });
        // abas
        var tabs=[];
        document.querySelectorAll('.rich-tab-header, [id*="tab"]').forEach(function(el){
            var t=(el.innerText||'').trim();
            if(t && t.length<50 && tabs.indexOf(t)<0) tabs.push(t);
        });
        return {len: txt.length, head: txt.slice(800, 4000), asso: asso, dls: dls, tabs: tabs.slice(0,30)};
    }""")
    print("TABS:", json.dumps(data["tabs"], ensure_ascii=False))
    print("ASSOCIADOS:", json.dumps(data["asso"], ensure_ascii=False))
    print("DOWNLOADS:", json.dumps(data["dls"], ensure_ascii=False))
    print("HEAD:")
    print(data["head"][:2500])
    pg.close()
