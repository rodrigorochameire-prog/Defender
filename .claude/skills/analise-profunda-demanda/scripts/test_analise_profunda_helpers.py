import sys, json
from pathlib import Path

SCRIPT = Path(__file__).parent / "analise_profunda_autos.py"
ns: dict = {"__file__": str(SCRIPT)}
src = SCRIPT.read_text()
src_no_main = "\n".join(
    l for l in src.splitlines()
    if not l.strip().startswith("main()") and l.strip() != 'if __name__ == "__main__":'
)
exec(compile(src_no_main, str(SCRIPT), "exec"), ns)
parse_args_meta = ns["parse_args_meta"]
build_analise_autos_task = ns["build_analise_autos_task"]

def check(cond, msg):
    if not cond:
        print(f"FAIL: {msg}"); return 1
    return 0

def main():
    fails = 0
    m = parse_args_meta(["--demanda-id", "5", "--processo-id", "7", "--assistido-id", "9",
                         "--atribuicao", "VVD_CAMACARI", "--defensor-id", "13"])
    fails += check(m["demanda_id"] == 5 and m["processo_id"] == 7 and m["assistido_id"] == 9, "parse_args_meta ids")
    fails += check(m["atribuicao"] == "VVD_CAMACARI" and m["defensor_id"] == 13, "parse_args_meta atrib/def")

    row = {"assistido_id": 9, "processo_id": 7}
    task = build_analise_autos_task(row, demanda_id=5, created_by=13)
    fails += check(task["skill"] == "analise-autos", "skill analise-autos")
    fails += check(task["lane"] == "ai", "lane ai")
    fails += check(task["assistido_id"] == 9 and task["processo_id"] == 7, "task fks")
    meta = json.loads(task["instrucao_adicional"])
    fails += check(meta.get("demandaId") == 5, "demandaId embutido no meta ai")

    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
