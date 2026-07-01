"""
Parser de decisão de MPU (Medidas Protetivas de Urgência — Lei 11.340/2006).

Porta fiel de src/lib/mpu/parse-decisao.ts + src/lib/mpu/medidas-taxonomia.ts.
Extrai as medidas deferidas (código canônico, artigo, distância, protegidos),
ofendida/agressor, fundamentos, prazo e revogações. Função pura — testável.

Diferença técnica vs. TS: `segmentar` usa um sentinel (não lookbehind de largura
variável, que o `re` do Python não suporta). Mantenha em sincronia com as fontes TS.
"""
from __future__ import annotations
import re
import unicodedata
from typing import Optional, TypedDict


# ── Catálogo canônico (porta de medidas-taxonomia.ts) ──────────────────────────
# (codigo, artigo, rotulo, [gatilhos sobre texto normalizado])
CATALOGO_MEDIDAS = [
    ("SUSPENSAO_PORTE_ARMA", "22, I", "Suspensão da posse / restrição do porte de armas",
     [r"(suspensao|restricao).{0,30}(posse|porte).{0,15}arma", r"entrega.{0,15}arma"]),
    ("AFASTAMENTO_LAR", "22, II", "Afastamento do lar",
     [r"afasta(mento|r-se)\b.{0,60}\b(do (lar|domicilio|imovel)|da residencia|local de convivencia)",
      r"afastamento do (lar|domicilio)"]),
    ("PROIBICAO_APROXIMACAO", "22, III, a", "Proibição de aproximação",
     [r"\baproximacao\b", r"aproximar", r"distancia minima", r"limite\b.{0,20}distancia"]),
    ("PROIBICAO_CONTATO", "22, III, b", "Proibição de contato",
     [r"(proibicao|proibid\w*|vedad\w*)\b.{0,30}contat(o|ar)", r"nao.{0,15}contat(ar|o)"]),
    ("PROIBICAO_FREQUENTAR", "22, III, c", "Proibição de frequentar lugares",
     [r"proibicao de frequentar", r"proibido.{0,20}frequentar", r"nao.{0,10}frequentar"]),
    ("RESTRICAO_VISITAS", "22, IV", "Restrição/suspensão de visitas aos dependentes",
     [r"(restricao|suspensao).{0,20}visita", r"visita.{0,20}dependente"]),
    ("ALIMENTOS_PROVISORIOS", "22, V", "Alimentos provisórios/provisionais",
     [r"alimentos provis(orios|ionais)", r"prestacao de alimentos"]),
    ("RECONDUCAO_VITIMA", "23, II", "Recondução da ofendida ao domicílio",
     [r"reconducao\b.{0,40}\b(vitima|ofendida|ao lar|domicilio)"]),
    ("MONITORACAO_ELETRONICA", "art. 22", "Monitoração eletrônica",
     [r"monitoracao eletronica", r"tornozeleira"]),
]
_CAT = [(cod, art, rot, [re.compile(g) for g in gs]) for (cod, art, rot, gs) in CATALOGO_MEDIDAS]
_ROTULOS = {cod: rot for (cod, _a, rot, _g) in CATALOGO_MEDIDAS}


def normalizar(texto: str) -> str:
    """Remove acentos e baixa a caixa (NFD + strip combining marks)."""
    nfd = unicodedata.normalize("NFD", texto or "")
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn").lower()


_NEGACAO = re.compile(r"\b(indefiro|indeferi|indeferid\w*|indeferimento|nao defiro|deixo de deferir|rejeito|nao ha (?:elementos|risco))\b")
_DEFERIMENTO = re.compile(r"\b(defiro|deferid\w*|deferi|determin\w*|concedo|concede|acolh\w*|mantenho|mantid\w*|mantem)\b")
_REVOGACAO = re.compile(r"\b(revogo|revogad\w*|revoga(?:-se)?|casso|cassad\w*|torno sem efeito)\b")
_REVOGACAO_TOTAL = re.compile(r"\b(revog\w+|casso|cassad\w*|torno sem efeito)\b[^.;]{0,40}\bmedidas? protetiv")


def segmentar(texto: str) -> list[str]:
    """Divide em cláusulas: alíneas (a) b)…) → incisos romanos → frases → ';'."""
    # 1. Alíneas: marca antes de "x) " no início, ou após ';' ou '.' (com sentinel \x00).
    tmp = re.sub(r"(^|[;.]\s*)(?=[a-z]\)\s)", lambda m: m.group(1) + "\x00", texto, flags=re.M | re.I)
    alinea = [s for s in tmp.split("\x00") if s.strip()]
    if len(alinea) >= 2:
        return alinea
    # 2. Incisos romanos
    por_inciso = re.split(r"(?=\b[IVX]{1,4}\s*[-–]\s)", texto)
    por_inciso = [s for s in por_inciso if re.match(r"^\s*[IVX]{1,4}\s*[-–]", s)]
    if len(por_inciso) >= 2:
        return por_inciso
    # 3. Frases (lookbehind fixo, suportado)
    sentences = [s for s in re.split(r"(?<=\.)\s+", texto) if s.strip()]
    if len(sentences) >= 2:
        return sentences
    # 4. Ponto-e-vírgula
    semic = [s for s in re.split(r";\s*", texto) if s.strip()]
    if len(semic) >= 2:
        return semic
    return [texto]


def _distancia(norm: str) -> Optional[int]:
    m = re.search(r"(\d{1,4})\s*(?:\([^)]*\)\s*)?metros?\b", norm)
    return int(m.group(1)) if m else None


def _protegidos(norm: str) -> list[str]:
    out = []
    if re.search(r"ofendida|vitima", norm): out.append("ofendida")
    if re.search(r"familiar", norm): out.append("familiares")
    if re.search(r"testemunha", norm): out.append("testemunhas")
    return out


