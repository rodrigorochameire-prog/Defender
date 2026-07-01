#!/usr/bin/env python3
"""
write_analise.py — grava as anotações de IA e marca os registros base como
enriquecidos. Consumido pela skill `analise-intimacao` (lane=ai).

Uso:
    python3 write_analise.py < resultados.json
    (ou)  echo '<json>' | python3 write_analise.py

Entrada (stdin): JSON array de resultados, um por demanda:
  [{
    "registro_id": 123,         # registro base (ciência/diligência) a marcar done
    "demanda_id": 45,
    "assistido_id": 9, "processo_id": 7,   # p/ os novos registros
    "resumo_objeto": "...",     # **Objeto** — o que é a intimação
    "o_que_decidido": "...|null",  # **O que foi decidido**
    "o_que_fazer": "...",       # **Providência/Prazo** — providência objetiva
    "cabe_recurso": "sim|nao|talvez|null",
    "recurso_cabivel": "apelação|RESE|ED|REsp|RE|null",
    "fundamento_recurso": "...|null",
    "ato_atual": "...|null",       # ato atual da demanda (veio do fetch)
    "ato_sugerido": "...|null",    # ato do vocabulário canônico da atribuição
    "ato_confianca": "alta|media|baixa|null",
    "relato_vitima": "...|null",   # só MPU
    "termos_pronuncia": "...|null" # só pronúncia
  }]

Sugestão de ato: aplica `ato_sugerido` em demandas.ato SOMENTE quando
`ato_confianca='alta'` E o `ato_atual` for genérico (ATO_GENERICO). Nunca
sobrescreve ato específico já definido. Quando ajusta, anexa ao corpo da anotação a
linha "Ato ajustado: <antigo> → <novo>".

Idempotente: não recria anotação com o mesmo título na demanda; marca o registro
base enrichment_status='done'. AUTOR_ID configurável por env DEFENSOR_ID (default 1).
"""
import json, os, re, sys, urllib.request, urllib.error
from datetime import datetime
from pathlib import Path
from urllib.parse import quote


def load_env() -> dict:
    candidates = [
        Path(__file__).resolve().parents[4] / ".env.local",
        Path.cwd() / ".env.local",
        Path("/Users/rodrigorochameire/Projetos/Defender/.env.local"),
    ]
    env = {}
    for p in candidates:
        if p.exists():
            for line in p.read_text().splitlines():
                m = re.match(r"\s*([A-Z_]+)\s*=\s*(.*)\s*$", line)
                if m:
                    env[m.group(1)] = m.group(2).strip().strip('"').strip("'").replace("\\n", "")
            break
    return env


ENV = load_env()
URL = (ENV.get("NEXT_PUBLIC_SUPABASE_URL") or "").rstrip("/")
KEY = ENV.get("SUPABASE_SERVICE_ROLE_KEY")
AUTOR_ID = int(os.environ.get("DEFENSOR_ID", "1"))
HDR = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

# Atos genéricos que a IA pode refinar com confiança alta. Ato específico fora
# desta lista NUNCA é sobrescrito.
ATO_GENERICO = {
    "Analisar decisão", "Analisar sentença", "Analisar acórdão",
    "Ciência", "Ciência de decisão", "Cumprir despacho",
}


def req(method, path, body=None, prefer=None):
    h = dict(HDR)
    if prefer:
        h["Prefer"] = prefer
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(URL + path, data=data, headers=h, method=method)
    with urllib.request.urlopen(r, timeout=30) as resp:
        t = resp.read().decode()
        return json.loads(t) if t else {}


def registro_exists(demanda_id, titulo) -> bool:
    rows = req("GET", f"/rest/v1/registros?demanda_id=eq.{demanda_id}&titulo=eq.{quote(titulo)}&select=id&limit=1")
    return bool(rows)


def get_registro_id(demanda_id, titulo):
    """id do registro de análise com este título (ou None)."""
    rows = req("GET", f"/rest/v1/registros?demanda_id=eq.{demanda_id}"
                      f"&titulo=eq.{quote(titulo)}&tipo=eq.analise&select=id&limit=1")
    return rows[0]["id"] if isinstance(rows, list) and rows else None


def insert_registro(reg):
    req("POST", "/rest/v1/registros", reg, prefer="return=minimal")


def update_demanda_ato(demanda_id, novo_ato):
    req("PATCH", f"/rest/v1/demandas?id=eq.{demanda_id}", {"ato": novo_ato},
        prefer="return=minimal")


