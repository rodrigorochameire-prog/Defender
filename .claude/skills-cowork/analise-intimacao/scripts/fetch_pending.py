#!/usr/bin/env python3
"""
fetch_pending.py — retorna, em JSON, os registros base PENDENTES de enriquecimento
IA para as demandas informadas. Consumido pela skill `analise-intimacao` (lane=ai).

Uso:
    python3 fetch_pending.py --ids 101,102,103

Saída (stdout): JSON array de objetos:
    [{ registro_id, demanda_id, ato, tipo_registro, is_mpu, tipo_intimacao,
       assistido, processo, raw_text }]
Só inclui registros com enrichment_status='pending' (idempotente: já-done não volta).
"""
import argparse, json, re, sys, urllib.request, urllib.error
from pathlib import Path


def load_env() -> dict:
    # PROJECT_DIR = .claude/skills-cowork/analise-intimacao/scripts → parents[4]
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids", required=True, help="CSV de demanda_ids")
    args = ap.parse_args()
    ids = [s.strip() for s in args.ids.split(",") if s.strip()]
    if not ids:
        print("[]"); return

    env = load_env()
    url = env.get("NEXT_PUBLIC_SUPABASE_URL"); key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERRO: env Supabase ausente", file=sys.stderr); sys.exit(1)
    hdr = {"apikey": key, "Authorization": f"Bearer {key}"}

    def get(path):
        req = urllib.request.Request(url.rstrip("/") + path, headers=hdr)
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode() or "[]")

    in_ids = ",".join(ids)
    # registros base pendentes dessas demandas
    regs = get(
        f"/rest/v1/registros?demanda_id=in.({in_ids})&enrichment_status=eq.pending"
        "&select=id,demanda_id,titulo,tipo,enrichment_data"
    )
    # contexto das demandas (assistido, processo, classe da intimação)
    dem = get(
        f"/rest/v1/demandas?id=in.({in_ids})&select=id,ato,enrichment_data,"
        "assistidos(nome),processos(numero_autos,tipo_processo,"
        "processosVvd:processos_vvd(tipo_processo,mpu_ativa))"
    )
    by_dem = {d["id"]: d for d in dem}

    def is_mpu(d):
        proc = d.get("processos") or {}
        pv = (proc.get("processosVvd") or [{}])
        pv = pv[0] if isinstance(pv, list) and pv else (pv or {})
        if pv.get("tipo_processo") == "MPU" or pv.get("mpu_ativa") is True:
            return True
        num = proc.get("numero_autos") or ""
        if isinstance(num, str) and num.startswith("MPUMP"):
            return True
        intim = (d.get("enrichment_data") or {}).get("tipo_processo") or ""
        return isinstance(intim, str) and intim.upper().startswith("MPU")

    out = []
    for r in regs:
        d = by_dem.get(r["demanda_id"], {})
        proc = d.get("processos") or {}
        raw = (r.get("enrichment_data") or {}).get("raw_text") or ""
        out.append({
            "registro_id": r["id"],
            "demanda_id": r["demanda_id"],
            "ato": r.get("titulo") or d.get("ato"),
            "tipo_registro": r.get("tipo"),
            "is_mpu": is_mpu(d),
            "tipo_intimacao": (d.get("enrichment_data") or {}).get("tipo_processo"),
            "assistido": (d.get("assistidos") or {}).get("nome"),
            "processo": proc.get("numero_autos"),
            "raw_text": raw[:8000],
        })
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
