#!/usr/bin/env python3
import sys, json
from pathlib import Path
D = Path(__file__).parent
SCRIPT = D / "analise_profunda_autos.py"
ns = {"__file__": str(SCRIPT), "__name__": "_t"}
exec(compile(SCRIPT.read_text(), str(SCRIPT), "exec"), ns)
parse = ns["parse_associados_panel"]; dv = ns["cnj_dv_ok"]
classif = ns["classificar_relacionado"]; merge = ns["merge_relacionados"]
format_dossie = ns["format_dossie"]
FRANCISCO = (D / "fixtures" / "painel_francisco.txt").read_text()
EDIMILSON = (D / "fixtures" / "painel_edimilson.txt").read_text()

def main():
    f = 0
    # 1. Francisco: 3 relacionados, todos Dependência
    fr = parse(FRANCISCO, "8004897-26.2025.8.05.0039")
    if len(fr) != 3: print(f"FAIL francisco n={len(fr)}"); f += 1
    by = {x["cnj"]: x for x in fr}
    a = by.get("8003770-53.2025.8.05.0039")
    if not a or a["classe"] != "AuPrFl" or a["tipo"] != "Dependência" or a["assunto"] != "Feminicídio":
        print(f"FAIL AuPrFl: {a}"); f += 1
    sig = by.get("8004193-13.2025.8.05.0039")
    if not sig or sig["classe"] != "" or not sig["sigilo"]:
        print(f"FAIL sigiloso (classe deve ser '' e sigilo True): {sig}"); f += 1
    rel = by.get("8004943-15.2025.8.05.0039")
    if not rel or rel["classe"] != "RelPri":
        print(f"FAIL RelPri: {rel}"); f += 1
    # 2. Edimilson: dedup Dependência (IP 1×), Prevenção APri comarca 0001, Desmembramento Juri
    ed = parse(EDIMILSON, "8017921-24.2025.8.05.0039")
    edby = {x["cnj"]: x for x in ed}
    dep = [x for x in ed if x["cnj"] == "0500594-24.2020.8.05.0039"]
    if len(dep) != 1 or dep[0]["classe"] != "IP":
        print(f"FAIL dedup/IP: {dep}"); f += 1
    prev = edby.get("8116550-16.2026.8.05.0001")
    if not prev or prev["tipo"] != "Prevenção" or prev["classe"] != "APri" or prev["comarca"] != "0001":
        print(f"FAIL Prevenção APri 0001: {prev}"); f += 1
    des = edby.get("8013686-77.2026.8.05.0039")
    if not des or des["tipo"] != "Desmembramento" or des["classe"] != "Juri":
        print(f"FAIL Desmembramento Juri: {des}"); f += 1
    # 3. painel vazio → []
    if parse("Vinculação Direta\nProcessos\nAssociação\n0 resultados encontrados", "") != []:
        print("FAIL vazio → []"); f += 1
    # 4. DV
    if not dv("8004943-15.2025.8.05.0039"): print("FAIL dv válido"); f += 1
    if dv("8004943-16.2025.8.05.0039"): print("FAIL dv inválido deveria ser False"); f += 1
    # 5. classificar: 1º grau não-sigiloso DV-ok → baixavel; sigiloso → não; .2.00. → outra corte
    c1 = classif({"cnj": "8004943-15.2025.8.05.0039", "sigilo": False})
    if c1["grau"] != "1º grau" or not c1["baixavel"]: print(f"FAIL classif 1grau: {c1}"); f += 1
    c2 = classif({"cnj": "8004193-13.2025.8.05.0039", "sigilo": True})
    if c2["baixavel"]: print(f"FAIL sigiloso não baixavel: {c2}"); f += 1
    c3 = classif({"cnj": "0000811-91.2023.2.00.0805", "sigilo": False})
    if c3["grau"] != "outra corte": print(f"FAIL grau outra corte: {c3}"); f += 1
    # 6. merge: aba + texto com overlap dedup; item só-texto vira fonte 'texto'/'citado'
    m = merge(fr, ["8004943-15.2025.8.05.0039", "0000811-91.2023.2.00.0805"], "8004897-26.2025.8.05.0039")
    digs = [x["cnj"] for x in m]
    if digs.count("8004943-15.2025.8.05.0039") != 1: print("FAIL merge dedup"); f += 1
    cit = [x for x in m if x["cnj"] == "0000811-91.2023.2.00.0805"]
    if not cit or cit[0]["fonte"] != "texto" or cit[0]["tipo"] != "citado":
        print(f"FAIL merge citado: {cit}"); f += 1
    # 7. format_dossie relacionados
    d = format_dossie([], [], [], relacionados=merge(fr, [], "8004897-26.2025.8.05.0039"))
    if "Processos relacionados" not in d or "8003770-53.2025.8.05.0039" not in d or "🔒" not in d:
        print("FAIL format relacionados"); f += 1
    if "Processos relacionados" in format_dossie([], [], [], relacionados=None):
        print("FAIL relacionados None → sem seção"); f += 1
    print("OK" if not f else f"{f} FALHAS")
    sys.exit(1 if f else 0)

if __name__ == "__main__":
    main()
