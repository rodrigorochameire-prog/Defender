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

NAVEGAÇÃO
---------
Usa drill-down em ÁRVORE clicando por TEXTO (IDs JSF são auto-gerados e
instáveis). Sequência: aba "Expedientes" → Situação → Comarca → Unidade/Vara.
IDs de JSF NUNCA são usados para navegação.

EXTRAÇÃO
--------
Tabela formExpedientes:tbExpedientes:tb, rows tr.rich-table-row.
rowId extraído do innerHTML como chave estável de expediente (pjeDocumentoId).
Células: cell[0]=ação, cell[1]=assistido+ato+id+meio+data, cell[2]=classe+CNJ+polos.
Parsing feito em Python (mais robusto que JS para regex complexos).
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import os
import re
import sys
import time
from datetime import datetime, timezone

CDP_URL = "http://127.0.0.1:9222"
PJE_BASE = "https://pje.tjba.jus.br/pje"
PANEL_URL = f"{PJE_BASE}/Painel/painel_usuario/advogado.seam"

# ─── Mapeamento atribuição → (comarca, unidade) para navegação em árvore ─────
SITUACAO_PADRAO = "Pendentes de ciência ou de resposta"

ATRIB_UNIDADE: dict[str, tuple[str, str]] = {
    "VVD_CAMACARI":  ("CAMAÇARI", "Vara de Violência doméstica"),
    "JURI_CAMACARI": ("CAMAÇARI", "Vara do Júri e Execuções Penais"),
}


# ─── sys.path helper (lazy, só usa stdlib) ────────────────────────────────────

