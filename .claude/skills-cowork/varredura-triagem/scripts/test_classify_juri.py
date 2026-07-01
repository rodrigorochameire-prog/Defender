#!/usr/bin/env python3
"""Suite synthetics para classify(atribuicao='JURI_CAMACARI'). Standalone."""
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

A = "JURI_CAMACARI"
# (id, titulo, texto, ato, prioridade, fase, motivo)
CASES = [
    ("pronuncia", "Sentença",
     "PRONUNCIO o réu nos termos do art. 413 do CPP para submetê-lo a julgamento",
     "Analisar pronúncia (RESE)", "URGENTE", "pronuncia", "decisao_pronuncia"),
    ("impronuncia", "Sentença",
     "julgo IMPRONUNCIADO o acusado, art. 414 do CPP",
     "Analisar impronúncia", "ALTA", "pronuncia", "decisao_impronuncia"),
    ("desclassificacao", "Decisão",
     "DESCLASSIFICO a conduta para lesão corporal, remetendo ao juízo comum",
     "Ciência de desclassificação", "NORMAL", "pronuncia", "decisao_desclassificacao"),
    ("plenario", "Decisão",
     "DESIGNO sessão de julgamento pelo Tribunal do Júri em plenário para 20/08/2026",
     "Ciência sessão de plenário", "ALTA", "plenario", "designacao_plenario"),
    ("d422", "Despacho",
     "Preclusa a pronúncia, art. 422 do CPP, apresentem rol de testemunhas para o plenário",
     "Diligências do 422", "ALTA", "preparacao_plenario", "diligencias_422"),
    ("alegacoes_sumario", "Despacho",
     "Encerrada a instrução da primeira fase, prazo de 5 dias para alegações finais do sumário",
     "Alegações finais (sumário)", "URGENTE", "sumario_culpa", "alegacoes_finais_sumario"),
    ("aij_1a", "Decisão",
     "DESIGNO audiência de instrução e julgamento (AIJ) para 10/09/2026",
     "Ciência designação de AIJ", "NORMAL", "sumario_culpa", "designacao_aij_1a_fase"),
    ("apelacao_plenario", "Sentença",
     "Condenado pelo Conselho de Sentença do Tribunal do Júri; intime-se a defesa",
     "Analisar apelação (art. 593 III)", "URGENTE", "pos_julgamento", "intimacao_sentenca_plenario"),
    ("precatoria", "Despacho",
     "Cumpra-se a carta precatória para oitiva de testemunha",
     "Cumprir precatória", "NORMAL", None, "precatoria"),
]

def main():
    fails = 0
    for cid, tit, txt, ato, prio, fase, motivo in CASES:
        r = classify(txt, titulo=tit, atribuicao=A)
        if r is None:
            print(f"FAIL [{cid}] sem match"); fails += 1; continue
        if r["ato"] != ato or r["prioridade"] != prio or r.get("fase") != fase or r.get("motivo") != motivo:
            print(f"FAIL [{cid}] -> ato={r['ato']!r} prio={r['prioridade']!r} "
                  f"fase={r.get('fase')!r} motivo={r.get('motivo')!r}"); fails += 1
    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