def _enriquecer(cod: str, seg_norm: str) -> dict:
    if cod == "PROIBICAO_APROXIMACAO":
        d = _distancia(seg_norm)
        out = {"protegidos": _protegidos(seg_norm)}
        if d is not None:
            out["distancia_metros"] = d
        return out
    if cod == "PROIBICAO_CONTATO":
        return {"protegidos": _protegidos(seg_norm)}
    return {}


def _partes(texto: str) -> tuple[Optional[str], Optional[str]]:
    of = re.search(r"em favor de\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ' ]+?)\s+e,", texto)
    ag = re.search(r"determino que\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ' ]+?)\s+cumpra", texto)
    return (of.group(1).strip() if of else None, ag.group(1).strip() if ag else None)


def _fundamentos(norm: str) -> list[str]:
    out = []
    for m in re.finditer(r"artigos?\s+([\d,\se]+?)\s+da lei", norm):
        for n in re.findall(r"\d+", m.group(1)):
            tag = f"art. {n}"
            if tag not in out:
                out.append(tag)
    return out


def _prazo(norm: str) -> Optional[int]:
    m = re.search(r"prazo de\s+(\d+)\s*\(?[^)]*\)?\s*dias", norm)
    return int(m.group(1)) if m else None


class MedidaParsed(TypedDict, total=False):
    codigo: str
    artigo: str
    rotulo: str
    literal: str
    distancia_metros: int
    protegidos: list


class DecisaoMPU(TypedDict):
    ofendida: Optional[str]
    agressor: Optional[str]
    fundamentos: list
    prazo_dias: Optional[int]
    medidas: list
    medidas_revogadas: list
    revogacao_total: bool


def parse_decisao_mpu(texto: str) -> DecisaoMPU:
    vazio: DecisaoMPU = {"ofendida": None, "agressor": None, "fundamentos": [],
                         "prazo_dias": None, "medidas": [], "medidas_revogadas": [],
                         "revogacao_total": False}
    if not texto or not texto.strip():
        return vazio
    norm_full = normalizar(texto)
    ofendida, agressor = _partes(texto)
    segmentos = segmentar(texto)
    por_codigo: dict[str, dict] = {}
    revogadas: set[str] = set()
    polaridade = "defere"

    for seg in segmentos:
        seg_norm = normalizar(seg)
        if _NEGACAO.search(seg_norm):
            polaridade = "indefere"
        elif _REVOGACAO.search(seg_norm):
            polaridade = "revoga"
        elif _DEFERIMENTO.search(seg_norm):
            polaridade = "defere"
        if polaridade == "indefere":
            continue
        for cod, art, rot, gats in _CAT:
            if not any(g.search(seg_norm) for g in gats):
                continue
            if polaridade == "revoga":
                revogadas.add(cod)
            elif cod not in por_codigo:
                m = {"codigo": cod, "artigo": art, "rotulo": rot, "literal": seg.strip()[:500]}
                m.update(_enriquecer(cod, seg_norm))
                por_codigo[cod] = m

    for cod in por_codigo:
        revogadas.discard(cod)
    revogacao_total = bool(_REVOGACAO_TOTAL.search(norm_full)) and len(por_codigo) == 0

    return {
        "ofendida": ofendida, "agressor": agressor,
        "fundamentos": _fundamentos(norm_full), "prazo_dias": _prazo(norm_full),
        "medidas": list(por_codigo.values()), "medidas_revogadas": list(revogadas),
        "revogacao_total": revogacao_total,
    }


# ── Self-test ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    casos = [
        ("Defiro as medidas protetivas: a) afastamento do lar; b) proibição de aproximação, "
         "à distância mínima de 200 (duzentos) metros da ofendida; c) proibição de contato por "
         "qualquer meio. Pelo prazo de 90 dias, nos termos dos artigos 22 e 23 da Lei 11.340/2006.",
         {"codigos": {"AFASTAMENTO_LAR", "PROIBICAO_APROXIMACAO", "PROIBICAO_CONTATO"},
          "distancia": 200, "prazo": 90}),
        ("Indefiro a proibição de contato; defiro o afastamento do lar.",
         {"codigos": {"AFASTAMENTO_LAR"}, "nao": {"PROIBICAO_CONTATO"}}),
        ("Revogo as medidas protetivas anteriormente deferidas, a pedido da vítima.",
         {"codigos": set(), "revogacao_total": True}),
        ("Intime-se para alegações finais no prazo de 5 dias.", {"codigos": set()}),
    ]
    ok = 0
    for i, (txt, exp) in enumerate(casos, 1):
        r = parse_decisao_mpu(txt)
        cods = {m["codigo"] for m in r["medidas"]}
        passou = cods == exp["codigos"]
        if "distancia" in exp:
            d = next((m.get("distancia_metros") for m in r["medidas"] if m["codigo"] == "PROIBICAO_APROXIMACAO"), None)
            passou = passou and d == exp["distancia"]
        if "prazo" in exp:
            passou = passou and r["prazo_dias"] == exp["prazo"]
        if "nao" in exp:
            passou = passou and not (exp["nao"] & cods)
        if "revogacao_total" in exp:
            passou = passou and r["revogacao_total"] == exp["revogacao_total"]
        print(f"  caso {i}: {'OK' if passou else 'FALHOU'}", "" if passou else f"\n     exp={exp}\n     got medidas={cods} prazo={r['prazo_dias']} revtot={r['revogacao_total']}")
        ok += passou
    print(f"\n{ok}/{len(casos)} casos OK")
    import sys
    sys.exit(0 if ok == len(casos) else 1)