def _strip_label(value, *labels) -> str:
    """Remove rótulo duplicado e markdown que a IA possa ter prefixado no valor
    (ex.: "**Objeto:** Objeto: ..." → "..."). Tolera asteriscos e ':' ou '-'."""
    v = (value or "").strip().lstrip("*").strip()
    for lbl in labels:
        # remove "Label:" / "Label -" repetido no início, possivelmente 2x
        pat = re.compile(rf"^\**\s*{re.escape(lbl)}\s*[:\-–]\s*", re.IGNORECASE)
        for _ in range(2):
            nv = pat.sub("", v)
            if nv == v:
                break
            v = nv.strip().lstrip("*").strip()
    return v.replace("**", "").strip()


# Enum fechado de peças sugeridas (sinal p/ o pipeline profundo — SEEU Fase 2a/2c).
# Valor fora da lista → tratado como ausente (não dispara requer_analise_profunda).
_PECAS_VALIDAS = {
    "memoriais", "resposta_acusacao", "apelacao", "rese",
    "manifestacao_ep", "contrarrazoes",
}


def build_fase2_enrichment(r: dict) -> dict:
    """Contrato JSON (spec §A2.2) da fase 2, a partir do payload da IA.
    'objeto' SEMPRE presente (marcador da query do card).

    Inclui também o SINAL do pipeline profundo (SEEU Fase 2a): `peca_sugerida`
    (enum fechado) e `requer_analise_profunda == (peca_sugerida is not None)` —
    coexistindo com o contrato de paridade (objeto/decidido/providencia/_status)."""
    cr = (r.get("cabe_recurso") or "").lower()
    recurso = ""
    if cr in ("sim", "talvez"):
        rec = r.get("recurso_cabivel") or "recurso"
        fund = f" — {r['fundamento_recurso'].strip()}" if r.get("fundamento_recurso") else ""
        recurso = f"{cr} · {rec}{fund}"
    elif cr == "nao":
        recurso = "não"
    peca = (r.get("peca_sugerida") or "").strip()
    peca = peca if peca in _PECAS_VALIDAS else None
    return {
        "objeto": _strip_label(r.get("resumo_objeto") or "", "objeto"),
        "decidido": _strip_label(r.get("o_que_decidido") or "", "o que foi decidido"),
        "providencia": _strip_label(r.get("o_que_fazer") or "", "providência/prazo",
                                    "providencia/prazo", "providência", "providencia"),
        "prazo": "",
        "recurso": recurso,
        "peca_sugerida": peca,
        "requer_analise_profunda": peca is not None,
        "_status": "concluido",
        "_fonte": "fase2",
    }


def resolve_ctx(r) -> tuple:
    """Resolve (assistido_id, processo_id) — usa os do resultado se vierem; senão
    busca no registro base (registro_id) ou na própria demanda. registros.assistido_id
    é NOT NULL, então isto é obrigatório antes de inserir."""
    aid, pid = r.get("assistido_id"), r.get("processo_id")
    if aid:
        return aid, pid
    rid = r.get("registro_id")
    if rid:
        rows = req("GET", f"/rest/v1/registros?id=eq.{rid}&select=assistido_id,processo_id")
        if rows:
            return rows[0].get("assistido_id"), (pid or rows[0].get("processo_id"))
    did = r.get("demanda_id")
    if did:
        rows = req("GET", f"/rest/v1/demandas?id=eq.{did}&select=assistido_id,processo_id")
        if rows:
            return rows[0].get("assistido_id"), (pid or rows[0].get("processo_id"))
    return aid, pid


