"""Leitor de expediente do SEEU (Execução Penal) para a varredura de triagem.
READ-ONLY: navega visualizacaoProcesso e lê DOM. Nunca escreve no SEEU."""
from __future__ import annotations
import re

SEEU_BASE = "https://seeu.pje.jus.br/seeu"

_MESES = {"janeiro":"01","fevereiro":"02","março":"03","marco":"03","abril":"04",
          "maio":"05","junho":"06","julho":"07","agosto":"08","setembro":"09",
          "outubro":"10","novembro":"11","dezembro":"12"}


def _data_extenso_to_iso(s: str) -> str | None:
    m = re.search(r"(\d{1,2})\s+de\s+([a-zçã]+)\s+de\s+(\d{4})", s, re.IGNORECASE)
    if not m:
        return None
    dia, mes, ano = m.group(1).zfill(2), _MESES.get(m.group(2).lower()), m.group(3)
    return f"{dia}/{mes}/{ano}" if mes else None


def parse_movimento_alvo(texto: str) -> dict | None:
    """Extrai o movimento que a intimação referencia:
    'Juntar {ATO} referente ao movimento - {TIPO} ( {data por extenso} )'."""
    m = re.search(r"referente ao movimento\s*-\s*(.+?)\s*\(([^)]*\d{4}[^)]*)\)", texto, re.IGNORECASE)
    if not m:
        return None
    tipo = re.sub(r"\s+", " ", m.group(1)).strip()
    return {"tipo": tipo, "data": _data_extenso_to_iso(m.group(2))}


def parse_pena_context(texto: str) -> dict:
    """Datas do painel de pena, quando presentes."""
    def g(label):
        m = re.search(label + r"\s*:?\s*(\d{2}/\d{2}/\d{4})", texto, re.IGNORECASE)
        return m.group(1) if m else None
    return {
        "inicio": g("Início"),
        "termino": g("Término"),
        "livramento_condicional": g("Livramento Condicional"),
    }


ROOT = "https://seeu.pje.jus.br"

# Cache de sessão: {cnj_só_dígitos: href visualizacaoProcesso}. A Mesa lista os
# expedientes pendentes (que é o alvo da triagem) com links tokenizados válidos.
# Colhido UMA vez por rodada (o form de busca por CNJ do SEEU é instável); o
# reader abre o processo a partir daqui. READ-ONLY.
_mesa_cache: dict[str, str] = {}

_ABAS_MESA = ("Manifestação", "Ciência", "Razões")

# JS: colhe {cnj, href} das linhas da aba atual da Mesa (links visualizacaoProcesso).
_JS_HARVEST = r"""() => {
  const o=[];
  document.querySelectorAll('a').forEach(a=>{
    const h=a.getAttribute('href')||''; const t=(a.innerText||'').trim();
    if(h.includes('visualizacaoProcesso') && /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/.test(t)) o.push({cnj:t,h});
  });
  return o;
}"""


def _norm_cnj(s: str) -> str:
    return re.sub(r"\D", "", s or "")


def _find_mesa_frame(pages):
    """Acha o frame da Mesa do Defensor entre as abas abertas (sem navegar)."""
    for pg in pages:
        for f in pg.frames:
            if "mesaDefensor" in (f.url or ""):
                return pg, f
    return None, None


async def _ensure_mesa_cache(ctx) -> None:
    """Popula _mesa_cache a partir da Mesa (Manifestação/Ciência/Razões), uma vez.
    Requer a Mesa já aberta e logada numa aba do SEEU (login manual)."""
    if _mesa_cache:
        return
    pg, frame = _find_mesa_frame(ctx.pages)
    if frame is None:
        raise RuntimeError("Abra o SEEU logado na Mesa do Defensor — frame não encontrado")
    for aba in _ABAS_MESA:
        try:
            await frame.evaluate(
                "(n)=>{const a=[...document.querySelectorAll('a')].find(a=>(a.innerText||'').trim().startsWith(n));if(a)a.click();}",
                aba,
            )
            await pg.wait_for_timeout(2200)
            _, frame = _find_mesa_frame(ctx.pages)  # re-resolve após o submit do form
            if frame is None:
                break
            rows = await frame.evaluate(_JS_HARVEST)
            for r in rows:
                _mesa_cache.setdefault(_norm_cnj(r["cnj"]), r["h"])
        except Exception:
            continue  # aba pode não existir/estar vazia — segue


