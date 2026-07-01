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


async def read_seeu_expediente(ctx, cnj: str) -> dict:
    """Abre o processo no SEEU e lê o documento-alvo da intimação. Devolve o mesmo
    formato que read_doc_content (PJe): {text, top_titulo, pena_context, panel_text}.
    Fallback (§7 do spec): se o teor não abrir, usa tipo do movimento + pena como text."""
    page = next((pg for pg in ctx.pages if "seeu" in (pg.url or "")), None)
    if page is None:
        raise RuntimeError("Abra o SEEU logado — nenhuma aba do SEEU no browser CDP")
    # abre a busca por CNJ → visualizacaoProcesso (mecanismo de teor finalizado no Step 4)
    proc_text = await _abrir_processo_por_cnj(page, cnj)
    alvo = parse_movimento_alvo(proc_text)
    pena = parse_pena_context(proc_text)
    teor = await _ler_teor_do_movimento(page, alvo) if alvo else None
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


async def _abrir_processo_por_cnj(page, cnj: str) -> str:
    """Navega até visualizacaoProcesso do CNJ informado e devolve o innerText.
    READ-ONLY. Corpo finalizado pelo controller no Step 4 via probe ao vivo
    (Busca Execução Penal → visualizacaoProcesso)."""
    raise NotImplementedError("controller finaliza no Step 4")


async def _ler_teor_do_movimento(page, alvo: dict | None) -> str | None:
    """Abre o documento do movimento-alvo na timeline 'Movimentações' e devolve o
    texto, ou None (cai no fallback). READ-ONLY. Corpo finalizado pelo controller
    no Step 4 via probe ao vivo."""
    raise NotImplementedError("controller finaliza no Step 4")
