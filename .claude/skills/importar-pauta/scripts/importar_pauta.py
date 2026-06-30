#!/usr/bin/env python3
"""Worker (browser lane): raspa a PAUTA DE AUDIÊNCIAS do PJe TJBA
(ProcessoAudiencia/PautaAudiencia/listView.seam) por atribuição e grava em
pauta_import_staging (NUNCA em audiencias/assistidos/processos).

Infraestrutura espelhada de pje_intimacoes_import.py:
- load_env / Supabase via varredura_triagem (lazy import em run())
- CDP attach: connect_over_cdp para http://127.0.0.1:9222
- set_etapa heartbeat em claude_code_tasks
- _poll / _js_click_text / _text_present / _js_click_text (clique por texto via JS)
- Paginação RichFaces: JS_RESET_TO_PAGE_1 / JS_GOTO_PAGE
- Modal-dismissal: _dismiss_pauta_modal (X → Esc → poll) — mesmo padrão de
  _dismiss_distribuir_modal do worker de intimações

REGRA INVIOLÁVEL: este worker NUNCA escreve em audiencias, assistidos ou
processos. Só grava em pauta_import_staging e claude_code_tasks.

CROSS-DIRECTORY IMPORT
----------------------
Este script vive em .claude/skills/importar-pauta/scripts/ mas importa de
.claude/skills/varredura-triagem/scripts/. O patch de sys.path ocorre DENTRO
de run() e main() (lazy), para que as importações puras no topo do módulo não
arrastem Playwright/patchright.

NAVEGAÇÃO
---------
Ao contrário do worker de intimações (árvore no painel), aqui navegamos
diretamente para PAUTA_URL e aplicamos filtros de formulário (JSF selects +
checkboxes + date inputs + botão pesquisa). Cada passo de filtro é isolado
em helper próprio marcado com # TODO: validar seletor ao vivo.
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
PAUTA_URL = f"{PJE_BASE}/ProcessoAudiencia/PautaAudiencia/listView.seam"

# Mapeamento atribuição → (comarca, unidade) — MESMO mapa do worker de
# intimações (confirmado lendo pje_intimacoes_import.py).
ATRIB_UNIDADE: dict[str, tuple[str, str]] = {
    "VVD_CAMACARI":  ("CAMAÇARI", "Vara de Violência doméstica"),
    "JURI_CAMACARI": ("CAMAÇARI", "Vara do Júri e Execuções Penais"),
}

# Tempo máximo de espera pelo login manual do usuário na janela do Chromium.
LOGIN_WAIT_TIMEOUT_S = 8 * 60


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

def compute_pauta_hash(processo: str, data_iso: str, tipo: str, situacao: str) -> str:
    """sha256(processo|data_iso|tipo_normalizado|situacao_normalizado) hexdigest.

    Campos normalizados: strip + lowercase.
    """
    payload = "%s|%s|%s|%s" % (
        processo or "",
        data_iso or "",
        (tipo or "").strip().lower(),
        (situacao or "").strip().lower(),
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def parse_data_hora(s: str | None) -> tuple[str | None, str | None]:
    """Converte string de data/hora do PJe para (iso, hhmm) ou (None, None).

    Formatos aceitos:
      "DD/MM/YY HH:MM"   → ("YYYY-MM-DDTHH:MM:00", "HH:MM")  (2 dígitos → 20xx)
      "DD/MM/YYYY HH:MM" → ("YYYY-MM-DDTHH:MM:00", "HH:MM")

    Retorna (None, None) para entrada vazia, None ou não parseável.
    Nunca levanta exceção.
    """
    if not s:
        return (None, None)
    m = re.search(r"(\d{2})/(\d{2})/(\d{2,4})\s+(\d{2}):(\d{2})", s.strip())
    if not m:
        return (None, None)
    day, month, year_raw, hh, mm = m.groups()
    year = ("20" + year_raw) if len(year_raw) == 2 else year_raw
    iso = f"{year}-{month}-{day}T{hh}:{mm}:00"
    hhmm = f"{hh}:{mm}"
    return (iso, hhmm)


def normaliza_cnj(s: str | None) -> str:
    """Colapsa whitespace e rejunta CNJ partido por quebra de linha.

    Exemplo: "8009660-\\n70.2025.8.05.0039" → "8009660-70.2025.8.05.0039"

    A divisão mais comum ocorre no hífen: "NNNNNNN-\\nNN.AAAA.…". O regex
    abaixo cuida desse padrão; whitespace geral residual é colapsado depois.
    """
    if not s:
        return ""
    # Rejunta dígito + hífen + whitespace/newline + dígito (split no hífen do CNJ)
    s = re.sub(r"(\d+)-\s*\n\s*(\d)", r"\1-\2", s)
    # Rejunta dígito + ponto + whitespace/newline + dígito (split em outro ponto do CNJ)
    s = re.sub(r"(\d)\.?\s*\n\s*(\d)", r"\1.\2", s)
    # Colapsa whitespace residual e strip
    s = re.sub(r"[ \t]+", " ", s).strip()
    return s


# ─── Supabase helpers (usam SupabaseExt criado dentro de run()) ───────────────

def set_etapa(sb, job_id: int, texto: str) -> None:
    sb.update("claude_code_tasks", {"id": "eq.%d" % job_id}, {"etapa": texto})


# ─── JS constants para paginação (espelhados do worker de intimações) ─────────

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

# Extração bruta das linhas da pauta.
# Layout da tabela listView.seam (8 colunas):
#   td[0]=Data/hora  td[1]=Processo  td[2]=Órgão julgador
#   td[3]=Partes     td[4]=Classe    td[5]=Tipo de audiência
#   td[6]=Sala       td[7]=Situação
# TODO: validar seletor ao vivo — o id/classe do tbody pode diferir de
#   rich-table-row. Alternativa: tr[class*='row'] ou tr:not([class*='header'])
JS_EXTRACT_PAUTA_ROWS = r"""() => {
  // Validado ao vivo (2026-06-29) em PautaAudiencia/listView.seam:
  // as linhas de dados são tr.rich-table-row; a 1ª célula (índice 0) é a coluna
  // de ação (vazia/checkbox), então os campos começam no índice 1:
  //   [1]=Data/hora "DD/MM/YYYY HH:MM" · [2]=Processo · [3]=Órgão · [4]=Partes
  //   · [5]=Classe · [6]=Tipo · [7]=Sala · [8]=Situação
  const rows = [];
  for (const row of document.querySelectorAll('tr.rich-table-row')) {
    const cells = [...row.children];
    const cellText = i => (cells[i] ? (cells[i].innerText || cells[i].textContent || '').trim() : '');
    const dataHora = cellText(1);
    // só linhas de dados reais (têm data DD/MM/AAAA HH:MM na coluna 1)
    if (!/\d{2}\/\d{2}\/\d{2,4}\s+\d{2}:\d{2}/.test(dataHora)) continue;
    rows.push({
      dataHora,
      processo:  cellText(2),
      orgao:     cellText(3),
      partes:    cellText(4),
      classe:    cellText(5),
      tipo:      cellText(6),
      sala:      cellText(7),
      situacao:  cellText(8),
    });
  }
  return rows;
}"""

# ─── JS de normalização (sem acentos, minúsculo) — mesmo do worker intimações ─
_NORM_JS = "const norm=s=>(s||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/\\s+/g,' ').trim();"


# ─── wait/poll helpers (espelhados do worker de intimações) ──────────────────

async def _poll(page, check, timeout: float = 20.0, interval: float = 1.0) -> bool:
    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout
    while loop.time() < deadline:
        try:
            if await check():
                return True
        except Exception:
            pass
        await asyncio.sleep(interval)
    return False


async def _js_click_text(page, needle: str) -> bool:
    """Clica via JS o MENOR elemento visível cujo texto normalizado contém `needle`.
    Estendido do padrão de _js_click_text do worker de intimações (onclick A4J) —
    aqui inclui também `option,li` para os dropdowns/listas da pauta."""
    return await page.evaluate(
        "(needle) => {" + _NORM_JS + """
          const n = norm(needle);
          let best=null, bl=1e9;
          for (const el of document.querySelectorAll('a,span,td,option,li')) {
            const t = norm(el.textContent);
            if (t.includes(n)) { const r=el.getBoundingClientRect();
              if (r.width>0 && r.height>0 && t.length<bl) { best=el; bl=t.length; } }
          }
          if (best) { best.click(); return true; }
          return false;
        }""",
        needle,
    )


async def _text_present(page, needle: str) -> bool:
    return await page.evaluate(
        "(needle) => {" + _NORM_JS + """
          const n = norm(needle);
          return [...document.querySelectorAll('a,span,td,option')].some(el =>
            norm(el.textContent).includes(n) && el.getBoundingClientRect().width>0);
        }""",
        needle,
    )


# ─── Modal-dismissal (mesmo padrão de _dismiss_distribuir_modal) ─────────────

async def _dismiss_pauta_modal(page) -> str:
    """Fecha qualquer modal de alerta na página da pauta.

    Estratégia espelhada de _dismiss_distribuir_modal no worker de intimações:
    captura texto → clica X / botão fechar → Escape → poll até sumir.
    Retorna texto do modal (para log) ou "" se nenhum modal visível.
    """
    info = ""
    try:
        info = await page.evaluate(
            r"""() => {
              for (const el of document.querySelectorAll('div.rich-mpnl-panel, div[id*="modal"], div[role="dialog"], .ui-dialog')) {
                const t = (el.innerText || '').trim();
                const r = el.getBoundingClientRect();
                if (t && t.length < 300 && r.width > 0 && r.height > 0) {
                  return t.replace(/\s+/g, ' ').slice(0, 160);
                }
              }
              return '';
            }"""
        )
    except Exception:
        pass
    if not info:
        return ""
    for _ in range(3):
        try:
            await page.evaluate(
                r"""() => {
                  const cands = [...document.querySelectorAll('button, a, span, i, [role=button]')];
                  for (const el of cands) {
                    const t   = (el.textContent || '').trim();
                    const cls = (el.className || '') + ' ' + (el.getAttribute('aria-label') || '');
                    const r   = el.getBoundingClientRect();
                    if (r.width > 0 && r.height > 0 &&
                        (t === '×' || t === '✕' || t === 'x' ||
                         /close|fechar|closethick|ui-dialog-titlebar-close/i.test(cls))) {
                      el.click(); return true;
                    }
                  }
                  return false;
                }"""
            )
        except Exception:
            pass
        try:
            await page.keyboard.press("Escape")
        except Exception:
            pass
        await asyncio.sleep(0.6)
        gone = await page.evaluate(
            r"""() => {
              const els = document.querySelectorAll('div.rich-mpnl-panel, div[id*="modal"], div[role="dialog"], .ui-dialog');
              for (const el of els) {
                const r = el.getBoundingClientRect();
                if (r.width > 0 && r.height > 0) return false;
              }
              return true;
            }"""
        )
        if gone:
            break
    return info


# ─── Login helpers (espelhados do worker de intimações) ──────────────────────

async def _is_logged_in(page) -> bool:
    try:
        url = page.url or ""
        if "login.seam" in url:
            return False
        return await page.query_selector("input[name=username]") is None
    except Exception:
        return False


async def _ensure_logged_in(ctx, status_cb):
    """Modo CDP: garante sessão PJe ativa. Mesmo padrão do worker de intimações.
    Abre login.seam e aguarda login manual detectado automaticamente."""
    page = ctx.pages[0] if ctx.pages else await ctx.new_page()
    try:
        await page.bring_to_front()
    except Exception:
        pass
    try:
        await page.goto(PAUTA_URL, wait_until="domcontentloaded", timeout=30000)
    except Exception:
        pass
    if await _is_logged_in(page):
        return page

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
                status_cb("Login detectado — iniciando importação da pauta…")
            try:
                await page.goto(PAUTA_URL, wait_until="domcontentloaded", timeout=30000)
            except Exception:
                pass
            return page

    raise RuntimeError(
        "Abra o PJe logado ou configure credenciais "
        "(tempo de espera pelo login esgotado)"
    )


# ─── Helpers de filtro (cada um isolado — TODO: validar seletor ao vivo) ─────

async def _set_jurisdicao(page, comarca: str) -> bool:
    """Seleciona a Jurisdição (comarca) no formulário de filtro.

    # TODO: validar seletor ao vivo — o select pode ter id contendo
    # 'jurisdicao', 'comarca', 'localidade' ou similar. Alternativa: busca
    # por label 'Jurisdição' → label[for] → getElementById.
    """
    # Tenta primeiro via JS select + dispatchEvent, procurando pelo texto da comarca
    result = await page.evaluate(
        """([comarca]) => {
          // TODO: validar seletor ao vivo
          const SELECTORS = [
            'select[id*="jurisdicao"]',
            'select[id*="comarca"]',
            'select[id*="localidade"]',
            'select[name*="jurisdicao"]',
          ];
          for (const sel of SELECTORS) {
            const s = document.querySelector(sel);
            if (!s) continue;
            for (const opt of s.options) {
              const t = (opt.text || '').normalize('NFD')
                .replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
              if (t.includes(comarca.normalize('NFD')
                  .replace(/[\\u0300-\\u036f]/g, '').toLowerCase())) {
                s.value = opt.value;
                s.dispatchEvent(new Event('change', {bubbles: true}));
                s.dispatchEvent(new Event('blur', {bubbles: true}));
                return true;
              }
            }
          }
          return false;
        }""",
        [comarca],
    )
    if not result:
        # Fallback: clique por texto visível (AJAX dropdown)
        result = await _js_click_text(page, comarca)
    return result


async def _set_orgao_julgador(page, unidade: str) -> bool:
    """Seleciona o Órgão julgador (unidade/vara) no formulário de filtro.

    # TODO: validar seletor ao vivo — o select pode ter id contendo
    # 'orgaoJulgador', 'orgao', 'unidade', 'vara' ou similar. O preenchimento
    # deste campo pode depender de AJAX disparado pela seleção da Jurisdição;
    # se o campo estiver desabilitado, aguardar AJAX antes de selecionar.
    """
    result = await page.evaluate(
        """([unidade]) => {
          // TODO: validar seletor ao vivo
          const SELECTORS = [
            'select[id*="orgaoJulgador"]',
            'select[id*="orgao"]',
            'select[id*="unidade"]',
            'select[id*="vara"]',
            'select[name*="orgaoJulgador"]',
          ];
          for (const sel of SELECTORS) {
            const s = document.querySelector(sel);
            if (!s) continue;
            for (const opt of s.options) {
              const t = (opt.text || '').normalize('NFD')
                .replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
              if (t.includes(unidade.normalize('NFD')
                  .replace(/[\\u0300-\\u036f]/g, '').toLowerCase())) {
                s.value = opt.value;
                s.dispatchEvent(new Event('change', {bubbles: true}));
                s.dispatchEvent(new Event('blur', {bubbles: true}));
                return true;
              }
            }
          }
          return false;
        }""",
        [unidade],
    )
    if not result:
        result = await _js_click_text(page, unidade)
    return result


async def _set_situacoes_todas(page) -> bool:
    """Marca o checkbox 'Todas' de situações.

    # TODO: validar seletor ao vivo — o checkbox pode ter id/name contendo
    # 'todas', 'situacaoTodas', 'chkTodas' ou ser um link de texto 'Todas'.
    # Alternativas: buscar por label text='Todas', ou input[type=checkbox]
    # próximo ao texto 'Situações'.
    """
    result = await page.evaluate(
        """() => {
          // Validado ao vivo (2026-06-29): o checkbox "Todas" é
          // processoAudienciaSearchForm:listaSituacoesT (sufixo ":listaSituacoesT").
          const SELECTORS = [
            'input[id$=":listaSituacoesT"]',
            'input[id$="listaSituacoesT"]',
            'input[id*="todas"]',
            'input[id*="Todas"]',
            'input[id*="situacaoTodas"]',
          ];
          for (const sel of SELECTORS) {
            const cb = document.querySelector(sel);
            if (cb && cb.type === 'checkbox') {
              if (!cb.checked) {
                cb.checked = true;
                cb.dispatchEvent(new Event('change', {bubbles: true}));
                cb.dispatchEvent(new Event('click', {bubbles: true}));
              }
              return true;
            }
          }
          // Fallback: procurar checkbox próximo a label/span com texto 'Todas'
          for (const el of document.querySelectorAll('label, span, td')) {
            const t = (el.textContent || '').trim();
            if (t === 'Todas' || t === 'Todas as situações') {
              const cb = el.querySelector('input[type=checkbox]') ||
                         el.previousElementSibling;
              if (cb && cb.type === 'checkbox') {
                if (!cb.checked) {
                  cb.checked = true;
                  cb.dispatchEvent(new Event('change', {bubbles: true}));
                }
                return true;
              }
            }
          }
          return false;
        }"""
    )
    return bool(result)


async def _set_periodo(page, since: str | None, until: str | None) -> None:
    """Preenche as datas Período De / Até no formulário.

    # TODO: validar seletor ao vivo — os inputs de data podem ter id/name
    # contendo 'dataInicio', 'dtInicio', 'dataFim', 'dtFim', 'periodoInicio',
    # 'periodoFim' ou similar. O formato esperado pelo PJe é DD/MM/YYYY.
    # Verificar se o campo aceita digitação direta ou requer date-picker.
    """
    def _iso_to_br(iso: str | None) -> str | None:
        if not iso:
            return None
        m = re.match(r"(\d{4})-(\d{2})-(\d{2})", iso)
        if m:
            return f"{m.group(3)}/{m.group(2)}/{m.group(1)}"
        return iso

    since_br = _iso_to_br(since)
    until_br = _iso_to_br(until)

    await page.evaluate(
        """([since_br, until_br]) => {
          // Validado ao vivo (2026-06-29): o período é um range RichFaces único
          // (dtInicioDecoration) com inputs From (De) e To (Até):
          //   ...:dtInicioFromFormInputDate  e  ...:dtInicioToFormInputDate
          const DE_SELECTORS = [
            'input[id$="dtInicioFromFormInputDate"]',
            'input[id*="dtInicioFrom"]',
            'input[id*="dataInicio"]',
          ];
          const ATE_SELECTORS = [
            'input[id$="dtInicioToFormInputDate"]',
            'input[id*="dtInicioTo"]',
            'input[id*="dataFim"]',
          ];
          function setInput(selectors, value) {
            if (!value) return;
            for (const sel of selectors) {
              const inp = document.querySelector(sel);
              if (inp) {
                inp.value = value;
                inp.dispatchEvent(new Event('input', {bubbles: true}));
                inp.dispatchEvent(new Event('change', {bubbles: true}));
                inp.dispatchEvent(new Event('blur', {bubbles: true}));
                return;
              }
            }
          }
          setInput(DE_SELECTORS, since_br);
          setInput(ATE_SELECTORS, until_br);
        }""",
        [since_br, until_br],
    )


async def _click_pesquisar(page) -> bool:
    """Clica o botão de pesquisa/busca na página da pauta.

    # TODO: validar seletor ao vivo — o botão pode ter id/value/text contendo
    # 'Pesquisar', 'Pesquisa', 'Buscar', 'Filtrar' ou ser um input[type=submit].
    # Verificar se o clique dispara AJAX (RichFaces A4J) ou submit normal.
    """
    result = await page.evaluate(
        r"""() => {
          // Validado ao vivo (2026-06-29): o gatilho REAL da busca \u00e9 o input
          // <input id="...:searchButton" value="Pesquisar"
          //   onclick="showLoading(); A4J.AJAX.Submit('processoAudienciaSearchForm'...)">
          // Fica ABAIXO da dobra (y~1264). N\u00c3O confundir com os <a>"Pesquisar"
          // de navega\u00e7\u00e3o (menu / breadcrumb btn-voltar fora da tela) nem com a
          // aba "PESQUISA" \u2014 nenhum deles dispara a consulta.
          // el.click() ignora posi\u00e7\u00e3o e dispara o onclick a4j.
          const byId = document.querySelector('input[id$=":searchButton"]')
                    || document.getElementById('processoAudienciaSearchForm:searchButton');
          if (byId) { byId.click(); return true; }
          // Fallback: input/submit cujo onclick cont\u00e9m A4J.AJAX.Submit do form de busca
          for (const el of document.querySelectorAll('input[type=submit], input[type=button], button')) {
            const oc = el.getAttribute('onclick') || '';
            const v  = (el.value || el.textContent || '').trim().toLowerCase();
            if (oc.includes("A4J.AJAX.Submit('processoAudienciaSearchForm'") || v === 'pesquisar') {
              el.click(); return true;
            }
          }
          return false;
        }"""
    )
    return bool(result)


async def _table_loaded(page) -> bool:
    """True quando a tabela da pauta tiver pelo menos 1 linha ou o texto
    'Nenhum registro encontrado' estiver visível (= resultado limpo).

    # TODO: validar seletor ao vivo — o seletor do tbody pode diferir.
    """
    return await page.evaluate(
        r"""() => {
          // Validado ao vivo (2026-06-29): linhas de dados são tr.rich-table-row
          // com a data "DD/MM/AAAA HH:MM" na 2ª célula (índice 1).
          for (const row of document.querySelectorAll('tr.rich-table-row')) {
            const c1 = row.children[1];
            if (c1 && /\d{2}\/\d{2}\/\d{2,4}\s+\d{2}:\d{2}/.test(c1.innerText || '')) return true;
          }
          // Mensagem de vazio também significa que a pesquisa concluiu.
          // Normaliza acentos (NFD + strip combining marks) p/ que 'audiência'
          // case com 'audiencia' — consistente com _NORM_JS.
          const page_text = (document.body.innerText || '')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          return page_text.includes('nenhum registro') || page_text.includes('nenhuma audiencia');
        }"""
    )


async def _first_pauta_row_text(page) -> str:
    """Texto da primeira célula de dados — usado para detectar troca de página."""
    return await page.evaluate(
        r"""() => {
          const tbody =
            document.querySelector('table.rich-table tbody') ||
            document.querySelector('tbody.rich-table-body') ||
            document.querySelector('[id*="tbAudiencias"]') ||
            document.querySelector('[id*="tbPauta"]');
          if (!tbody) return '';
          const row = tbody.querySelector('tr.rich-table-row, tr[class*="row"]');
          if (!row) return '';
          return (row.children[0] ? (row.children[0].innerText || '').trim() : '');
        }"""
    )


# ─── Scraper principal ────────────────────────────────────────────────────────

async def _async_scrape_pauta(
    atribuicao: str,
    since: str | None,
    until: str | None,
    modo: str,
    env: dict,
    heartbeat,
    status_cb=None,
) -> list[dict]:
    """Navega a página da pauta, aplica filtros e extrai todas as linhas.

    Retorna lista de dicts com as 8 colunas brutas + campo 'atribuicao'.
    """
    try:
        from patchright.async_api import async_playwright  # type: ignore
    except ImportError:
        raise RuntimeError(
            "patchright não instalado — ative o .venv do enrichment-engine"
        )

    mapping = ATRIB_UNIDADE.get(atribuicao)
    if mapping is None:
        raise RuntimeError(f"atribuição não mapeada: {atribuicao}")
    comarca, unidade = mapping

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
            page = await _ensure_logged_in(ctx, status_cb)
            print(f"[cdp] sessão ativa: {page.url[:70]}", flush=True)
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
            await asyncio.sleep(3)

        # ── Navega para a página da pauta ─────────────────────────────────
        if status_cb:
            status_cb(f"{atribuicao}: navegando para pauta…")
        await page.goto(PAUTA_URL, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(2)

        # ── Dispensa modal de alerta se houver ────────────────────────────
        modal_txt = await _dismiss_pauta_modal(page)
        if modal_txt:
            print(f"  [modal] {modal_txt}", flush=True)

        # ── Aplica filtros ────────────────────────────────────────────────
        if status_cb:
            status_cb(f"{atribuicao}: aplicando filtros ({comarca}, {unidade})…")

        # Filtro 1: Jurisdição (comarca)
        ok_jur = await _set_jurisdicao(page, comarca)
        print(f"  [filtro] jurisdicao={comarca}: {ok_jur}", flush=True)
        if ok_jur:
            # Aguarda AJAX para popular select de órgão julgador
            await asyncio.sleep(2)
            await _poll(
                page,
                lambda: _text_present(page, unidade.split()[0]),
                timeout=12,
                interval=0.8,
            )

        # Filtro 2: Órgão julgador (unidade)
        ok_orgao = await _set_orgao_julgador(page, unidade)
        print(f"  [filtro] orgao_julgador={unidade}: {ok_orgao}", flush=True)

        # Filtro 3: Situações = Todas
        ok_sit = await _set_situacoes_todas(page)
        print(f"  [filtro] situacoes_todas: {ok_sit}", flush=True)

        # Filtro 4: Período
        await _set_periodo(page, since, until)
        print(f"  [filtro] periodo: {since} até {until}", flush=True)
        await asyncio.sleep(0.5)

        # ── Clica Pesquisar ───────────────────────────────────────────────
        if status_cb:
            status_cb(f"{atribuicao}: pesquisando…")
        ok_btn = await _click_pesquisar(page)
        print(f"  [filtro] btn_pesquisar clicado: {ok_btn}", flush=True)

        # Aguarda tabela carregar (AJAX)
        table_ok = await _poll(page, lambda: _table_loaded(page), timeout=30, interval=1.0)
        if not table_ok:
            print("  [aviso] tabela não carregou após 30s — encerrando sem dados", flush=True)
        await asyncio.sleep(1)

        # ── Paginação (slider RichFaces) e extração ───────────────────────
        # O paginador da pauta NÃO é o datascroller clássico (« ‹ 1 2 ›): é um
        # rich-inputNumberSlider — um input com a página atual e ".rich-inslider-
        # right-num" com a última página. Validado ao vivo (2026-06-29): setar o
        # input + disparar change navega via A4J e recarrega a tabela.
        await asyncio.sleep(1.0)
        max_page = await page.evaluate(
            r"""() => {
              const e = document.querySelector('.rich-inslider-right-num');
              const n = e ? parseInt((e.innerText || '').trim(), 10) : 1;
              return Number.isFinite(n) && n > 0 ? n : 1;
            }"""
        )
        print(f"  [paginação] {max_page} página(s) (slider)", flush=True)
        pg_loop = asyncio.get_running_loop()

        for page_num in range(1, max_page + 1):
            if page_num > 1:
                before = await _first_pauta_row_text(page)
                set_ok = await page.evaluate(
                    r"""(n) => {
                      const inp = document.querySelector('input.rich-inslider-field-right')
                        || document.querySelector('[id$="j_id492Input"]')
                        || document.querySelector('.rich-inslider input[type="text"]');
                      if (!inp) return false;
                      inp.value = String(n);
                      inp.dispatchEvent(new Event('change', {bubbles: true}));
                      inp.dispatchEvent(new Event('blur', {bubbles: true}));
                      return true;
                    }""",
                    page_num,
                )
                if not set_ok:
                    print(f"  [paginação] slider não encontrado na pág {page_num} — parando", flush=True)
                    break
                # Aguarda a tabela recarregar (1ª linha muda) — A4J assíncrono.
                pg_deadline = pg_loop.time() + 15
                while pg_loop.time() < pg_deadline:
                    await asyncio.sleep(0.6)
                    if (await _first_pauta_row_text(page)) != before:
                        break
                await asyncio.sleep(0.8)

            raw_rows = await page.evaluate(JS_EXTRACT_PAUTA_ROWS)
            novos = []
            for r in raw_rows:
                # Normaliza CNJ partido por quebra de linha
                r["processo"] = normaliza_cnj(r.get("processo") or "")
                # Guard intra-página: descarta linha completamente em branco
                if not any(r.values()):
                    continue
                novos.append(r)

            print(f"  → pág {page_num}/{max_page}: {len(novos)} linha(s)", flush=True)
            results.extend(novos)
            if heartbeat:
                heartbeat(len(results))

    # Dedup intra-job (mesma audiência pode reaparecer se uma página recarregar):
    # chave estável = processo + data + tipo + situação.
    vistos: set[str] = set()
    unicos: list[dict] = []
    for r in results:
        ch = compute_pauta_hash(
            r.get("processo") or "", r.get("dataHora") or "",
            r.get("tipo") or "", r.get("situacao") or "",
        )
        if ch in vistos:
            continue
        vistos.add(ch)
        unicos.append(r)
    if len(unicos) != len(results):
        print(f"  [dedup] {len(results)} → {len(unicos)} linhas únicas", flush=True)
    return unicos


def scrape_pauta(
    atribuicao: str,
    since: str | None,
    until: str | None,
    modo: str,
    env: dict,
    heartbeat,
    status_cb=None,
) -> list[dict]:
    """Wrapper síncrono para _async_scrape_pauta."""
    return asyncio.run(
        _async_scrape_pauta(atribuicao, since, until, modo, env, heartbeat, status_cb)
    )


# ─── CLI ──────────────────────────────────────────────────────────────────────

def parse_args(argv=None):
    p = argparse.ArgumentParser(
        description="Importa PAUTA DE AUDIÊNCIAS do PJe → pauta_import_staging"
    )
    p.add_argument("--job-id", type=int, required=True)
    p.add_argument(
        "--atribuicoes", required=True,
        help="CSV de atribuições (ex: VVD_CAMACARI,JURI_CAMACARI)",
    )
    p.add_argument("--since", default=None, help="Data mínima YYYY-MM-DD")
    p.add_argument("--until", default=None, help="Data máxima YYYY-MM-DD")
    p.add_argument("--modo", choices=["cdp", "direct"], default="cdp")
    return p.parse_args(argv)


# ─── Orquestração principal ───────────────────────────────────────────────────

def run(args) -> None:
    """Pipeline completo. Imports pesados (varredura/Playwright) ocorrem aqui."""
    _patch_varredura_path()
    from varredura_triagem import load_env, Supabase  # type: ignore

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

    set_etapa(sb, args.job_id, "Conectando ao PJe (pauta)…")

    total = 0
    por_unidade: dict[str, int] = {}
    seen_hashes: set[str] = set()  # dedup intra-job por content_hash

    for atrib in atribuicoes:
        set_etapa(sb, args.job_id, f"{atrib}: abrindo pauta de audiências…")
        mapping = ATRIB_UNIDADE.get(atrib)
        unidade_nome = mapping[1] if mapping else atrib

        # Fail-fast por atribuição: qualquer exceção propaga para o handler de
        # main(), que marca a task como failed (não engolimos erros aqui).
        rows = scrape_pauta(
            atrib,
            args.since,
            args.until,
            args.modo,
            env,
            heartbeat=lambda n, a=atrib: set_etapa(
                sb, args.job_id, f"{a}: {n} audiência(s) raspadas…"
            ),
            status_cb=lambda msg: set_etapa(sb, args.job_id, msg),
        )

        unidade_count = 0
        for row in rows:
            data_iso, _hhmm = parse_data_hora(row.get("dataHora") or "")
            processo = row.get("processo") or ""
            tipo = row.get("tipo") or ""
            situacao = row.get("situacao") or ""

            ch = compute_pauta_hash(processo, data_iso or "", tipo, situacao)

            # Dedup intra-job: mesma audiência pode aparecer em páginas repetidas
            if ch in seen_hashes:
                continue
            seen_hashes.add(ch)

            sb.insert(
                "pauta_import_staging",
                {
                    "job_id": args.job_id,
                    "atribuicao": atrib,
                    "data_audiencia": data_iso,
                    "processo_numero": processo or None,
                    "orgao_julgador": row.get("orgao") or None,
                    "partes_raw": row.get("partes") or None,
                    "classe_raw": row.get("classe") or None,
                    "tipo_raw": tipo or None,
                    "sala": row.get("sala") or None,
                    "situacao": situacao or None,
                    "content_hash": ch,
                    "selected": True,
                },
            )
            unidade_count += 1
            total += 1

        por_unidade[unidade_nome] = unidade_count
        set_etapa(sb, args.job_id, f"{atrib}: {unidade_count} audiência(s) gravadas.")

    sb.update(
        "claude_code_tasks",
        {"id": "eq.%d" % args.job_id},
        {
            "status": "completed",
            "etapa": "Concluído",
            "resultado": {"total": total, "por_unidade": por_unidade},
        },
    )
    print(f"[ok] {total} audiência(s) gravadas em pauta_import_staging.", flush=True)


def main(argv=None) -> None:
    args = parse_args(argv)
    try:
        run(args)
    except Exception as e:
        try:
            _patch_varredura_path()
            from varredura_triagem import load_env, Supabase  # type: ignore

            class _SBExt(Supabase):
                def update(self, table: str, filter_dict: dict, data: dict) -> None:
                    qs = "&".join(f"{k}={v}" for k, v in filter_dict.items())
                    self._req("PATCH", f"/rest/v1/{table}?{qs}", data, prefer="return=minimal")

            env = load_env()
            sb = _SBExt(env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])
            etapa_falha = (
                "Abra o PJe logado ou configure credenciais"
                if "Abra o PJe logado" in str(e)
                else "Falha na importação da pauta"
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
