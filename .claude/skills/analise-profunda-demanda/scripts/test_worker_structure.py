import sys
from pathlib import Path
SRC = (Path(__file__).parent / "analise_profunda_autos.py").read_text()

def main():
    fails = 0
    needed = [
        "def main(", "async def main_async", "baixar_pdf_autos",
        "build_analise_autos_task", "analise_profunda_status",
        "distribuir", "baixando_autos", "analisando", "erro",
        # Fase 2b: roteamento EP→SEEU
        "escolhe_fonte_autos", "baixar_autos_seeu", "_distribuir_autos_multiplos",
        'fonte == "seeu"',
    ]
    for tok in needed:
        if tok not in SRC:
            print(f"FAIL: falta '{tok}' no worker"); fails += 1
    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
