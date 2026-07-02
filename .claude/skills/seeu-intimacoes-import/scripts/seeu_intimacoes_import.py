#!/usr/bin/env python3
"""Worker (browser lane): raspa a Mesa do Defensor do SEEU (Execução Penal) por
aba e grava em seeu_import_staging (NUNCA em demandas). Dedup Layer-A via
seeu_ledger, chave forte = (processoNumero, seq).

Read-only sobre o SEEU: só lê DOM + troca de aba + paginação. Nunca clica
"Dispensar Juntada"/"Analisar"/assinar/peticionar.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import os
import re
import sys
from datetime import datetime, timezone

CDP_URL = os.environ.get("SEEU_CDP_URL", "http://127.0.0.1:9222")
SEEU_BASE = "https://seeu.pje.jus.br/seeu"
MESA_FRAME_MARKER = "mesaDefensor1Grau.do"

# Abas suportadas na Fase 1 → (texto do link, ato da demanda).
ABAS_SUPORTADAS: dict[str, tuple[str, str]] = {
    "manifestacao": ("Manifestação", "Manifestação"),
    "ciencia": ("Ciência", "Ciência"),
    "razoes": ("Razões/Contrarrazões", "Razões"),
    "pendencias": ("Pendências de Incidentes", "Pendência de incidente — verificar"),
}


def normalize_conteudo(s: str) -> str:
    """Colapsa whitespace, strip, lowercase. Byte-idêntico ao TS normalizeConteudo."""
    s = s or ""
    return re.sub(r"\s+", " ", s).strip().lower()


def compute_content_hash(processo: str, doc_id: str | None, conteudo: str) -> str:
    """sha256(processo + "|" + (doc_id or "") + "|" + normalize_conteudo(conteudo)).
    No SEEU doc_id é sempre None → segmento vazio. Byte-idêntico ao TS."""
    payload = "%s|%s|%s" % (processo or "", doc_id or "", normalize_conteudo(conteudo))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def proc_seq_key(processo: str | None, seq: int | None) -> str | None:
    """Chave forte '<processo>|<seq>' ou None se faltar processo ou seq."""
    if not processo or seq is None:
        return None
    return "%s|%s" % (processo, seq)


def decide_layer_a_seeu(
    processo: str | None,
    seq: int | None,
    content_hash: str,
    ledger_index: dict,
) -> str:
    """ledger_index = {"by_proc_seq": {key: decisao}, "by_hash": {hash: decisao}}.
    Retorna 'nova' | 'duplicada' | 'ja_importada'. Chave forte = processo+seq;
    content_hash é fallback."""
    key = proc_seq_key(processo, seq)
    if key and key in ledger_index.get("by_proc_seq", {}):
        prev = ledger_index["by_proc_seq"][key]
        return "ja_importada" if prev == "imported" else "duplicada"
    if content_hash in ledger_index.get("by_hash", {}):
        prev = ledger_index["by_hash"][content_hash]
        return "ja_importada" if prev == "imported" else "duplicada"
    return "nova"


def load_seeu_ledger_index(sb) -> dict:
    """Lê TODOS os rows de seeu_ledger e indexa por (processo|seq) e por hash.
    Pagina de 1000 em 1000 (PostgREST limita a resposta) p/ não subcontar."""
    PAGE = 1000
    idx: dict = {"by_proc_seq": {}, "by_hash": {}}
    offset = 0
    while True:
        rows = sb._req(
            "GET",
            f"/rest/v1/seeu_ledger"
            f"?select=processo_numero,seq,content_hash,decisao"
            f"&limit={PAGE}&offset={offset}",
        ) or []
        for r in rows:
            k = proc_seq_key(r.get("processo_numero"), r.get("seq"))
            if k:
                idx["by_proc_seq"][k] = r["decisao"]
            if r.get("content_hash"):
                idx["by_hash"][r["content_hash"]] = r["decisao"]
        if len(rows) < PAGE:
            break
        offset += PAGE
    return idx


# ─── sys.path helper + Supabase glue (lazy, espelho do worker PJe) ───────────

def _patch_varredura_path() -> None:
    """Insere .claude/skills/varredura-triagem/scripts/ no sys.path, uma vez.
    Cross-directory import deliberado (reuso de load_env/Supabase) — chamado
    só dentro de run()/main(), nunca no topo do módulo."""
    varredura_dir = os.path.normpath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)),
                     "..", "..", "varredura-triagem", "scripts")
    )
    if varredura_dir not in sys.path:
        sys.path.insert(0, varredura_dir)


def set_etapa(sb, job_id: int, texto: str) -> None:
    sb.update("claude_code_tasks", {"id": "eq.%d" % job_id}, {"etapa": texto})


def _bump_ledger_last_seen(sb, processo, seq, content_hash, job_id) -> None:
    """Atualiza last_seen_at no ledger para um hit Layer-A. Chave forte
    (processo+seq) quando disponível; senão cai para content_hash."""
    key = proc_seq_key(processo, seq)
    if key:
        flt = {"processo_numero": "eq.%s" % processo, "seq": "eq.%d" % seq}
    else:
        flt = {"content_hash": "eq.%s" % content_hash}
    sb.update("seeu_ledger", flt,
              {"last_seen_at": datetime.now(timezone.utc).isoformat(), "job_id": job_id})


# ─── Navegação read-only na Mesa do Defensor ─────────────────────────────────
# Read-only sobre o SEEU: só lê DOM, troca de aba e faz paginação (quando houver).
# NUNCA clica "Dispensar Juntada"/"Analisar"/assinar/peticionar.

def _find_mesa_frame(page):
    """Retorna o Frame cuja URL contém mesaDefensor1Grau.do, ou None."""
    for f in page.frames:
        if MESA_FRAME_MARKER in (f.url or ""):
            return f
    return None


# Clica o <a> cujo texto começa com `label` (ex.: "Manifestação"). O clique
# dispara o submit interno do mesaDefensor1GrauForm — não é uma ação destrutiva,
# apenas troca a aba/listagem exibida.
JS_CLICK_ABA = r"""(label) => {
  const as = [...document.querySelectorAll('a')];
  const el = as.find(a => (a.innerText || '').trim().startsWith(label));
  if (el) { el.click(); return true; }
  return false;
}"""

# Captura o innerText cru da tabela de resultados (fallback: body inteiro).
JS_TABLE_TEXT = r"""() => {
  const t = document.querySelector('table.resultTable');
  return t ? (t.innerText || '') : (document.body ? document.body.innerText : '');
}"""

# Situações que exigem ação (radio name=situacao, onclick=enviaForm): 0=Recebidas
# e não Lidas, 1=Lidas e Aguardando Análise. A contagem da aba é o TOTAL das
# situações — sem iterar, só a situação padrão (0) é capturada.
SITUACOES = (0, 1)
JS_SELECT_SITUACAO = (
    "(idx)=>{const r=document.querySelectorAll('input[type=radio][name=situacao]')[idx];"
    " if(r && !r.checked){r.click(); return true;} return false;}"
)

# Pendências de Incidentes: aba com <select> de Juízo (não SITUACOES). Descoberta
# genérica (sem id fixo): pega os selects visíveis do frame e devolve as options.
JS_LIST_JUIZOS = r"""() => {
  const sels = Array.from(document.querySelectorAll('select'));
  // Heurística: o select de juízo tem várias options com texto (>1). Pega o maior.
  let best = null, bestN = 1;
  for (const s of sels) {
    const opts = Array.from(s.options || []).filter(o => (o.textContent || '').trim());
    if (opts.length > bestN) { best = s; bestN = opts.length; }
  }
  if (!best) return [];
  return Array.from(best.options).map(o => ({ value: o.value, label: (o.textContent||'').trim() }))
                                 .filter(o => o.label);
}"""

JS_SELECT_JUIZO = r"""(value) => {
  const sels = Array.from(document.querySelectorAll('select'));
  let best = null, bestN = 1;
  for (const s of sels) {
    const opts = Array.from(s.options || []).filter(o => (o.textContent || '').trim());
    if (opts.length > bestN) { best = s; bestN = opts.length; }
  }
  if (!best) return false;
  best.value = value;
  best.dispatchEvent(new Event('change', { bubbles: true }));
  if (typeof best.onchange === 'function') best.onchange();
  return true;
}"""

_CNJ_RE = re.compile(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}")

# Marcador de expediente: "Seq\n<CNJ>". Delimita cada bloco (Seq→próximo Seq),
# preservando as datas/prazo que vêm DEPOIS do CNJ e ANTES do próximo Seq.
_SEQ_CNJ_RE = re.compile(r"(\d{3,4})\s*\n\s*(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})")

# "N registro(s) encontrado(s), exibindo de X até Y" — usado só para detectar
# under-capture (SEEU não pagina nesta Fase 1; se o total exceder os blocos
# extraídos, há página seguinte não lida e expedientes ficam de fora em silêncio).
_TOTAL_REGISTROS_RE = re.compile(r"(\d+)\s+registro\(s\)\s+encontrado")


def _split_blocos_por_processo(texto_tabela: str) -> list[tuple[int, str, str]]:
    """Fatia a tabela em blocos, um por expediente, delimitados pelo marcador
    Seq+CNJ. Cada bloco vai do seu próprio Seq até o Seq do próximo expediente
    (ou o fim do texto), preservando as datas/prazo que aparecem DEPOIS do CNJ e
    ANTES do próximo Seq. Devolve (seq, cnj, bloco_cru).

    Substitui a heurística `-40` anterior, que truncava a última data do bloco e
    ainda vazava a cauda do bloco anterior (bug crítico visto ao vivo)."""
    ms = list(_SEQ_CNJ_RE.finditer(texto_tabela))
    blocos: list[tuple[int, str, str]] = []
    for i, m in enumerate(ms):
        ini = m.start()
        fim = ms[i + 1].start() if i + 1 < len(ms) else len(texto_tabela)
        blocos.append((int(m.group(1)), m.group(2), texto_tabela[ini:fim]))
    return blocos


# Tabela sem itens (caso usual das Pendências de Incidentes).
_TABELA_VAZIA_RE = re.compile(r"nenhum registro|não há|nao ha|sem pend[êe]ncias", re.IGNORECASE)


def parse_pendencias(texto: str) -> list:
    """Parser DEFENSIVO da aba Pendências de Incidentes (layout distinto e raro).
    Tenta o padrão Seq→CNJ das outras abas; se não casar mas houver conteúdo real,
    devolve UM item cru (seq=None, cnj=None) para não perder o incidente; tabela
    vazia → []. Nunca lança.
    Retorna list[tuple[int|None, str|None, str]] = (seq, cnj, bloco)."""
    t = (texto or "").strip()
    if not t or (_TABELA_VAZIA_RE.search(t) and len(t) < 200):
        return []
    try:
        blocos = _split_blocos_por_processo(t)
    except Exception:
        blocos = []
    if blocos:
        return blocos
    # Conteúdo fora do padrão conhecido → captura defensiva (1 item cru).
    return [(None, None, t)]


# ─── Scraper assíncrono por aba (Playwright — importado lazily) ─────────────

async def _async_scrape_mesa(env, abas: list[str], modo: str, limit: int, status_cb):
    """Anexa via CDP a um SEEU já logado, troca entre as abas suportadas
    (Manifestação/Ciência/Razões) e extrai o texto cru de cada bloco por
    processo. Fail-loud na conexão: sem CDP ou sem a Mesa aberta, levanta
    RuntimeError com mensagem lida pelo daemon/UI ('Abra o SEEU logado...').

    Por-aba é resiliente: uma exceção (ex.: frame RichFaces desanexado durante
    o clique/submit) é logada e a aba é pulada — não aborta as demais abas nem
    perde o que já foi capturado. Também detecta under-capture (mais registros
    anunciados pela tabela do que blocos extraídos — sinal de paginação não
    implementada) e devolve os avisos junto com os resultados.

    Retorna (results, warnings)."""
    try:
        from patchright.async_api import async_playwright  # type: ignore
    except ImportError:
        raise RuntimeError("patchright não instalado — ative o .venv do enrichment-engine")

    results: list[dict] = []
    warnings: list[str] = []
    async with async_playwright() as p:
        if modo != "cdp":
            raise RuntimeError("SEEU só suporta modo cdp (login manual via Keycloak)")
        try:
            browser = await p.chromium.connect_over_cdp(CDP_URL)
        except Exception as e:
            raise RuntimeError(f"Abra o SEEU logado (CDP erro: {e})")
        ctx = browser.contexts[0]
        page = next((pg for pg in ctx.pages if "seeu" in (pg.url or "")), None)
        if page is None:
            raise RuntimeError("Abra o SEEU logado — nenhuma aba do SEEU encontrada no browser CDP")
        frame = _find_mesa_frame(page)
        if frame is None:
            raise RuntimeError("Mesa do Defensor não encontrada — abra a Mesa no SEEU")

        for aba in abas:
            label, ato = ABAS_SUPORTADAS[aba]
            if status_cb:
                status_cb(f"Abrindo aba {label}…")
            try:
                frame = _find_mesa_frame(page)
                if frame is None:
                    continue
                await frame.evaluate(JS_CLICK_ABA, label)
                await page.wait_for_timeout(2500)
                frame = _find_mesa_frame(page)  # re-resolve após o submit do form
                if frame is None:
                    continue

                if aba == "pendencias":
                    # Fluxo próprio: itera o <select> de Juízo (não SITUACOES).
                    juizos = await frame.evaluate(JS_LIST_JUIZOS)
                    if not juizos:
                        if status_cb:
                            status_cb(f"aba {label}: sem seletor de Juízo (tratando como vazia)")
                        continue
                    for j in juizos:
                        try:
                            await frame.evaluate(JS_SELECT_JUIZO, j["value"])
                            await page.wait_for_timeout(2600)
                            frame = _find_mesa_frame(page)
                            if frame is None:
                                break
                            texto = await frame.evaluate(JS_TABLE_TEXT)
                            itens = parse_pendencias(texto)
                            if not itens:
                                if status_cb:
                                    status_cb(f"0 pendências em {j['label'][:40]}")
                                continue
                            for seq, cnj_str, bloco in itens:
                                results.append({
                                    "aba": aba,
                                    "ato": ato,
                                    "processoNumero": cnj_str,
                                    "seq": seq,
                                    "conteudo": "Mesa do Defensor\n" + bloco,
                                })
                                if len(results) >= limit:
                                    return results, warnings
                        except Exception as e:
                            aviso = f"aba {label} juízo {j.get('label','?')[:30]} falhou: {e}"
                            warnings.append(aviso)
                            if status_cb:
                                status_cb(f"⚠ {aviso}")
                            continue
                    continue  # aba pendencias concluída; não cai no loop de SITUACOES

                # Itera as situações (Recebidas + Lidas e Aguardando) — cada uma
                # recarrega a tabela via enviaForm(). Ao trocar de aba a situação
                # volta p/ 0 (default), então sit=0 já vem selecionada (changed=False).
                for sit in SITUACOES:
                    changed = await frame.evaluate(JS_SELECT_SITUACAO, sit)
                    if changed:
                        await page.wait_for_timeout(2600)
                        frame = _find_mesa_frame(page)
                        if frame is None:
                            break
                    texto = await frame.evaluate(JS_TABLE_TEXT)
                    blocos = _split_blocos_por_processo(texto)

                    # Reconciliação POR situação: "N registro(s) encontrado(s)" é o
                    # total daquela situação; se exceder os blocos, há página não lida.
                    m = _TOTAL_REGISTROS_RE.search(texto or "")
                    if m and int(m.group(1)) > len(blocos):
                        expected = int(m.group(1))
                        aviso = f"aba {label} sit={sit}: capturados {len(blocos)}/{expected} — possível paginação"
                        warnings.append(aviso)
                        if status_cb:
                            status_cb(f"⚠ {aviso}")

                    for seq, cnj_str, bloco in blocos:
                        results.append({
                            "aba": aba,
                            "ato": ato,
                            "processoNumero": cnj_str,
                            "seq": seq,
                            # Sentinela "Mesa do Defensor" garante que isSEEU detecte o
                            # sistema mesmo num bloco isolado (sem o cabeçalho da aba),
                            # roteando parseIntimacoesUnificado para SEEU. Prefixo
                            # constante → content_hash determinístico (dedup estável).
                            "conteudo": "Mesa do Defensor\n" + bloco,
                        })
                        if len(results) >= limit:
                            return results, warnings
            except Exception as e:
                aviso = f"aba {label} falhou: {e}"
                warnings.append(aviso)
                if status_cb:
                    status_cb(f"⚠ {aviso}")
                continue
    return results, warnings


# > Nota de captura: o `conteudo` cru vai inteiro para o staging; o parsing
# autoritativo (assistido, classe, datas, prazo) é feito na camada TS por
# parseIntimacoesUnificado, já corrigido no Task 1. O worker só precisa
# acertar `processoNumero` e `seq` (chave de dedup).


# ─── CLI ──────────────────────────────────────────────────────────────────────

def parse_args(argv=None):
    p = argparse.ArgumentParser(description="Importa Mesa do Defensor (SEEU) → seeu_import_staging")
    p.add_argument("--job-id", type=int, required=True)
    p.add_argument("--atribuicoes", default="EXECUCAO_PENAL")
    p.add_argument("--abas", default="manifestacao,ciencia,razoes,pendencias")
    p.add_argument("--limit", type=int, default=300)
    p.add_argument("--modo", choices=["cdp"], default="cdp")
    return p.parse_args(argv)


# ─── Orquestração principal ───────────────────────────────────────────────────

def run(args) -> None:
    """Executa o pipeline completo. Importações pesadas (varredura/Playwright)
    ocorrem aqui — NUNCA no topo do módulo."""
    _patch_varredura_path()
    from varredura_triagem import load_env, Supabase  # type: ignore

    class SupabaseExt(Supabase):
        def insert(self, table, data):
            self._req("POST", f"/rest/v1/{table}", data, prefer="return=minimal")

        def update(self, table, filter_dict, data):
            qs = "&".join(f"{k}={v}" for k, v in filter_dict.items())
            self._req("PATCH", f"/rest/v1/{table}?{qs}", data, prefer="return=minimal")

    env = load_env()
    if not env.get("NEXT_PUBLIC_SUPABASE_URL") or not env.get("SUPABASE_SERVICE_ROLE_KEY"):
        raise RuntimeError("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes no .env.local")
    sb = SupabaseExt(env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])

    atrib = (args.atribuicoes.split(",")[0] or "EXECUCAO_PENAL").strip()
    abas = [a.strip() for a in args.abas.split(",") if a.strip() in ABAS_SUPORTADAS]

    set_etapa(sb, args.job_id, "Conectando ao SEEU…")
    ledger_index = load_seeu_ledger_index(sb)

    expedientes, avisos = asyncio.run(_async_scrape_mesa(
        env, abas, args.modo, args.limit,
        status_cb=lambda msg: set_etapa(sb, args.job_id, msg),
    ))

    total = 0
    for exp in expedientes:
        proc = exp.get("processoNumero")
        seq = exp.get("seq")
        ch = compute_content_hash(proc or "", None, exp.get("conteudo") or "")
        decisao = decide_layer_a_seeu(proc, seq, ch, ledger_index)
        sb.insert("seeu_import_staging", {
            "job_id": args.job_id,
            "atribuicao": atrib,
            "tab": exp.get("aba"),
            "seq": seq,
            "processo_numero": proc,
            "ato": exp.get("ato"),
            "conteudo": exp.get("conteudo") or "",
            "content_hash": ch,
            "decisao": decisao,
            "selected": decisao == "nova",
        })
        if decisao != "nova":
            _bump_ledger_last_seen(sb, proc, seq, ch, args.job_id)
        total += 1

    sb.update("claude_code_tasks", {"id": "eq.%d" % args.job_id}, {
        "status": "completed", "etapa": "Concluído",
        "resultado": {"raspadas": total, "abas": abas, "atribuicao": atrib, "avisos": avisos},
    })
    print(f"[ok] {total} expediente(s) SEEU importados para staging.", flush=True)


def main(argv=None) -> None:
    args = parse_args(argv)
    try:
        run(args)
    except Exception as e:
        try:
            _patch_varredura_path()
            from varredura_triagem import load_env, Supabase  # type: ignore

            class _SB(Supabase):
                def update(self, table, filter_dict, data):
                    qs = "&".join(f"{k}={v}" for k, v in filter_dict.items())
                    self._req("PATCH", f"/rest/v1/{table}?{qs}", data, prefer="return=minimal")

            env = load_env()
            sb = _SB(env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])
            etapa = ("Abra o SEEU logado" if "Abra o SEEU" in str(e) else "Falha na importação")
            sb.update("claude_code_tasks", {"id": "eq.%d" % args.job_id},
                      {"status": "failed", "erro": str(e)[:500], "etapa": etapa})
        except Exception as e2:
            print(f"ERRO ao gravar falha: {e2}", file=sys.stderr)
        print(f"ERRO: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
