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
    "resumo_objeto": "...",     # o que é a intimação
    "o_que_fazer": "...",       # providência objetiva
    "cabe_recurso": "sim|nao|talvez|null",
    "recurso_cabivel": "apelação|RESE|ED|REsp|RE|null",
    "fundamento_recurso": "...|null",
    "relato_vitima": "...|null",   # só MPU
    "termos_pronuncia": "...|null" # só pronúncia
  }]

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


def insert_registro(reg):
    req("POST", "/rest/v1/registros", reg, prefer="return=minimal")


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

    n_anota, n_relato = 0, 0
    for r in resultados:
        demanda_id = r.get("demanda_id")
        if not demanda_id:
            continue
        base = {
            "assistido_id": r.get("assistido_id"), "processo_id": r.get("processo_id"),
            "demanda_id": demanda_id, "data_registro": datetime.now().isoformat(),
            "autor_id": AUTOR_ID, "status": "realizado",
        }
        # Anotação principal: resumo + o que fazer (+ recurso, se houver)
        corpo = []
        if r.get("resumo_objeto"):
            corpo.append(r["resumo_objeto"].strip())
        if r.get("o_que_fazer"):
            corpo.append(f"\n**O que fazer:** {r['o_que_fazer'].strip()}")
        cr = (r.get("cabe_recurso") or "").lower()
        if cr in ("sim", "talvez"):
            rec = r.get("recurso_cabivel") or "recurso"
            fund = f" — {r['fundamento_recurso'].strip()}" if r.get("fundamento_recurso") else ""
            corpo.append(f"\n**Cabe recurso? (análise preliminar — revisar):** {cr} · {rec}{fund}")
        elif cr == "nao":
            corpo.append("\n**Cabe recurso? (análise preliminar — revisar):** não")
        titulo = "Resumo e providências"
        if corpo and not registro_exists(demanda_id, titulo):
            insert_registro({**base, "tipo": "anotacao", "titulo": titulo,
                             "conteudo": "\n".join(corpo)})
            n_anota += 1
        # MPU: relato da suposta vítima (registro separado)
        if r.get("relato_vitima"):
            t2 = "Relato da suposta vítima"
            if not registro_exists(demanda_id, t2):
                insert_registro({**base, "tipo": "anotacao", "titulo": t2,
                                 "conteudo": r["relato_vitima"].strip()})
                n_relato += 1
        # Pronúncia: termos (anexa à anotação principal se houver corpo dedicado)
        if r.get("termos_pronuncia"):
            t3 = "Termos da pronúncia"
            if not registro_exists(demanda_id, t3):
                insert_registro({**base, "tipo": "anotacao", "titulo": t3,
                                 "conteudo": r["termos_pronuncia"].strip()})
        # Marca o registro base como enriquecido (done)
        if r.get("registro_id"):
            try:
                req("PATCH", f"/rest/v1/registros?id=eq.{r['registro_id']}",
                    {"enrichment_status": "done", "enriched_at": datetime.now().isoformat()},
                    prefer="return=minimal")
            except Exception as e:
                print(f"  ⚠ falha ao marcar done reg {r['registro_id']}: {e}", file=sys.stderr)

    print(json.dumps({"anotacoes": n_anota, "relatos": n_relato, "total": len(resultados)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
