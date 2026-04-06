#!/usr/bin/env python3
"""
PJe TJBA — Scraper de Pauta de Audiências via Playwright + CDP

Conecta ao Chromium com CDP (porta 9222), navega ao PJe (já logado),
aplica filtros (jurisdição, órgão julgador, datas) e extrai todas as
audiências paginando via slider RichFaces.

Uso:
    # Chrome/Chromium deve estar rodando com CDP:
    # /Applications/Chromium.app/Contents/MacOS/Chromium --remote-debugging-port=9222

    # Defensor faz login no PJe com e-CPF

    # Rodar o scraper:
    python3 scripts/orchestrators/pje-pauta-scraper.py \
        --jurisdicao "CAMAÇARI" \
        --orgao-value 887 \
        --data-de "01/04/2026" \
        --data-ate "30/04/2026" \
        --output /tmp/pje-pauta.json

Requisitos:
    - Chromium com --remote-debugging-port=9222
    - PJe logado (e-CPF manual)
    - pip install playwright
"""

import asyncio
import json
import argparse
import sys
from datetime import datetime
from playwright.async_api import async_playwright


async def extract_rows(pje):
    """Extract audiência rows from the current page table."""
    return await pje.evaluate('''() => {
        const table = document.getElementById('idProcessoAudiencia');
        if (!table) return [];
        const rows = [];
        for (const tr of table.querySelectorAll('tbody tr')) {
            const cells = [...tr.querySelectorAll('td')].map(td => {
                const c = td.cloneNode(true);
                c.querySelectorAll('script').forEach(s => s.remove());
                return c.innerText.trim();
            }).filter(c => c.length > 0);
            if (cells.length >= 5 && /\\d{2}\\/\\d{2}\\/\\d{4}/.test(cells[0])) {
                rows.push({
                    dataHora: cells[0], processo: cells[1],
                    orgaoJulgador: cells[2], partes: cells[3],
                    classe: cells[4], tipo: cells[5] || "",
                    sala: cells[6] || "", situacao: cells[7] || "",
                });
            }
        }
        return rows;
    }''')


async def scrape_pauta(
    jurisdicao: str = "CAMAÇARI",
    orgao_value: str = "887",
    data_de: str = "",
    data_ate: str = "",
    cdp_url: str = "http://localhost:9222",
    output: str = "/tmp/pje-pauta.json",
):
    pw = await async_playwright().start()
    browser = await pw.chromium.connect_over_cdp(cdp_url)
    ctx = browser.contexts[0]
    pje = next((p for p in ctx.pages if "pje.tjba" in p.url), None)

    if not pje:
        print("❌ PJe tab not found. Abra o PJe e faça login primeiro.")
        await pw.stop()
        return []

    # 1. Navigate to Painel → Pauta de Audiência
    print("Navegando para Pauta de Audiência...")
    await pje.goto(
        "https://pje.tjba.jus.br/pje/Painel/painel_usuario/advogado.seam",
        wait_until="domcontentloaded",
        timeout=15000,
    )
    await asyncio.sleep(3)

    await pje.evaluate('''() => {
        const links = document.querySelectorAll('a');
        for (const a of links) {
            if (a.textContent.trim() === 'Pauta de audiência') { a.click(); return true; }
        }
        return false;
    }''')
    await asyncio.sleep(5)

    # 2. Apply filters
    print(f"Filtros: {jurisdicao} | órgão={orgao_value} | {data_de} → {data_ate}")

    sel_jurisdicao = "#processoAudienciaSearchForm\\:jurisdicaoDecoration\\:jurisdicao"
    sel_orgao = "#processoAudienciaSearchForm\\:orgaoJulgadorDecoration\\:orgaoJulgador"
    from_input = "#processoAudienciaSearchForm\\:dtInicioDecoration\\:dtInicioFromFormInputDate"
    to_input = "#processoAudienciaSearchForm\\:dtInicioDecoration\\:dtInicioToFormInputDate"

    await pje.select_option(sel_jurisdicao, label=jurisdicao)
    await asyncio.sleep(3)

    if orgao_value:
        await pje.select_option(sel_orgao, value=orgao_value)
        await asyncio.sleep(2)

    if data_de:
        await pje.fill(from_input, data_de)
    if data_ate:
        await pje.fill(to_input, data_ate)

    await asyncio.sleep(0.5)

    # 3. Click Pesquisar
    await pje.click('input[value="Pesquisar"]')
    await asyncio.sleep(6)

    total_text = await pje.evaluate('''() => {
        const m = document.body.innerText.match(/(\\d+) resultados? encontrados?/);
        return m ? m[0] : "0 resultados";
    }''')
    print(f"✓ {total_text}")

    # 4. Extract all pages
    all_rows = []
    seen = set()

    # Page 1
    rows = await extract_rows(pje)
    for r in rows:
        seen.add(r["processo"] + r["dataHora"])
        all_rows.append(r)
    print(f"  Pág 1: {len(rows)} rows (total: {len(all_rows)})")

    # Pages 2+ via RichFaces slider arrow click
    # Key: use .rich-inslider-inc-horizontal with scroll_into_view
    max_pages = 20  # safety
    for pg in range(2, max_pages + 1):
        arrow = pje.locator(".rich-inslider-inc-horizontal").first
        try:
            await arrow.scroll_into_view_if_needed(timeout=3000)
        except:
            break

        await asyncio.sleep(0.3)
        await arrow.click()

        # Wait for slider value change
        for _ in range(30):
            await asyncio.sleep(0.5)
            val = await pje.evaluate(
                "() => document.querySelector('.rich-inslider-field')?.value || '?'"
            )
            if val == str(pg):
                await asyncio.sleep(2)
                break

        rows = await extract_rows(pje)
        n = 0
        for r in rows:
            k = r["processo"] + r["dataHora"]
            if k not in seen:
                seen.add(k)
                all_rows.append(r)
                n += 1

        print(f"  Pág {pg}: {len(rows)} rows, {n} novos (total: {len(all_rows)})")

        if n == 0 and len(rows) == 0:
            break

    # 5. Save output
    with open(output, "w") as f:
        json.dump(all_rows, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*50}")
    print(f"TOTAL: {len(all_rows)} audiências extraídas")
    print(f"Salvo em: {output}")
    print(f"{'='*50}")

    # Summary
    desig = sum(1 for r in all_rows if "esignad" in r.get("situacao", ""))
    canc = sum(1 for r in all_rows if "ancel" in r.get("situacao", ""))
    print(f"Designadas: {desig} | Canceladas: {canc}")

    await pw.stop()
    return all_rows


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PJe Pauta de Audiência Scraper")
    parser.add_argument("--jurisdicao", default="CAMAÇARI")
    parser.add_argument("--orgao-value", default="887", help="Value do select de órgão julgador")
    parser.add_argument("--data-de", default="", help="DD/MM/YYYY")
    parser.add_argument("--data-ate", default="", help="DD/MM/YYYY")
    parser.add_argument("--cdp-url", default="http://localhost:9222")
    parser.add_argument("--output", default="/tmp/pje-pauta.json")
    args = parser.parse_args()

    asyncio.run(
        scrape_pauta(
            jurisdicao=args.jurisdicao,
            orgao_value=args.orgao_value,
            data_de=args.data_de,
            data_ate=args.data_ate,
            cdp_url=args.cdp_url,
            output=args.output,
        )
    )
