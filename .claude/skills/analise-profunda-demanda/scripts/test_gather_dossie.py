#!/usr/bin/env python3
"""format_dossie + build_analise_autos_task(dossie). Standalone."""
import sys, json
from pathlib import Path
SCRIPT = Path(__file__).parent / "analise_profunda_autos.py"
src = SCRIPT.read_text()
# carrega só as defs (sem rodar main)
ns = {"__name__": "_t", "__file__": str(SCRIPT)}
exec(compile(src, str(SCRIPT), "exec"), ns)
format_dossie = ns["format_dossie"]
build_task = ns["build_analise_autos_task"]

def main():
    f = 0
    # 1. vazio → ""
    if format_dossie([], [], []) != "":
        print("FAIL vazio deveria ser ''"); f += 1
    # 2. render das 3 seções
    secs = [{"titulo": "Denúncia", "tipo": "peca", "resumo": "MP imputa furto."}]
    regs = [{"data_registro": "2026-06-01T10:00", "tipo": "atendimento", "subtipo": "SOLAR",
             "dossie_atendimento": {"resumo": ["assistido nega autoria"]},
             "enrichment_data": {"key_points": ["álibi", "sem antecedentes"]}}]
    ans = [{"origem": "processo", "resumo": "Tese: insuficiência probatória."}]
    d = format_dossie(secs, regs, ans)
    for needle in ["Dossiê do assistido", "Denúncia", "MP imputa furto",
                   "assistido nega autoria", "pontos-chave", "álibi",
                   "Análises anteriores", "insuficiência probatória"]:
        if needle not in d:
            print(f"FAIL dossiê sem {needle!r}"); f += 1
    # 3. cap ≤3 por tipo
    many = [{"data_registro": f"2026-06-0{i}", "tipo": "atendimento",
             "conteudo": f"consulta {i}"} for i in range(1, 9)]
    d3 = format_dossie([], many, [])
    if d3.count("consulta ") > 3:
        print(f"FAIL cap por tipo: {d3.count('consulta ')} > 3"); f += 1
    # 4. preferência de campo: resumo (dossie) antes de transcricao_resumo/conteudo
    pref = [{"tipo": "atendimento", "dossie_atendimento": {"resumo": "R-DOSSIE"},
             "transcricao_resumo": "R-TRANSC", "conteudo": "R-CONT"}]
    dp = format_dossie([], pref, [])
    if "R-DOSSIE" not in dp or "R-TRANSC" in dp or "R-CONT" in dp:
        print("FAIL preferência de campo"); f += 1
    # 5. bound total: dossiê gigante truncado
    big = [{"titulo": f"doc{i}", "resumo": "x" * 3000} for i in range(50)]
    db = format_dossie(big, [], [])
    if len(db) > 18000 + 50 or "[…dossiê truncado]" not in db:
        print(f"FAIL bound: len={len(db)}"); f += 1
    # 6. seção sem resumo usa texto_extraido[:2000] truncado
    ts = [{"titulo": "T", "texto_extraido": "y" * 5000}]
    dt = format_dossie(ts, [], [])
    if ("y" * 2000) not in dt or ("y" * 2001) in dt:
        print("FAIL texto_extraido cap 2000"); f += 1
    # 7. build_analise_autos_task: com dossiê no prompt, instrucao_adicional intacto
    t = build_task({"assistido_id": 7, "processo_id": 9}, 5, 13, dossie="## Dossiê\nX")
    if "## Dossiê" not in t["prompt"]:
        print("FAIL dossiê não entrou no prompt"); f += 1
    if json.loads(t["instrucao_adicional"]) != {"demandaId": 5, "fonte": "fase2c"}:
        print("FAIL instrucao_adicional alterado"); f += 1
    # 8. sem dossiê (default) → prompt = título puro (compat com teste existente)
    t0 = build_task({"assistido_id": 7, "processo_id": 9}, 5, 13)
    if "Dossiê" in t0["prompt"] or "demanda 5" not in t0["prompt"]:
        print("FAIL default deveria ser título puro"); f += 1
    print("OK" if not f else f"{f} FALHAS")
    sys.exit(1 if f else 0)

if __name__ == "__main__":
    main()