def main():
    if not URL or not KEY:
        print("ERRO: env Supabase ausente", file=sys.stderr); sys.exit(1)
    raw = sys.stdin.read()
    try:
        resultados = json.loads(raw)
    except Exception as e:
        print(f"ERRO: JSON inválido: {e}", file=sys.stderr); sys.exit(1)
    if not isinstance(resultados, list):
        resultados = [resultados]

    n_anota, n_relato, n_ato = 0, 0, 0
    for r in resultados:
        demanda_id = r.get("demanda_id")
        if not demanda_id:
            continue
        assistido_id, processo_id = resolve_ctx(r)
        if not assistido_id:
            print(f"  ⚠ demanda {demanda_id}: sem assistido_id (pulando)", file=sys.stderr)
            continue
        base = {
            "assistido_id": assistido_id, "processo_id": processo_id,
            "demanda_id": demanda_id, "data_registro": datetime.now().isoformat(),
            "autor_id": AUTOR_ID, "status": "realizado",
        }
        # --- Sugestão de ato (No Invention; só refina ato genérico c/ confiança alta) ---
        ato_atual = (r.get("ato_atual") or "").strip()
        ato_sug = (r.get("ato_sugerido") or "").strip()
        ato_conf = (r.get("ato_confianca") or "").strip().lower()
        ato_ajuste = None  # (antigo, novo) quando houver troca
        if (ato_sug and ato_conf == "alta" and ato_atual in ATO_GENERICO
                and ato_sug != ato_atual):
            ato_ajuste = (ato_atual, ato_sug)
        # Confiança média/baixa na classificação do ato → sinaliza revisão humana.
        # Só marca True (nunca rebaixa). Roda para toda demanda, independente de
        # ter havido troca de ato ou gravação de registro.
        if ato_conf in ("media", "baixa"):
            try:
                req("PATCH", f"/rest/v1/demandas?id=eq.{demanda_id}",
                    {"revisao_pendente": True}, prefer="return=minimal")
            except Exception as e:
                print(f"  ⚠ falha ao marcar revisao_pendente demanda {demanda_id}: {e}", file=sys.stderr)
        # --- Anotação principal: resumo ESTRUTURADO (+ recurso preliminar, se houver) ---
        # Texto puro (sem markdown) com rótulo "Label: valor". _strip_label evita
        # rótulo duplicado quando a IA já prefixa o valor (ex.: "Objeto: Objeto: ...").
        corpo = []
        if r.get("resumo_objeto"):
            corpo.append(f"Objeto: {_strip_label(r['resumo_objeto'], 'objeto')}")
        if r.get("o_que_decidido"):
            corpo.append(f"O que foi decidido: {_strip_label(r['o_que_decidido'], 'o que foi decidido')}")
        if r.get("o_que_fazer"):
            corpo.append(f"Providência/Prazo: {_strip_label(r['o_que_fazer'], 'providência/prazo', 'providencia/prazo', 'providência', 'providencia')}")
        cr = (r.get("cabe_recurso") or "").lower()
        if cr in ("sim", "talvez"):
            rec = r.get("recurso_cabivel") or "recurso"
            fund = f" — {r['fundamento_recurso'].strip()}" if r.get("fundamento_recurso") else ""
            corpo.append(f"Cabe recurso? (análise preliminar — revisar): {cr} · {rec}{fund}")
        elif cr == "nao":
            corpo.append("Cabe recurso? (análise preliminar — revisar): não")
        if ato_ajuste:
            corpo.append(f"Ato ajustado: {ato_ajuste[0]} → {ato_ajuste[1]}")
        titulo = "Resumo e providências"
        if corpo:
            enr = build_fase2_enrichment(r)
            rid = get_registro_id(demanda_id, titulo)
            if rid:  # registro da fase 1 (ou re-run) → ATUALIZA in-place
                req("PATCH", f"/rest/v1/registros?id=eq.{rid}",
                    {"conteudo": "\n".join(corpo), "enrichment_data": enr},
                    prefer="return=minimal")
            else:
                insert_registro({**base, "tipo": "analise", "titulo": titulo,
                                 "conteudo": "\n".join(corpo), "enrichment_data": enr})
            n_anota += 1
            if ato_ajuste:
                try:
                    update_demanda_ato(demanda_id, ato_ajuste[1])
                    n_ato += 1
                except Exception as e:
                    print(f"  ⚠ falha ao ajustar ato demanda {demanda_id}: {e}", file=sys.stderr)
        # MPU: relato da suposta vítima (registro separado)
        if r.get("relato_vitima"):
            t2 = "Relato da suposta vítima"
            if not registro_exists(demanda_id, t2):
                insert_registro({**base, "tipo": "analise", "titulo": t2,
                                 "conteudo": r["relato_vitima"].strip()})
                n_relato += 1
        # Pronúncia: termos (anexa à anotação principal se houver corpo dedicado)
        if r.get("termos_pronuncia"):
            t3 = "Termos da pronúncia"
            if not registro_exists(demanda_id, t3):
                insert_registro({**base, "tipo": "analise", "titulo": t3,
                                 "conteudo": r["termos_pronuncia"].strip()})
        # Marca o registro base como enriquecido (done)
        if r.get("registro_id"):
            try:
                req("PATCH", f"/rest/v1/registros?id=eq.{r['registro_id']}",
                    {"enrichment_status": "done", "enriched_at": datetime.now().isoformat()},
                    prefer="return=minimal")
            except Exception as e:
                print(f"  ⚠ falha ao marcar done reg {r['registro_id']}: {e}", file=sys.stderr)

    print(json.dumps({"anotacoes": n_anota, "relatos": n_relato,
                      "atos_ajustados": n_ato, "total": len(resultados)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