async def read_seeu_expediente(ctx, cnj: str) -> dict:
    """Abre o processo do CNJ no SEEU (via link da Mesa) e lê o documento-alvo da
    intimação. Devolve o mesmo formato que read_doc_content (PJe):
    {text, top_titulo, pena_context, panel_text}. Fallback (§7 do spec): se o teor
    não abrir, usa tipo do movimento + pena como text. READ-ONLY."""
    await _ensure_mesa_cache(ctx)
    href = _mesa_cache.get(_norm_cnj(cnj))
    if not href:
        raise RuntimeError(f"CNJ {cnj} não encontrado na Mesa do SEEU (pendências)")
    url = href if href.startswith("http") else ROOT + href
    proc_page = await ctx.new_page()
    try:
        await proc_page.goto(url, wait_until="domcontentloaded", timeout=40000)
        await proc_page.wait_for_timeout(3200)
        proc_text = await proc_page.evaluate("()=>document.body?document.body.innerText:''")
        alvo = parse_movimento_alvo(proc_text)
        pena = parse_pena_context(proc_text)
        teor = await _ler_teor_do_movimento(proc_page, alvo) if alvo else None
    finally:
        try:
            await proc_page.close()
        except Exception:
            pass
    top_titulo = alvo["tipo"] if alvo else None
    text = teor or _fallback_text(alvo, pena)
    return {"text": text, "top_titulo": top_titulo, "pena_context": pena,
            "panel_text": proc_text}


def _fallback_text(alvo: dict | None, pena: dict) -> str:
    partes = []
    if alvo:
        partes.append(f"Movimento intimado: {alvo['tipo']} ({alvo.get('data') or ''})")
    peninfo = ", ".join(f"{k}={v}" for k, v in pena.items() if v)
    if peninfo:
        partes.append(f"Execução: {peninfo}")
    return "\n".join(partes) or "(sem teor legível)"


async def _ler_teor_do_movimento(page, alvo: dict | None) -> str | None:
    """Expande o movimento-alvo na timeline 'Movimentações' (showDetail) e lê o
    teor (sub-eventos: remessa/prazo/decisão). Devolve o texto ou None (→ fallback).
    READ-ONLY: só dispara o expand inline, nunca 'Juntar'/assinar/peticionar."""
    if not alvo or not alvo.get("tipo"):
        return None
    tipo = alvo["tipo"]
    try:
        await page.evaluate(
            r"""(tipo)=>{
              const rows=[...document.querySelectorAll('tr')];
              const row=rows.find(r=>(r.innerText||'').includes(tipo) && /^\s*\d+\s/.test(r.innerText||''));
              if(!row) return;
              const op=[...row.querySelectorAll('[onclick]')].find(e=>/showDetail/.test(e.getAttribute('onclick')||''));
              if(op) op.click();
            }""",
            tipo,
        )
        await page.wait_for_timeout(1600)
        blocks = await page.evaluate(
            r"""()=>[...new Set([...document.querySelectorAll('td')]
              .map(e=>(e.innerText||'').replace(/\s+/g,' ').trim())
              .filter(t=>/REMETIDOS|MANIFEST|prazo|defiro|indefiro|despacho|cumpra|vista|decis/i.test(t)
                         && t.length>40 && t.length<500))].slice(0,4)"""
        )
        joined = "\n".join(blocks or [])
        return joined or None
    except Exception:
        return None
