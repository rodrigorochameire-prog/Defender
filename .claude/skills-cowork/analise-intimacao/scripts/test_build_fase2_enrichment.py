#!/usr/bin/env python3
"""build_fase2_enrichment: contrato JSON da fase 2. Standalone."""
from __future__ import annotations
import sys
from pathlib import Path

SCRIPT = Path(__file__).parent / "write_analise.py"
ns: dict = {"__file__": str(SCRIPT)}
src = SCRIPT.read_text()
src_no_main = "\n".join(
    l for l in src.splitlines()
    if not l.strip().startswith("main()") and l.strip() != 'if __name__ == "__main__":'
)
exec(src_no_main, ns)
build = ns["build_fase2_enrichment"]

def main():
    fails = 0
    r = {"resumo_objeto": "Pronúncia do réu", "o_que_decidido": "Pronunciado art. 413",
         "o_que_fazer": "Analisar RESE em 5 dias", "cabe_recurso": "sim",
         "recurso_cabivel": "RESE", "fundamento_recurso": "art. 581 IV"}
    p = build(r)
    assert_pairs = [
        (p.get("objeto"), "Pronúncia do réu"),
        (p.get("decidido"), "Pronunciado art. 413"),
        (p.get("providencia"), "Analisar RESE em 5 dias"),
        (p.get("_status"), "concluido"),
        (p.get("_fonte"), "fase2"),
    ]
    for got, exp in assert_pairs:
        if got != exp:
            print(f"FAIL {got!r} != {exp!r}"); fails += 1
    if "objeto" not in p:
        print("FAIL: chave objeto ausente"); fails += 1
    if "rese" not in (p.get("recurso") or "").lower():
        print(f"FAIL recurso -> {p.get('recurso')!r}"); fails += 1
    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
