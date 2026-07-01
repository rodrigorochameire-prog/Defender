#!/usr/bin/env python3
"""classify() para EP (fase/motivo) e Criminal (autorada/inerte). Standalone."""
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
classify = ns["classify"]

EP = "EXECUCAO_PENAL"
CR = "CRIMINAL_CAMACARI"
CASES = [
    (EP, "Decisão", "atestado de pena; requisitos para progressão de regime preenchidos",
     "Requerimento de progressão", "NORMAL", "execucao_definitiva", "progressao_regime"),
    (EP, "Decisão", "concedo livramento condicional ao apenado",
     "Livramento condicional", "NORMAL", "execucao_definitiva", "livramento_condicional"),
    (EP, "Decisão", "homologo a remição de pena pelos dias trabalhados",
     "Remição de pena", "NORMAL", "execucao_definitiva", "remicao"),
    (EP, "Decisão", "declaro extinta a punibilidade pelo cumprimento integral da pena",
     "Extinção da punibilidade", "ALTA", "execucao_definitiva", "extincao_punibilidade"),
    (CR, "Decisão", "cite-se o réu para apresentar resposta à acusação no prazo de 10 dias, art. 396",
     "Resposta à Acusação", "URGENTE", "resposta_acusacao", "citacao_resposta_acusacao"),
    (CR, "Despacho", "prazo de 5 dias para alegações finais por memoriais",
     "Alegações finais (memoriais)", "URGENTE", "alegacoes_finais", "alegacoes_finais_memoriais"),
]

def main():
    fails = 0
    for atrib, tit, txt, ato, prio, fase, motivo in CASES:
        r = classify(txt, titulo=tit, atribuicao=atrib)
        if r is None:
            print(f"FAIL [{atrib}/{ato}] sem match"); fails += 1; continue
        if r["ato"] != ato or r["prioridade"] != prio or r.get("fase") != fase or r.get("motivo") != motivo:
            print(f"FAIL [{atrib}/{ato}] -> {r['ato']!r}/{r['prioridade']!r}/"
                  f"{r.get('fase')!r}/{r.get('motivo')!r}"); fails += 1
    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
