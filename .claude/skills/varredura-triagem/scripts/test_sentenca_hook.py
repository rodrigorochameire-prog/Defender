#!/usr/bin/env python3
"""is_sentenca_ato + build_sentenca_task. Standalone."""
from __future__ import annotations
import sys, json
from pathlib import Path
SCRIPT = Path(__file__).parent / "varredura_triagem.py"
ns: dict = {"__file__": str(SCRIPT)}
src = SCRIPT.read_text()
src_no_main = "\n".join(l for l in src.splitlines()
    if not l.strip().startswith("main()") and l.strip() != 'if __name__ == "__main__":')
exec(src_no_main, ns)
is_sentenca_ato = ns["is_sentenca_ato"]
build_sentenca_task = ns["build_sentenca_task"]

def main():
    fails = 0
    SENT = ["Analisar sentença", "Ciência condenação", "Ciência absolvição",
            "Analisar pronúncia (RESE)", "Analisar impronúncia", "Ciência de desclassificação"]
    NOT = ["Ciência acórdão", "Analisar acórdão", "Ciência", "Resposta à Acusação"]
    for a in SENT:
        if not is_sentenca_ato(a): print(f"FAIL deveria ser sentença: {a!r}"); fails += 1
    for a in NOT:
        if is_sentenca_ato(a): print(f"FAIL NÃO deveria ser sentença: {a!r}"); fails += 1
    demanda = {"id": 42, "assistido_id": 7, "processo_id": 9,
               "processos": {"numero_autos": "8000000-00.2026.8.05.0039", "atribuicao": "JURI_CAMACARI"}}
    task = build_sentenca_task(demanda, {"ato": "Analisar sentença"}, "corpo da sentença", "doc-123")
    checks = [(task["skill"], "analise-sentenca"), (task["lane"], "browser"),
              (task["created_by"], 1), (task["assistido_id"], 7), (task["processo_id"], 9)]
    for got, exp in checks:
        if got != exp: print(f"FAIL task {got!r}!={exp!r}"); fails += 1
    ia = json.loads(task["instrucao_adicional"])
    for k in ("numero_processo", "pje_documento_id", "assistido_id", "atribuicao", "demanda_origem_id", "registro_raw_text"):
        if k not in ia: print(f"FAIL instrucao_adicional sem {k}"); fails += 1
    if ia["pje_documento_id"] != "doc-123" or ia["demanda_origem_id"] != 42: print("FAIL payload ids"); fails += 1
    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
