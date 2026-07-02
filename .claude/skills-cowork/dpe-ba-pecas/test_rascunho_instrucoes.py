import sys
from pathlib import Path

def main():
    SRC = (Path(__file__).parent / "SKILL.md").read_text()
    fails = 0
    for tok in ["linhasMestras", "peca_sugerida", "Protocolar", "rascunho_status", "demandaId"]:
        if tok not in SRC:
            print(f"FAIL: falta '{tok}'")
            fails += 1
    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
