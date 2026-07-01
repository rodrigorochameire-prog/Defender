#!/usr/bin/env python3
"""build_fase1_analise: payload determinístico do contrato de análise. Standalone."""
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
build = ns["build_fase1_analise"]

def main():
    fails = 0
    rule = {"ato": "Analisar pronúncia (RESE)", "prazo_dias": 5}

    # não-administrativo + conteúdo lido -> pendente (IA vai enriquecer)
    p = build(rule, content_ok=True)
    if p.get("_status") != "pendente" or p.get("_fonte") != "fase1":
        print(f"FAIL status/fonte -> {p}"); fails += 1
    if "objeto" not in p:  # marcador do contrato SEMPRE presente
        print(f"FAIL sem chave objeto -> {p}"); fails += 1
    if p.get("providencia") != "Analisar pronúncia (RESE)":
        print(f"FAIL providencia -> {p}"); fails += 1

    # não-administrativo + corpo vazio -> nao_lido (revisão manual)
    p2 = build(rule, content_ok=False)
    if p2.get("_status") != "nao_lido":
        print(f"FAIL nao_lido -> {p2}"); fails += 1
    if "objeto" not in p2:
        print(f"FAIL nao_lido sem objeto -> {p2}"); fails += 1

    # ato administrativo (nota terminal, skip_ai) -> concluido, mesmo que lido
    rule_admin = {"ato": "Remessa ao MP", "prazo_dias": None,
                  "extras": {"nota": "Remessa ao MP"}}
    p3 = build(rule_admin, content_ok=True, is_admin=True)
    if p3.get("_status") != "concluido":
        print(f"FAIL admin -> esperado concluido, veio {p3}"); fails += 1
    if "objeto" not in p3:
        print(f"FAIL admin sem objeto -> {p3}"); fails += 1

    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
