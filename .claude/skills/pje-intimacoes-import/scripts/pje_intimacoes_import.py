#!/usr/bin/env python3
"""Worker (browser lane): raspa EXPEDIENTES do PJe por atribuição e grava em
pje_import_staging (NUNCA em demandas). Decisão de dedup Layer-A via ledger.

Reusa de varredura_triagem.py: load_env, Supabase, CDP attach + login fallback,
e a navegação do Painel do Defensor. Ver instrução de reuso no plano.

CROSS-DIRECTORY IMPORT
----------------------
Este script vive em .claude/skills/pje-intimacoes-import/scripts/ mas
importa de .claude/skills/varredura-triagem/scripts/. O patch de sys.path
ocorre DENTRO de run() e main() (lazy), para que as importações puras
no topo do módulo não arrastem Playwright/patchright.

SELECTORS INFERIDOS (VERIFICAR AO VIVO)
----------------------------------------
Selectors marcados com "ASSUMPTION" foram inferidos do código de varredura +
padrões típicos do PJe TJBA/RichFaces. DEVEM ser verificados contra o DOM
real do painel do defensor antes de usar em produção.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import os
import re
import sys
from datetime import datetime, timezone

CDP_URL = "http://127.0.0.1:9222"
PJE_BASE = "https://pje.tjba.jus.br/pje"
PANEL_URL = f"{PJE_BASE}/Painel/painel_usuario/advogado.seam"

# ─── Mapeamento atribuição → keywords p/ filtro de vara no painel ────────────
# ASSUMPTION: esses termos são substrings dos nomes de vara exibidos no
# dropdown do painel. Verificar contra os textos reais do <option> no PJe.
ATRIB_VARA_KEYWORDS: dict[str, list[str]] = {
    "VVD_CAMACARI":       ["VVD", "Violência Doméstica", "Violencia Domestica"],
    "JURI_CAMACARI":      ["Júri", "Juri", "Tribunal do Júri"],
    "CRIMINAL_CAMACARI":  ["Criminal", "Camaçari"],
    "EXECUCAO_PENAL":     ["Execução Penal", "Execucao Penal"],
}


# ─── sys.path helper (lazy, só usa stdlib) ────────────────────────────────────

def _patch_varredura_path() -> None:
    """Insere .claude/skills/varredura-triagem/scripts/ no sys.path, uma vez."""
    varredura_dir = os.path.normpath(
        os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "..", "..", "..", "varredura-triagem", "scripts",
        )
    )
    if varredura_dir not in sys.path:
        sys.path.insert(0, varredura_dir)


# ─── Pure helpers (sem imports pesados — importáveis pelo teste) ─────────────

def normalize_conteudo(s: str) -> str:
    """Colapsa whitespace, strip, lowercase. Deve ser byte-idêntico ao TS
    computeContentHash → normalizeConteudo."""
    s = s or ""
    return re.sub(r"\s+", " ", s).strip().lower()


def compute_content_hash(processo: str, doc_id: str | None, conteudo: str) -> str:
    """sha256(processo + "|" + (doc_id or "") + "|" + normalize_conteudo(conteudo)).
    Deve ser byte-idêntico ao TS computeContentHash (Task 2)."""
    payload = "%s|%s|%s" % (
        processo or "",
        doc_id or "",
        normalize_conteudo(conteudo),
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def decide_layer_a(
    doc_id: str | None,
    content_hash: str,
    ledger_index: dict,
) -> str:
    """ledger_index = {"by_doc": {docId: decisao}, "by_hash": {hash: decisao}}.
    Retorna 'nova' | 'duplicada' | 'ja_importada'."""
    if doc_id and doc_id in ledger_index.get("by_doc", {}):
        prev = ledger_index["by_doc"][doc_id]
        return "ja_importada" if prev == "imported" else "duplicada"
    if content_hash in ledger_index.get("by_hash", {}):
        prev = ledger_index["by_hash"][content_hash]
        return "ja_importada" if prev == "imported" else "duplicada"
    return "nova"


# ─── Supabase helpers (usam SupabaseExt criado dentro de run()) ───────────────

def load_ledger_index(sb) -> dict:
    """Lê TODOS os rows de pje_intimacoes_ledger e indexa por doc_id e por hash.

    PostgREST limita respostas a ~1000 rows por padrão — sem paginação explícita
    o índice de dedup seria silenciosamente incompleto depois de 1000 entradas,
    causando reinserção falsa como 'nova' de docs já vistos. Paginamos via
    limit/offset até receber uma página curta (< PAGE), garantindo cobertura total.
    """
    PAGE = 1000
    idx: dict = {"by_doc": {}, "by_hash": {}}
    offset = 0
    while True:
        rows = sb._req(
            "GET",
            f"/rest/v1/pje_intimacoes_ledger"
            f"?select=pje_documento_id,content_hash,decisao"
            f"&limit={PAGE}&offset={offset}",
        ) or []
        for r in rows:
            if r.get("pje_documento_id"):
                idx["by_doc"][r["pje_documento_id"]] = r["decisao"]
            if r.get("content_hash"):
                idx["by_hash"][r["content_hash"]] = r["decisao"]
        if len(rows) < PAGE:
            break  # última (ou única) página
        offset += PAGE
    return idx


def set_etapa(sb, job_id: int, texto: str) -> None:
    sb.update("claude_code_tasks", {"id": "eq.%d" % job_id}, {"etapa": texto})


def _bump_ledger_last_seen(sb, doc_id: str | None, content_hash: str, job_id: int) -> None:
    flt = (
        {"pje_documento_id": "eq.%s" % doc_id}
        if doc_id
        else {"content_hash": "eq.%s" % content_hash}
    )
    sb.update("pje_intimacoes_ledger", flt, {"last_seen_at": datetime.now(timezone.utc).isoformat(), "job_id": job_id})


# ─── JS constants para navegação DOM ─────────────────────────────────────────
# Confirmados pelo varredura_triagem.py (validados 2026-05-04):
TBODY_ID = "formExpedientes:tbExpedientes:tb"

JS_RESET_TO_PAGE_1 = r"""() => {
  const first = Array.from(document.querySelectorAll('.rich-datascr-button'))
    .find(b => b.textContent.trim() === '««' && !b.className.includes('dsbld'));
  if (first) { first.click(); return 'first'; }
  const one = Array.from(document.querySelectorAll('.rich-datascr-inact'))
    .find(el => el.textContent.trim() === '1');
  if (one) { one.click(); return 'one'; }
  return 'noop';
}"""

JS_GOTO_PAGE = r"""(target) => {
  const items = Array.from(document.querySelectorAll('.rich-datascr-inact'));
  const next = items.find(el => el.textContent.trim() === String(target));
  if (next) { next.click(); return true; }
  return false;
}"""

# ASSUMPTION: extrai colunas por posição ordinal (td index) de cada tr.rich-table-row.
# Estrutura inferida de PJe TJBA painel expedientes (layout RichFaces h:dataTable):
#   col 0: ícone/checkbox
#   col 1: número do processo (link "Autos Digitais")
#   col 2: nome da parte/assistido
#   col 3: tipo/ato do documento
#   col 4: data de expedição
#   col 5: data de intimação
#   col 6: prazo (dias)
#   col 7: ações
# VERIFICAR ao vivo inspecionando <tbody id="formExpedientes:tbExpedientes:tb">
JS_EXTRACT_ALL_ROWS = r"""() => {
  const tbody = document.getElementById('formExpedientes:tbExpedientes:tb');
  if (!tbody) return [];
  const rows = [];
  for (const row of tbody.querySelectorAll('tr.rich-table-row')) {
    // Índice da linha no ID do elemento
    const m = row.innerHTML.match(/formExpedientes:tbExpedientes:(\d+):/);
    const rowIdx = m ? m[1] : null;

    // Link dos Autos Digitais → número do processo e URL
    const autosLink = row.querySelector('a[title="Autos Digitais"]');
    const processoNumero = autosLink ? autosLink.textContent.trim() : null;
    const onclick = autosLink ? (autosLink.getAttribute('onclick') || '') : '';
    const urlMatch = onclick.match(/window\.open\('([^']+)'/);
    const autosUrl = urlMatch ? urlMatch[1] : null;

    // pjeDocumentoId: extraído do onclick (?nd=xxx) ou do índice da linha
    // ASSUMPTION: o nd= na URL dos autos digitais corresponde ao ID do doc PJe.
    const ndMatch = onclick.match(/[?&]nd=([0-9]+)/);
    const pjeDocumentoId = ndMatch ? ndMatch[1] : rowIdx;

    // Células por posição (índices ASSUMPTION — verificar)
    const cells = Array.from(row.querySelectorAll('td'));
    const cellText = i => (cells[i] ? (cells[i].innerText || cells[i].textContent || '').trim() : '');

    rows.push({
      processoNumero: processoNumero || cellText(1),
      assistidoNome: cellText(2),
      tipoDocumento: cellText(3),
      ato: cellText(3),
      dataExpedicao: cellText(4),
      dataIntimacao: cellText(5),
      prazo: cellText(6),
      pjeDocumentoId,
      autosUrl,
      conteudo: '',  // Preenchido opcionalmente por _read_conteudo_if_needed
    });
  }
  return rows;
}"""

# ASSUMPTION: tenta selecionar vara por text-match em <select> ou RichFaces listbox.
# IDs candidatos inferidos de padrões PJe: formExpedientes:vara, formPainel:vara, etc.
# VERIFICAR ao vivo o id real do elemento de filtro de vara/órgão julgador.
JS_SELECT_VARA = r"""(keyword) => {
  const kw = keyword.toUpperCase();
  // Tenta <select> nativo
  const selects = document.querySelectorAll('select');
  for (const sel of selects) {
    for (const opt of sel.options) {
      if (opt.text.toUpperCase().includes(kw)) {
        sel.value = opt.value;
        sel.dispatchEvent(new Event('change', {bubbles: true}));
        // Tenta disparar onchange RichFaces (a4j)
        if (sel.onchange) sel.onchange();
        return 'select:' + opt.text;
      }
    }
  }
  // Tenta RichFaces rich:select ou a4j:commandLink com texto
  const links = Array.from(document.querySelectorAll('a, span.rf-sel-itm'));
  for (const el of links) {
    const txt = (el.textContent || '').toUpperCase();
    if (txt.includes(kw) && txt.length < 80) {
      el.click();
      return 'rf:' + el.textContent.trim();
    }
  }
  return null;
}"""

# ASSUMPTION: filtro de datas usa inputs com id contendo "dataInicio"/"dataFim"
# ou "dtInicio"/"dtFim". Datas no formato DD/MM/YYYY (padrão PJe).
# VERIFICAR ids reais ao vivo.
JS_SET_DATE_FILTERS = r"""(since, until) => {
  const startCandidates = [
    'input[id*="dataInicio"]', 'input[id*="dataExpInicio"]',
    'input[id*="dtInicio"]', 'input[id*="startDate"]',
  ];
  const endCandidates = [
    'input[id*="dataFim"]', 'input[id*="dataExpFim"]',
    'input[id*="dtFim"]', 'input[id*="endDate"]',
  ];
  const fill = (selectors, val) => {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && val) {
        el.value = val;
        el.dispatchEvent(new Event('change', {bubbles: true}));
        el.dispatchEvent(new Event('blur', {bubbles: true}));
        return el.id || sel;
      }
    }
    return null;
  };
  return {
    startFilled: fill(startCandidates, since),
    endFilled: fill(endCandidates, until),
  };
}"""

# ASSUMPTION: botão de pesquisa/filtro tem type=submit ou texto "Pesquisar"/"Filtrar".
JS_CLICK_SEARCH_BUTTON = r"""() => {
  const candidates = [
    document.querySelector('input[type="submit"][value*="Pesquisar"]'),
    document.querySelector('input[type="submit"][value*="Filtrar"]'),
    document.querySelector('a[id*="pesquisar"]'),
    document.querySelector('a[id*="filtrar"]'),
    Array.from(document.querySelectorAll('input[type="submit"]')).find(
      b => /pesquis|filtr/i.test(b.value)
    ),
  ].filter(Boolean);
  if (candidates[0]) { candidates[0].click(); return candidates[0].id || candidates[0].value; }
  return null;
}"""


# ─── Data helpers ─────────────────────────────────────────────────────────────

def _iso_to_pje_date(iso_date: str | None) -> str | None:
    """Converte YYYY-MM-DD → DD/MM/YYYY (formato dos inputs PJe)."""
    if not iso_date:
        return None
    try:
        y, m, d = iso_date.split("-")
        return f"{d}/{m}/{y}"
    except Exception:
        return iso_date  # pass-through se já está em outro formato


# ─── Live scraper (Playwright — importado lazily) ─────────────────────────────

async def _async_scrape_expedientes(
    env: dict,
    atribuicao: str,
    since: str | None,
    until: str | None,
    limit: int,
    modo: str,
    heartbeat,
) -> list[dict]:
    """Navega o painel do PJe via CDP ou login direto e extrai linhas de
    EXPEDIENTES para a atribuição informada.

    SELECTORS ASSUMPTIONS (verificar ao vivo):
    - TBODY_ID 'formExpedientes:tbExpedientes:tb' — confirmado em varredura_triagem.py
    - Colunas por posição ordinal (ver JS_EXTRACT_ALL_ROWS)
    - Filtro de vara por text-match em <select> (ver JS_SELECT_VARA)
    - Filtro de datas em inputs com 'dataInicio'/'dataFim' (ver JS_SET_DATE_FILTERS)
    - Botão pesquisa com value 'Pesquisar' ou similar (ver JS_CLICK_SEARCH_BUTTON)
    """
    try:
        from patchright.async_api import async_playwright  # type: ignore
    except ImportError:
        raise RuntimeError(
            "patchright não instalado — ative o .venv do enrichment-engine"
        )

    page_limit = max(1, (limit // 10) + 2)  # estimativa de páginas a percorrer
    results: list[dict] = []

    async with async_playwright() as p:
        if modo == "cdp":
            try:
                browser = await p.chromium.connect_over_cdp(CDP_URL)
            except Exception as e:
                raise RuntimeError(
                    f"Abra o PJe logado ou configure credenciais (CDP erro: {e})"
                )
            ctx = browser.contexts[0]
            # Procura página do painel; aceita qualquer aba do PJe como fallback
            page = next(
                (pg for pg in ctx.pages if "advogado.seam" in pg.url),
                next((pg for pg in ctx.pages if "pje.tjba.jus.br" in pg.url), None),
            )
            if not page:
                raise RuntimeError(
                    "Abra o PJe logado ou configure credenciais "
                    "(nenhuma aba PJe encontrada no Chromium CDP)"
                )
            print(
                f"[cdp] attached — {len(ctx.pages)} abas, painel: {page.url[:70]}",
                flush=True,
            )
        else:  # direct
            if not env.get("PJE_CPF") or not env.get("PJE_SENHA"):
                raise RuntimeError(
                    "Abra o PJe logado ou configure credenciais "
                    "(PJE_CPF/PJE_SENHA ausentes no .env.local)"
                )
            browser = await p.chromium.launch(headless=True)
            ctx = await browser.new_context(ignore_https_errors=True)
            page = await ctx.new_page()
            print("[direct] login programático no PJe…", flush=True)
            await page.goto(
                f"{PJE_BASE}/login.seam", wait_until="domcontentloaded", timeout=30000
            )
            await page.wait_for_selector("input[name=username]", timeout=15000)
            await page.fill("input[name=username]", env["PJE_CPF"])
            await page.fill("input[name=password]", env["PJE_SENHA"])
            await page.click("input[type=submit]")
            await page.wait_for_url(
                re.compile(r"advogado\.seam"), timeout=30000
            )
            await asyncio.sleep(3)

        # ── Navegação para EXPEDIENTES (se não estiver lá) ─────────────────
        if "advogado.seam" not in page.url:
            print(f"  → navegando para painel: {PANEL_URL}", flush=True)
            await page.goto(PANEL_URL, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(3)

        # ── Seleciona vara correspondente à atribuição ─────────────────────
        # ASSUMPTION: atribuição → keywords de texto do dropdown de vara/órgão.
        keywords = ATRIB_VARA_KEYWORDS.get(atribuicao, [atribuicao])
        vara_selected = None
        for kw in keywords:
            vara_selected = await page.evaluate(JS_SELECT_VARA, kw)
            if vara_selected:
                print(f"  → vara selecionada: {vara_selected}", flush=True)
                await asyncio.sleep(2)
                break
        if not vara_selected:
            print(
                f"  ⚠ ASSUMPTION: vara '{atribuicao}' não encontrada no dropdown — "
                "scraping com o filtro atual da página (pre-navegue manualmente se CDP)",
                flush=True,
            )

        # ── Aplica filtros de data ──────────────────────────────────────────
        since_pje = _iso_to_pje_date(since)
        until_pje = _iso_to_pje_date(until)
        if since_pje or until_pje:
            date_result = await page.evaluate(JS_SET_DATE_FILTERS, since_pje, until_pje)
            print(f"  → datas: {date_result}", flush=True)
            # Clica em pesquisar se os filtros foram preenchidos
            if date_result.get("startFilled") or date_result.get("endFilled"):
                clicked = await page.evaluate(JS_CLICK_SEARCH_BUTTON)
                if clicked:
                    print(f"  → botão pesquisa: {clicked}", flush=True)
                    await asyncio.sleep(3)

        # ── Extrai linhas paginando ────────────────────────────────────────
        await page.evaluate(JS_RESET_TO_PAGE_1)
        await asyncio.sleep(2.5)

        for pg_num in range(1, page_limit + 1):
            # ASSUMPTION: tabela com TBODY_ID existe em qualquer página do painel
            rows = await page.evaluate(JS_EXTRACT_ALL_ROWS)
            if not rows:
                print(f"  → pág {pg_num}: tabela vazia ou não encontrada", flush=True)
                break

            print(f"  → pág {pg_num}: {len(rows)} linhas", flush=True)
            results.extend(rows)

            if heartbeat:
                heartbeat(len(results))

            if len(results) >= limit:
                results = results[:limit]
                break

            # Próxima página
            ok = await page.evaluate(JS_GOTO_PAGE, pg_num + 1)
            if not ok:
                break  # última página
            await asyncio.sleep(2.5)

    return results


def scrape_expedientes(
    sb,
    env: dict,
    atribuicao: str,
    since: str | None,
    until: str | None,
    limit: int,
    modo: str,
    heartbeat,
) -> list[dict]:
    """Wrapper síncrono. Fail-loud: se CDP off E login falhar, levanta exceção
    com 'Abra o PJe logado ou configure credenciais'."""
    return asyncio.run(
        _async_scrape_expedientes(env, atribuicao, since, until, limit, modo, heartbeat)
    )


# ─── CLI ──────────────────────────────────────────────────────────────────────

def parse_args(argv=None):
    p = argparse.ArgumentParser(
        description="Importa EXPEDIENTES do PJe → pje_import_staging"
    )
    p.add_argument("--job-id", type=int, required=True)
    p.add_argument(
        "--atribuicoes", required=True, help="CSV: VVD_CAMACARI,JURI_CAMACARI"
    )
    p.add_argument("--since", default=None, help="YYYY-MM-DD início do intervalo")
    p.add_argument("--until", default=None, help="YYYY-MM-DD fim do intervalo")
    p.add_argument("--limit", type=int, default=80)
    p.add_argument("--modo", choices=["cdp", "direct"], default="cdp")
    return p.parse_args(argv)


# ─── Orquestração principal ───────────────────────────────────────────────────

def run(args) -> None:
    """Executa o pipeline completo. Importações pesadas (varredura/Playwright)
    ocorrem aqui — NUNCA no topo do módulo."""
    _patch_varredura_path()
    from varredura_triagem import load_env, Supabase  # type: ignore

    # Subclasse local com métodos genéricos ausentes da varredura.Supabase
    class SupabaseExt(Supabase):
        def select(self, table: str, cols: str = "*") -> list:
            return self._req("GET", f"/rest/v1/{table}?select={cols}") or []

        def insert(self, table: str, data: dict) -> None:
            self._req("POST", f"/rest/v1/{table}", data, prefer="return=minimal")

        def update(self, table: str, filter_dict: dict, data: dict) -> None:
            qs = "&".join(f"{k}={v}" for k, v in filter_dict.items())
            self._req("PATCH", f"/rest/v1/{table}?{qs}", data, prefer="return=minimal")

    env = load_env()
    if not env.get("NEXT_PUBLIC_SUPABASE_URL") or not env.get("SUPABASE_SERVICE_ROLE_KEY"):
        raise RuntimeError(
            "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes no .env.local"
        )

    sb = SupabaseExt(env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])
    atribuicoes = [a.strip() for a in args.atribuicoes.split(",") if a.strip()]

    set_etapa(sb, args.job_id, "Conectando ao PJe…")
    ledger_index = load_ledger_index(sb)

    total = 0
    for atrib in atribuicoes:
        set_etapa(sb, args.job_id, f"{atrib}: abrindo expedientes…")
        expedientes = scrape_expedientes(
            sb,
            env,
            atrib,
            args.since,
            args.until,
            args.limit,
            args.modo,
            heartbeat=lambda n, a=atrib: set_etapa(
                sb, args.job_id, f"{a}: {n} expedientes…"
            ),
        )

        for exp in expedientes:
            ch = compute_content_hash(
                exp.get("processoNumero") or "",
                exp.get("pjeDocumentoId"),
                exp.get("conteudo", ""),
            )
            decisao = decide_layer_a(exp.get("pjeDocumentoId"), ch, ledger_index)
            sb.insert(
                "pje_import_staging",
                {
                    "job_id": args.job_id,
                    "atribuicao": atrib,
                    "processo_numero": exp.get("processoNumero"),
                    "assistido_nome": exp.get("assistidoNome"),
                    "ato": exp.get("ato"),
                    "tipo_documento": exp.get("tipoDocumento"),
                    "data_expedicao": exp.get("dataExpedicao"),
                    "data_intimacao": exp.get("dataIntimacao"),
                    "prazo": exp.get("prazo"),
                    "conteudo": exp.get("conteudo") or "",
                    "pje_documento_id": exp.get("pjeDocumentoId"),
                    "content_hash": ch,
                    "decisao": decisao,
                    "selected": decisao == "nova",
                },
            )
            # Bump last_seen_at no ledger se já existe (Layer-A hit)
            if decisao != "nova":
                _bump_ledger_last_seen(sb, exp.get("pjeDocumentoId"), ch, args.job_id)
            total += 1

    sb.update(
        "claude_code_tasks",
        {"id": "eq.%d" % args.job_id},
        {
            "status": "completed",
            "etapa": "Concluído",
            "resultado": {"raspadas": total, "atribuicoes": atribuicoes},
        },
    )
    print(f"[ok] {total} expediente(s) importados para staging.", flush=True)


def main(argv=None) -> None:
    args = parse_args(argv)
    try:
        run(args)
    except Exception as e:
        # fail-loud: marca task como failed
        try:
            _patch_varredura_path()
            from varredura_triagem import load_env, Supabase  # type: ignore

            class _SBExt(Supabase):
                def update(self, table: str, filter_dict: dict, data: dict) -> None:
                    qs = "&".join(f"{k}={v}" for k, v in filter_dict.items())
                    self._req("PATCH", f"/rest/v1/{table}?{qs}", data, prefer="return=minimal")

            env = load_env()
            sb = _SBExt(env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])
            # Se o erro veio do caminho CDP-off / login falhou, a spec exige
            # que `etapa` seja exatamente essa frase (lida pelo daemon/UI).
            etapa_falha = (
                "Abra o PJe logado ou configure credenciais"
                if "Abra o PJe logado" in str(e)
                else "Falha na importação"
            )
            sb.update(
                "claude_code_tasks",
                {"id": "eq.%d" % args.job_id},
                {
                    "status": "failed",
                    "erro": str(e)[:500],
                    "etapa": etapa_falha,
                },
            )
        except Exception as e2:
            print(f"ERRO ao gravar falha no Supabase: {e2}", file=sys.stderr)
        print(f"ERRO: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
