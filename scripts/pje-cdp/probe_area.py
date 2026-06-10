#!/usr/bin/env python3
import time, json
from patchright.sync_api import sync_playwright

with sync_playwright() as pw:
    browser = pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
    ctx = browser.contexts[0]
    page = ctx.pages[0]
    page.goto("https://pje.tjba.jus.br/pje/AreaDeDownload/listView.seam", wait_until="domcontentloaded", timeout=60000)
    time.sleep(10)
    print("FRAMES:", [f.url[:100] for f in page.frames])
    for f in page.frames:
        try:
            txt = f.evaluate("() => document.body ? document.body.innerText.slice(0,600) : ''")
        except Exception as e:
            print("frame err:", e); continue
        print("--- frame:", f.url[:80], "len:", len(txt))
        print(txt[:500])
        try:
            rows = f.evaluate("""() => {
                var out=[];
                document.querySelectorAll('tr').forEach(function(tr,i){
                    var t=(tr.innerText||'').replace(/\\s+/g,' ').trim();
                    if (t && /\\d{7}-\\d{2}/.test(t)) {
                        var btns=[];
                        tr.querySelectorAll('button, a').forEach(function(b){
                            btns.push({tag:b.tagName, id:(b.id||'').slice(0,50), title:b.title||'', txt:(b.innerText||'').trim().slice(0,30),
                                       aria:b.getAttribute('aria-label')||'', href:(b.href||'').slice(0,100)});
                        });
                        out.push({i:i, t:t.slice(0,160), btns:btns});
                    }
                });
                return out;
            }""")
            print(json.dumps(rows[:5], ensure_ascii=False, indent=1))
        except Exception as e:
            print("rows err:", e)
