#!/usr/bin/env python3
"""
DIAGNÓSTICO v2 — lê o painel "Associados" COMPLETO (os 4 accordions).

O painel Associados do PJe-TJBA tem 4 seções: Dependência, Prevenção,
Desmembramento, Vinculação Direta — cada uma com uma tabela Processos|Associação.
O v1 (get_associados) só lia o rótulo "(N)" e não abria os accordions.

Este v2: get_ca(CNJ) -> viewer -> clica "Associados" -> expande os 4 accordions
-> despeja o count, todos os CNJs achados e o innerText do painel (verboso p/ debug).

Uso (PJe-TJBA logado no Chrome :9222):
    python3 scripts/pje-cdp/diag_associados2.py "8004897-26.2025.8.05.0039"
"""
import argparse
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from patchright.sync_api import sync_playwright  # noqa: E402
import preparar_download as pd  # noqa: E402

CDP = "http://127.0.0.1:9222"
DETALHE = "https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompleto.seam"
ACCORDIONS = ["Dependência", "Prevenção", "Desmembramento", "Vinculação"]


def _pick_pje_page(ctx):
    for p in ctx.pages:
        if "pje.tjba.jus.br" in (p.url or ""):
            return p
    return None


def ler_painel(pg) -> dict:
    """Abre o menu do processo, clica 'Associados', expande os 4 accordions, despeja."""
    # 1. abrir o menu lateral do processo (hamburger) se preciso — tenta clicar "Associados" direto
    def _click_text(starts):
        return pg.evaluate(
            """(starts) => {
                const els=[...document.querySelectorAll('a,span,li,div,td,button')];
                const el=els.find(e => (e.innerText||'').trim().replace(/\\s+/g,' ').startsWith(starts)
                                       && e.offsetParent!==null && (e.innerText||'').trim().length<60);
                if(el){ el.scrollIntoView(); el.click(); return (el.innerText||'').trim().slice(0,50); }
                return null;
            }""", starts)

    # tenta abrir o menu (hamburger) — vários rótulos possíveis
    for m in ["Menu", "menu"]:
        pg.evaluate("""(t)=>{const els=[...document.querySelectorAll('a,button,i,span')];
            const el=els.find(e=>((e.getAttribute('aria-label')||'')+' '+(e.title||'')+' '+(e.innerText||'')).toLowerCase().includes(t)
                && (e.innerText||'').length<20 && e.offsetParent!==null); if(el) el.click();}""", m)
        time.sleep(0.6)

    # inspeciona + dispara o anchor "Associados (N)" corretamente
    info = pg.evaluate(
        """() => {
            const els=[...document.querySelectorAll('a')];
            const el=els.find(e=>/Associados\\s*\\(\\d+\\)/.test((e.innerText||'').replace(/\\s+/g,' ').trim()));
            if(!el) return {found:false};
            const r={found:true, href:el.getAttribute('href'), id:el.id,
                     onclick:(el.getAttribute('onclick')||'').slice(0,160),
                     outer:el.outerHTML.slice(0,260)};
            el.click();
            return r;
        }""")
    print(f"[anchor] {info}")
    clicked = "Associados" if info.get("found") else None
    # esperar o painel (AJAX) carregar
    try:
        pg.wait_for_function(
            "() => /resultados encontrados|N[úu]mero do processo|Depend[êe]ncia/.test(document.body.innerText)",
            timeout=15000)
    except Exception:
        pass
    time.sleep(2)

    # 2. expandir cada accordion clicando o header RichFaces (rich-stglpanel-header)
    expanded = []
    for label in ACCORDIONS:
        got = pg.evaluate(
            """(label) => {
                const hdrs=[...document.querySelectorAll('.rich-stglpanel-header, [id*="toggleProcessosAssociados"][id$="_header"]')];
                const el=hdrs.find(h=>(h.textContent||'').includes(label));
                if(!el) return null;
                el.click();
                return {id:(el.id||'').slice(0,60)};
            }""", label)
        if got:
            expanded.append(label)
        time.sleep(1.8)
    time.sleep(2)

    # 3. despejar — isola a região do painel (de 'Número do processo' em diante)
    full = pg.evaluate("() => document.body.innerText")
    count = None
    m = re.search(r"Associados\s*\((\d+)\)", full)
    if m:
        count = int(m.group(1))
    CNJ = re.compile(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}")
    cnjs = sorted(set(CNJ.findall(full)))
    i0 = full.find("Número do processo")
    if i0 < 0:
        i0 = full.find("Dependência")
    if i0 < 0:
        i0 = full.find("Associados")
    trecho = full[i0:i0 + 4000] if i0 >= 0 else full[:4000]
    return {"clicked": clicked, "expanded": expanded, "count": count, "cnjs": cnjs, "trecho": trecho}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cnj")
    args = ap.parse_args()
    principal = re.sub(r"\D", "", args.cnj)

    with sync_playwright() as pw:
        browser = pw.chromium.connect_over_cdp(CDP)
        ctx = browser.contexts[0]
        page = _pick_pje_page(ctx)
        if page is None:
            print("✗ sem aba pje.tjba.jus.br — abra e logue no PJe 1º grau.")
            sys.exit(2)
        page.on("dialog", lambda d: d.accept())
        print(f"\n=== ASSOCIADOS v2 — {args.cnj} ===")
        print("[nav] Peticionar → id/ca …")
        idp, ca = pd.get_ca(ctx, page, args.cnj)
        if not idp:
            print("✗ não encontrado no Peticionar")
            sys.exit(1)
        pg = ctx.new_page()
        pg.on("dialog", lambda d: d.accept())
        pg.goto(f"{DETALHE}?id={idp}&ca={ca}", wait_until="domcontentloaded", timeout=60000)
        time.sleep(6)
        r = ler_painel(pg)
        pg.close()

    # parse estruturado: divide o trecho pelas 4 seções e casa CNJ↔tipo↔classe↔sigilo
    trecho = r["trecho"]
    secs = {}
    labels = ["Dependência", "Prevenção", "Desmembramento", "Vinculação Direta"]
    for i, lab in enumerate(labels):
        a = trecho.find(lab)
        b = trecho.find(labels[i + 1]) if i + 1 < len(labels) else len(trecho)
        secs[lab] = trecho[a:b] if a >= 0 else ""
    CNJ = re.compile(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}")
    achados = []
    for lab, seg in secs.items():
        for cnj in dict.fromkeys(CNJ.findall(seg)):
            if re.sub(r"\D", "", cnj) == principal:
                continue
            i = seg.find(cnj)
            linha = seg[max(0, i - 40):i].replace("\n", " ").strip()
            classe = (linha.split() or [""])[-1] if linha else ""
            sig = "🔒sigiloso" if "sigilos" in seg[i:i + 120].lower() else ""
            assunto = ""
            mtail = re.search(r"-\s*([A-Za-zÀ-ú ]+)", seg[i:i + 80])
            if mtail:
                assunto = mtail.group(1).strip()[:24]
            achados.append((lab, cnj, classe, assunto, sig))
    print(f"[RESULTADO] {args.cnj} — Associados({r['count']}) | expandidos={len(r['expanded'])}/4")
    for lab, cnj, classe, assunto, sig in achados:
        print(f"   [{lab}] {cnj}  {classe}  {assunto}  {sig}".rstrip())
    if not achados:
        print("   (nenhum associado nos accordions)")


if __name__ == "__main__":
    main()
