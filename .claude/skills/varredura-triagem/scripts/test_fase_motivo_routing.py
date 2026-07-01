#!/usr/bin/env python3
"""Testa fase_motivo_patch: monta o patch de enrichment a partir da regra.
Roda standalone: python3 test_fase_motivo_routing.py (exit 0 = ok)."""
from __future__ import annotations
import sys
from pathlib import Path

SCRIPT = Path(__file__).parent / "varredura_triagem.py"
ns: dict = {"__file__": str(SCRIPT)}
src = SCRIPT.read_text()
src_no_main = "\n".join(
    l for l in src.splitlines()
    if not l.strip().startswith("main()") and l.strip() != 'if __name__ == "__main__":'
)
exec(src_no_main, ns)
fase_motivo_patch = ns["fase_motivo_patch"]

CASES = [
    ({"fase": "pronuncia", "motivo": "decisao_pronuncia"},
     {"fase_processual": "pronuncia", "motivo": "decisao_pronuncia"}),
    ({"fase": None, "motivo": "precatoria"}, {"motivo": "precatoria"}),
    ({"fase": "plenario", "motivo": None}, {"fase_processual": "plenario"}),
    ({"ato": "Ciência"}, {}),  # sem fase/motivo → patch vazio
]

def main():
    fails = 0
    for rule, expected in CASES:
        got = fase_motivo_patch(rule)
        if got != expected:
            print(f"FAIL {rule} -> {got} (esperado {expected})"); fails += 1
    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
