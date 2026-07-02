import sys
from pathlib import Path
SRC = (Path(__file__).parent / "seeu_intimacoes_import.py").read_text()

def main():
    fails = 0
    needed = [
        '"pendencias"',                       # entrada no ABAS_SUPORTADAS
        "Pendências de Incidentes",           # label da aba
        "JS_LIST_JUIZOS",                     # descoberta do <select>
        "JS_SELECT_JUIZO",                    # seleção da option
        "parse_pendencias",                   # uso do parser defensivo
        "Pendência de incidente",             # ato
    ]
    for tok in needed:
        if tok not in SRC:
            print(f"FAIL: falta '{tok}'"); fails += 1
    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