def _patch_varredura_path() -> None:
    """Insere .claude/skills/varredura-triagem/scripts/ no sys.path, uma vez."""
    varredura_dir = os.path.normpath(
        os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "..", "..", "varredura-triagem", "scripts",
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


# ─── JS constants para navegação e extração DOM ──────────────────────────────
# Apenas o ID da tabela e helpers de paginação — confirmados pelo varredura_triagem.py.
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

# Extração bruta das células — parsing real feito em Python (_parse_row).
# rowId extraído do innerHTML como chave estável do expediente (pjeDocumentoId).
# Layout verificado ao vivo: cell[0]=ação, cell[1]=assistido+ato+id+meio+data,
# cell[2]=classe+CNJ+polo_ativo+" X "+polo_passivo.
JS_EXTRACT_ROWS = r"""() => {
  const tbody = document.getElementById('formExpedientes:tbExpedientes:tb');
  if (!tbody) return [];
  const rows = [];
  for (const row of tbody.querySelectorAll('tr.rich-table-row')) {
    const m = row.innerHTML.match(/formExpedientes:tbExpedientes:(\d+):/);
    const rowId = m ? m[1] : null;
    const cells = [...row.children];
    const cellText = i => (cells[i] ? (cells[i].innerText || cells[i].textContent || '').trim() : '');
    rows.push({
      rowId,
      cell0: cellText(0),
      cell1: cellText(1),
      cell2: cellText(2),
    });
  }
  return rows;
}"""


# ─── Data helpers ─────────────────────────────────────────────────────────────

def _pje_datetime_to_iso(s: str | None) -> str | None:
    """Converte string de data/hora do PJe para ISO compatível com colunas timestamp.

    Formatos aceitos:
      "DD/MM/YYYY"       → "YYYY-MM-DDTHH:MM:00" (meia-noite local)
      "DD/MM/YYYY HH:MM" → "YYYY-MM-DDTHH:MM:00"

    Retorna None para entrada vazia, None ou não parseável. Nunca levanta exceção.
    """
    if not s:
        return None
    s = s.strip()
    if not s:
        return None
    # Tenta com hora primeiro
    try:
        dt = datetime.strptime(s, "%d/%m/%Y %H:%M")
        return dt.strftime("%Y-%m-%dT%H:%M:00")
    except ValueError:
        pass
    # Tenta só data
    try:
        dt = datetime.strptime(s, "%d/%m/%Y")
        return dt.strftime("%Y-%m-%dT00:00:00")
    except ValueError:
        pass
    return None


def _pje_prazo_to_date(s: str | None) -> str | None:
    """Converte célula de prazo para ISO date (YYYY-MM-DD) se for DD/MM/YYYY.

    Se a célula contiver um número de dias (ex: "10", "30") ou qualquer valor
    que não seja uma data reconhecível, retorna None — NUNCA fabrica um prazo.
    Isso evita inserir datas falsas na coluna `date` do banco.
    """
    if not s:
        return None
    s = s.strip()
    try:
        dt = datetime.strptime(s, "%d/%m/%Y")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        # Número de dias ou formato desconhecido — descarta
        return None


# ─── Parsing de linha bruta extraída pelo JS ─────────────────────────────────

def _parse_row(raw: dict) -> dict:
    """Converte dict bruto {rowId, cell0, cell1, cell2} em dict com as chaves
    esperadas por run(): processoNumero, assistidoNome, ato, tipoDocumento,
    dataExpedicao, dataIntimacao, prazo, conteudo, pjeDocumentoId.

    cell1 layout: "{ASSISTIDO} {TipoAto} ({rowId}) {Meio} ({DD/MM/YYYY HH:MM...})"
    cell2 layout: "{CLASSE} {CNJ} {POLO_ATIVO} X {POLO_PASSIVO}"
    """
    row_id = raw.get("rowId") or ""
    cell1 = (raw.get("cell1") or "").strip()
    cell2 = (raw.get("cell2") or "").strip()

    # processoNumero: número CNJ de cell2
    cnj_match = re.search(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}", cell2)
    processo_numero = cnj_match.group(0) if cnj_match else None

    # tipoProcesso/classe: token(s) de cell2 antes do CNJ
    tipo_processo = None
    if cnj_match and cell2:
        prefix_c2 = cell2[: cnj_match.start()].strip()
        tokens = prefix_c2.split()
        tipo_processo = tokens[0] if tokens else None

    def _collapse(s: str | None) -> str | None:
        if not s:
            return None
        return " ".join(s.split()) or None

    # assistidoNome: polo passivo = parte APÓS o último " X " em cell2.
    # A célula é multilinha ("NOME\n/VARA...\nÚltimo movimento:..."); só a
    # PRIMEIRA linha é o nome — as demais são órgão e último movimento.
    assistido_nome: str | None = None
    if " X " in cell2:
        passivo = cell2.rsplit(" X ", 1)[1]
        assistido_nome = _collapse(passivo.split("\n", 1)[0])
    # Fallback: 1ª linha de cell1 (intimado), quando não há polo passivo.
    if not assistido_nome and cell1:
        assistido_nome = _collapse(cell1.split("\n", 1)[0])

    # ato / tipoDocumento: o tipo do expediente em cell1.
    # cell1 = "{NOME}\n{TipoAto} ({rowId}) {Meio} ({data})". O segmento antes de
    # "({rowId})" é "NOME\n{TipoAto}"; removendo a 1ª linha (nome) sobra o tipo.
    ato: str | None = None
    if row_id and f"({row_id})" in cell1:
        before_id = cell1[: cell1.index(f"({row_id})")]
        if "\n" in before_id:
            ato = _collapse(before_id.split("\n", 1)[1])  # descarta a linha do nome
        else:
            pole = assistido_nome if (" X " in cell2 and assistido_nome) else None
            seg = before_id
            if pole and _collapse(seg) and _collapse(seg).startswith(pole):
                seg = _collapse(seg)[len(pole):]
            ato = _collapse(seg)
    else:
        ato = _collapse(cell1)

    tipo_documento = ato

    # dataExpedicao: primeira ocorrência de DD/MM/YYYY (HH:MM)? em cell1
    date_match = re.search(r"\d{2}/\d{2}/\d{4}(?: \d{2}:\d{2})?", cell1)
    data_expedicao = date_match.group(0) if date_match else None

    # conteudo: cell1 + " | " + cell2 (sinal real para o hash)
    conteudo = f"{cell1} | {cell2}" if cell2 else cell1

    return {
        "processoNumero": processo_numero,
        "assistidoNome": assistido_nome,
        "ato": ato,
        "tipoDocumento": tipo_documento,
        "dataExpedicao": data_expedicao,
        "dataIntimacao": None,
        "prazo": None,
        "conteudo": conteudo,
        "pjeDocumentoId": row_id if row_id else None,
    }


def _filter_by_date(
    rows: list[dict],
    since: str | None,
    until: str | None,
) -> list[dict]:
    """Pós-filtra rows por dataExpedicao (DD/MM/YYYY) contra [since, until] (YYYY-MM-DD).
    Rows sem data parseável são mantidas (conservador).
    """
    if not since and not until:
        return rows

    def _to_iso_date(s: str | None) -> str | None:
        if not s:
            return None
        m = re.match(r"(\d{2})/(\d{2})/(\d{4})", s.strip())
        return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else None

    result = []
    for row in rows:
        d = _to_iso_date(row.get("dataExpedicao"))
        if d is None:
            result.append(row)  # data ausente — mantém (conservador)
        elif since and d < since:
            continue
        elif until and d > until:
            continue
        else:
            result.append(row)
    return result


# ─── Live scraper (Playwright — importado lazily) ─────────────────────────────

# Tempo máximo de espera pelo login manual do usuário na janela do Chromium.
LOGIN_WAIT_TIMEOUT_S = 8 * 60


async def _is_logged_in(page) -> bool:
    """Inspeciona a página ATUAL (sem navegar) e decide se há sessão PJe ativa.
    Logado = não está na tela de login e não há campo de usuário visível."""
    try:
        url = page.url or ""
        if "login.seam" in url:
            return False
        # O formulário de login expõe input[name=username]; ausência => logado.
        return await page.query_selector("input[name=username]") is None
    except Exception:
        return False


async def _ensure_logged_in(ctx, status_cb):
    """Modo CDP: garante uma página logada no PJe. Se não houver sessão, abre a
    tela de login na janela do Chromium gerenciado e ESPERA o usuário logar,
    detectando automaticamente quando a sessão fica ativa. Retorna a página."""
    page = ctx.pages[0] if ctx.pages else await ctx.new_page()
    try:
        await page.bring_to_front()
    except Exception:
        pass

    # Checagem rápida: tenta o painel; se já logado, segue direto.
    try:
        await page.goto(PANEL_URL, wait_until="domcontentloaded", timeout=30000)
    except Exception:
        pass
    if await _is_logged_in(page):
        return page

    # Sem sessão: leva o usuário para o login e aguarda (auto-detecção).
    if status_cb:
        status_cb("Aguardando login no PJe… faça login na janela do Chromium")
    try:
        await page.goto(f"{PJE_BASE}/login.seam", wait_until="domcontentloaded", timeout=30000)
        await page.bring_to_front()
    except Exception:
        pass

    deadline = time.monotonic() + LOGIN_WAIT_TIMEOUT_S
    while time.monotonic() < deadline:
        await asyncio.sleep(3)
        if await _is_logged_in(page):
            if status_cb:
                status_cb("Login detectado — iniciando importação…")
            try:
                await page.goto(PANEL_URL, wait_until="domcontentloaded", timeout=30000)
            except Exception:
                pass
            return page

    raise RuntimeError(
        "Abra o PJe logado ou configure credenciais "
        "(tempo de espera pelo login esgotado)"
    )


# ─── Navegação em árvore (situação → comarca → vara) ─────────────────────────

async def _wait_text(page, txt: str, timeout: float = 20):
    """Aguarda até que um elemento com o texto `txt` fique visível na página.
    Retorna o Locator (.first) se encontrado, ou None em caso de timeout.
    Usa polling de 0.5s com page.get_by_text(exact=False).
    """
    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout
    while loop.time() < deadline:
        loc = page.get_by_text(txt, exact=False).first
        try:
            cnt = await loc.count()
            if cnt > 0 and await loc.is_visible():
                return loc
        except Exception:
            pass
        await asyncio.sleep(0.5)
    return None


async def _navigate_to_unidade(page, atribuicao: str, situacao: str, status_cb) -> None:
    """Navega o painel do defensor até a lista de expedientes da unidade mapeada.

    Fluxo (drill-down por texto, sem IDs JSF):
      1. Aba "Expedientes" — clica se "Pendentes de ciência" não estiver visível.
      2. Situação — clica em `situacao` (ex: "Pendentes de ciência ou de resposta").
      3. Comarca — clica no texto da comarca (ex: "CAMAÇARI").
      4. Unidade/Vara — clica no texto da vara.
      Aguarda tabela populada (até 25s) antes de retornar.

    Raises RuntimeError se atribuição não mapeada ou qualquer passo falhar.
    """
    mapping = ATRIB_UNIDADE.get(atribuicao)
    if mapping is None:
        raise RuntimeError(
            f"atribuição não mapeada para unidade do PJe: {atribuicao}"
        )
    comarca, unidade_txt = mapping

    if status_cb:
        status_cb("Abrindo expedientes…")

    # Passo 1: aba Expedientes
    sentinel = await _wait_text(page, "Pendentes de ciência", timeout=3)
    if sentinel is None:
        exp_tab = await _wait_text(page, "Expedientes", timeout=20)
        if exp_tab is None:
            raise RuntimeError(
                "Aba 'Expedientes' não encontrada no painel — "
                "verifique se está no painel do defensor (advogado.seam)"
            )
        await exp_tab.click()
        # Aguarda conteúdo da aba aparecer
        await _wait_text(page, "Pendentes de ciência", timeout=20)

    # Passo 2: Situação
    sit_loc = await _wait_text(page, situacao, timeout=20)
    if sit_loc is None:
        raise RuntimeError(
            f"Situação '{situacao}' não encontrada após abrir aba Expedientes"
        )
    await sit_loc.click()

    # Passo 3: Comarca
    if status_cb:
        status_cb(f"{comarca} ▸ {unidade_txt}…")
    com_loc = await _wait_text(page, comarca, timeout=20)
    if com_loc is None:
        raise RuntimeError(
            f"Comarca '{comarca}' não encontrada após selecionar situação"
        )
    await com_loc.click()

    # Passo 4: Vara/Unidade
    vara_loc = await _wait_text(page, unidade_txt, timeout=20)
    if vara_loc is None:
        raise RuntimeError(
            f"Unidade '{unidade_txt}' não encontrada após selecionar comarca '{comarca}'"
        )
    await vara_loc.click()

    # Aguarda tabela de expedientes ser populada (até 25s)
    loop = asyncio.get_running_loop()
    deadline = loop.time() + 25
    while loop.time() < deadline:
        has_rows = await page.evaluate(
            f"""() => {{
              const tbody = document.getElementById('{TBODY_ID}');
              return !!(tbody && tbody.querySelectorAll('tr.rich-table-row').length > 0);
            }}"""
        )
        if has_rows:
            break
        await asyncio.sleep(0.5)
    # Se tabela ainda vazia não levantamos exceção — pode ser que não haja expedientes.


# ─── Scraper principal ────────────────────────────────────────────────────────

async def _async_scrape_expedientes(
    env: dict,
    atribuicao: str,
    since: str | None,
    until: str | None,
    limit: int,
    modo: str,
    heartbeat,
    status_cb=None,
) -> list[dict]:
    """Navega o painel do PJe via CDP ou login direto e extrai linhas de
    EXPEDIENTES para a atribuição informada.

    Navegação: drill-down em árvore por texto (situação→comarca→vara).
    Extração: JS_EXTRACT_ROWS + _parse_row em Python.
    Filtro de data: pós-filtro em Python (sem UI de filtro de datas no fluxo).
    Paginação: RichFaces scroller (JS_RESET_TO_PAGE_1 / JS_GOTO_PAGE).
    """
    try:
        from patchright.async_api import async_playwright  # type: ignore
    except ImportError:
        raise RuntimeError(
            "patchright não instalado — ative o .venv do enrichment-engine"
        )

    # Estimativa conservadora de páginas (40 rows/page)
    page_limit = max(1, (limit // 40) + 2)
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
            # Abre o PJe na janela gerenciada e espera o usuário logar (auto-detecta).
            page = await _ensure_logged_in(ctx, status_cb)
            print(
                f"[cdp] sessão ativa — painel: {page.url[:70]}",
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

        # ── Garante que estamos no painel ─────────────────────────────────
        if "advogado.seam" not in page.url:
            print(f"  → navegando para painel: {PANEL_URL}", flush=True)
            await page.goto(PANEL_URL, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(3)

        # ── Navegação em árvore: situação → comarca → vara ─────────────────
        await _navigate_to_unidade(page, atribuicao, SITUACAO_PADRAO, status_cb)

        # ── Extrai linhas paginando ────────────────────────────────────────
        await page.evaluate(JS_RESET_TO_PAGE_1)
        await asyncio.sleep(2.5)

        raw_results: list[dict] = []
        for pg_num in range(1, page_limit + 1):
            raw_rows = await page.evaluate(JS_EXTRACT_ROWS)
            if not raw_rows:
                print(f"  → pág {pg_num}: tabela vazia ou não encontrada", flush=True)
                break

            print(f"  → pág {pg_num}: {len(raw_rows)} linhas", flush=True)
            raw_results.extend(raw_rows)

            if heartbeat:
                heartbeat(len(raw_results))

            if len(raw_results) >= limit:
                raw_results = raw_results[:limit]
                break

            # Próxima página
            ok = await page.evaluate(JS_GOTO_PAGE, pg_num + 1)
            if not ok:
                break  # última página
            await asyncio.sleep(2.5)

        # ── Parsing em Python ──────────────────────────────────────────────
        results = [_parse_row(r) for r in raw_results]

        # ── Pós-filtro de datas ───────────────────────────────────────────
        results = _filter_by_date(results, since, until)

        # Trunca ao limite após filtro
        results = results[:limit]

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
    status_cb=None,
) -> list[dict]:
    """Wrapper síncrono. Fail-loud: se CDP off E login falhar, levanta exceção
    com 'Abra o PJe logado ou configure credenciais'."""
    return asyncio.run(
        _async_scrape_expedientes(
            env, atribuicao, since, until, limit, modo, heartbeat, status_cb
        )
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
            status_cb=lambda msg: set_etapa(sb, args.job_id, msg),
        )

        for exp in expedientes:
            # Trata pjeDocumentoId vazio/null como None para chave forte do ledger (spec §5).
            pje_doc_id = exp.get("pjeDocumentoId") or None
            ch = compute_content_hash(
                exp.get("processoNumero") or "",
                pje_doc_id,
                exp.get("conteudo") or "",
            )
            decisao = decide_layer_a(pje_doc_id, ch, ledger_index)
            sb.insert(
                "pje_import_staging",
                {
                    "job_id": args.job_id,
                    "atribuicao": atrib,
                    "processo_numero": exp.get("processoNumero"),
                    "assistido_nome": exp.get("assistidoNome"),
                    "ato": exp.get("ato"),
                    "tipo_documento": exp.get("tipoDocumento"),
                    # Converte datas PJe (DD/MM/YYYY) para ISO antes de inserir no Postgres.
                    # Colunas timestamp rejeitam o formato brasileiro; None insere NULL.
                    "data_expedicao": _pje_datetime_to_iso(exp.get("dataExpedicao")),
                    "data_intimacao": _pje_datetime_to_iso(exp.get("dataIntimacao")),
                    # Coluna date: converte DD/MM/YYYY → YYYY-MM-DD ou NULL se for nº de dias.
                    "prazo": _pje_prazo_to_date(exp.get("prazo")),
                    "conteudo": exp.get("conteudo") or "",
                    "pje_documento_id": pje_doc_id,
                    "content_hash": ch,
                    "decisao": decisao,
                    "selected": decisao == "nova",
                },
            )
            # Bump last_seen_at no ledger se já existe (Layer-A hit)
            if decisao != "nova":
                _bump_ledger_last_seen(sb, pje_doc_id, ch, args.job_id)
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
