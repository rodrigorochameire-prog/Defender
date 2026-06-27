"""
Detecta designação/redesignação de audiência em texto de despacho/decisão do PJe.

Porta fiel de:
  - src/lib/registros/detectar-designacao-audiencia.ts
  - src/lib/agenda/tipos-audiencia.ts (detectarSlug / tipoPorSlug / flatten)

Função pura — testável sem banco. Usada pela varredura (fase 1) para agendar a
audiência automaticamente (insere em `audiencias`). Mantenha em sincronia com as
fontes TS; o corpus de fixtures compartilhado força paridade.
"""
from __future__ import annotations
import re
from typing import Optional, TypedDict


# ── Catálogo de tipos (subset relevante p/ detecção) — ordem = prioridade ──────
# Detecção opera sobre texto ACHATADO (sem whitespace, caixa alta, acentos mantidos).
TIPOS_AUDIENCIA = [
    ("plenario_juri", "Sessão de Julgamento do Tribunal do Júri", 480,
     [r"SESS[ÃA]ODEJULGAMENTO", r"PLEN[ÁA]RIO", r"TRIBUNALDOJ[UÚ]RI.*JULGAMENTO"], []),
    ("anpp", "Acordo de Não Persecução Penal", 30,
     [r"ANPP", r"N[ÃA]OPERSECU[CÇ][ÃA]O", r"ACORDO.*PENAL"], []),
    ("admonitoria", "Audiência Admonitória", 15, [r"ADMONIT[OÓ]RIA"], []),
    ("instrucao_oitiva", "Instrução + Depoimento Especial", 90,
     [r"INSTRU[CÇ][ÃA]O.*(DEPOIMENTO|OITIVA)ESPECIAL", r"(DEPOIMENTO|OITIVA)ESPECIAL.*INSTRU[CÇ][ÃA]O"], []),
    ("oitiva_especial", "Depoimento Especial", 30,
     [r"OITIVAESPECIAL", r"DEPOIMENTOESPECIAL", r"DEPOIMENTOSEMDANO"], ["11955"]),
    ("pap", "Produção Antecipada de Provas", 30,
     [r"PRODU[CÇ][ÃA]OANTECIPADA", r"\bPAP\b", r"ANTECIPADADEPROVAS", r"COLETA.*PROVAS"], []),
    ("retratacao", "Audiência de Retratação", 30, [r"RETRATA[CÇ][ÃA]O"], []),
    ("justificacao", "Justificação", 30, [r"JUSTIFICA[CÇ][ÃA]O"], ["1268", "280"]),
    ("custodia", "Audiência de Custódia", 30, [r"CUST[OÓ]DIA"], []),
    ("sumariante", "Audiência de Instrução Sumariante", 90, [r"SUMARIANTE"], []),
    ("preliminar", "Audiência Preliminar", 30, [r"AUDI[EÊ]NCIAPRELIMINAR"], []),
    ("aij", "Audiência de Instrução e Julgamento", 90,
     [r"INSTRU[CÇ][ÃA]O", r"\bAIJ\b", r"INTERROGAT[OÓ]RIO", r"CONTINUIDADEDAAUDI[EÊ]NCIA"], ["283", "10943"]),
    ("conciliacao", "Audiência de Conciliação", 30, [r"CONCILIA[CÇ][ÃA]O"], []),
    ("indefinido", "Audiência", 30, [], []),
]
_INDEFINIDO = TIPOS_AUDIENCIA[-1]
_COMPILED = [(slug, desc, dur, [re.compile(p) for p in pats], cods)
             for (slug, desc, dur, pats, cods) in TIPOS_AUDIENCIA]


def flatten(texto: str) -> str:
    """Remove TODO whitespace e sobe pra caixa alta (mantém acentos)."""
    return re.sub(r"\s+", "", texto or "").upper()


def detectar_slug(texto_bloco: str) -> str:
    flat = flatten(texto_bloco)
    for slug, _desc, _dur, pats, _cods in _COMPILED:
        if any(p.search(flat) for p in pats):
            return slug
    m = re.search(r"\((\d{2,5})\)", flat)
    cod = m.group(1) if m else ""
    if cod:
        for slug, _desc, _dur, _pats, cods in _COMPILED:
            if cod in cods:
                return slug
    return "indefinido"


def tipo_descricao_por_slug(slug: str) -> str:
    for s, desc, _dur, _pats, _cods in _COMPILED:
        if s == slug:
            return desc
    return _INDEFINIDO[1]


def tipo_duracao_por_slug(slug: str) -> int:
    for s, _desc, dur, _pats, _cods in _COMPILED:
        if s == slug:
            return dur
    return _INDEFINIDO[2]


# ── Regexes do detector (porta de detectar-designacao-audiencia.ts) ────────────
_GATILHO = re.compile(
    r"\b(?:(?:re)?designo|(?:re)?designa(?:r|da|-se)?|fica(?:m)?\s+(?:re)?designad[ao]s?|aprazo|aprazada)\b[\s\S]{0,80}?\b(?:audi[eê]ncia|oitiva|depoimento\s+especial)\b"
    r"|\b(?:audi[eê]ncia|oitiva|depoimento\s+especial)\b[\s\S]{0,80}?\b(?:re)?designad[ao]\b"
    r"|\b(?:(?:re)?designo|(?:re)?designar|(?:re)?designei|aprazo|aprazada)\b[\s\S]{0,40}?\b(?:o\s+)?dia\s+\d{1,2}[/.]\d{1,2}[/.]\d{2,4}",
    re.IGNORECASE,
)
_DATA_RE = re.compile(r"\bdia\s+(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})", re.IGNORECASE)
_DATA_FALLBACK_RE = re.compile(r"\bpara\s+(?:o\s+)?(\d{1,2})[/.](\d{1,2})[/.](\d{4})", re.IGNORECASE)
_DATA_MOVIMENTO_RE = re.compile(r"\bpor\s+(\d{1,2})[/.](\d{1,2})[/.](\d{4})", re.IGNORECASE)
_HORA_RE = re.compile(r"(?:^|\s)[àa]s?\s+(\d{1,2})\s*[h:]\s*(\d{2})?\s*(?:min)?", re.IGNORECASE)
_HORA_POS_DATA_RE = re.compile(r"^[\s,;–-]{0,3}(\d{1,2})\s*[h:]\s*(\d{2})\b")
_MODALIDADE_RE = re.compile(r"\b(h[ií]brid[ao]|virtual|presencial|videoconfer[êe]ncia|telepresencial|semipresencial)\b", re.IGNORECASE)
_LOCAL_RE = re.compile(r"\bem/para\s+([^,;#\n]+)", re.IGNORECASE)
_REDESIG_RE = re.compile(r"\bre(?:designo|designa|designad)", re.IGNORECASE)


class Designacao(TypedDict):
    data: str          # yyyy-MM-dd
    horario: str       # HH:mm
    tipo: str          # rótulo canônico
    duracao_min: int
    modalidade: Optional[str]
    local: Optional[str]
    redesignacao: bool
    trecho: str


def detectar_designacao_audiencia(texto: str) -> Optional[Designacao]:
    if not texto:
        return None
    gat = _GATILHO.search(texto)
    if not gat:
        return None

    a_partir = texto[gat.start():]
    dm = _DATA_RE.search(a_partir) or _DATA_FALLBACK_RE.search(a_partir) or _DATA_MOVIMENTO_RE.search(a_partir)
    if not dm:
        return None
    dia, mes, ano = int(dm.group(1)), int(dm.group(2)), int(dm.group(3))
    if ano < 100:
        ano += 2000
    if not (1 <= dia <= 31 and 1 <= mes <= 12 and 2000 <= ano <= 2100):
        return None

    apos_data = a_partir[dm.end():]
    hm = _HORA_POS_DATA_RE.search(apos_data) or _HORA_RE.search(apos_data)
    hora = int(hm.group(1)) if hm else 0
    minuto = int(hm.group(2)) if (hm and hm.group(2)) else 0
    if hora > 23 or minuto > 59:
        return None

    janela = texto[max(0, gat.start() - 120): gat.start() + 200]
    slug = detectar_slug(janela)
    tipo = tipo_descricao_por_slug(slug)

    mod = _MODALIDADE_RE.search(a_partir[:250])
    loc = _LOCAL_RE.search(a_partir)
    fim = dm.end() + (hm.end() if hm else 0)

    return {
        "data": f"{ano:04d}-{mes:02d}-{dia:02d}",
        "horario": f"{hora:02d}:{minuto:02d}",
        "tipo": tipo,
        "duracao_min": tipo_duracao_por_slug(slug),
        "modalidade": mod.group(1).lower() if mod else None,
        "local": re.sub(r"[.\s]+$", "", loc.group(1).strip()) if loc else None,
        "redesignacao": bool(_REDESIG_RE.search(gat.group(0))),
        "trecho": a_partir[:min(max(fim, 80), 220)].strip(),
    }


# ── Self-test (paridade com os exemplos do docstring da fonte TS) ──────────────
if __name__ == "__main__":
    casos = [
        ("designo audiência de instrução e julgamento na modalidade híbrida para o dia 14/07/2026, às 09h50min.",
         {"data": "2026-07-14", "horario": "09:50", "tipo": "Audiência de Instrução e Julgamento",
          "modalidade": "híbrida", "redesignacao": False}),
        ("AUDIÊNCIA JUSTIFICAÇÃO DESIGNADA CONDUZIDA POR 28/07/2026 08:20 EM/PARA VARA DE VIOLÊNCIA DOMÉSTICA FAM CONTRA A MULHER DE CAMAÇARI, #NÃO PREENCHIDO#.",
         {"data": "2026-07-28", "horario": "08:20", "tipo": "Justificação", "redesignacao": False}),
        ("Fica REDESIGNADA a audiência de custódia para o dia 03/08/2026 às 14:00.",
         {"data": "2026-08-03", "horario": "14:00", "tipo": "Audiência de Custódia", "redesignacao": True}),
        ("designo o dia 10/09/2026 para o interrogatório do acusado, às 10h.",
         {"data": "2026-09-10", "horario": "10:00", "tipo": "Audiência de Instrução e Julgamento", "redesignacao": False}),
        ("Intime-se a parte para manifestar no prazo de 5 dias.", None),  # sem designação
    ]
    ok = 0
    for i, (txt, esperado) in enumerate(casos, 1):
        got = detectar_designacao_audiencia(txt)
        if esperado is None:
            passou = got is None
        else:
            passou = got is not None and all(got.get(k) == v for k, v in esperado.items())
        print(f"  caso {i}: {'OK' if passou else 'FALHOU'}", "" if passou else f"\n     esperado={esperado}\n     obtido={got}")
        ok += passou
    print(f"\n{ok}/{len(casos)} casos OK")
    import sys
    sys.exit(0 if ok == len(casos) else 1)
