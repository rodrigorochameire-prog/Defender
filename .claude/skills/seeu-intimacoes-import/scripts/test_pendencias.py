import sys
from pathlib import Path

SCRIPT = Path(__file__).parent / "seeu_intimacoes_import.py"
ns: dict = {"__file__": str(SCRIPT)}
src = SCRIPT.read_text()
src_no_main = "\n".join(
    l for l in src.splitlines()
    if not l.strip().startswith("main()") and l.strip() != 'if __name__ == "__main__":'
)
exec(compile(src_no_main, str(SCRIPT), "exec"), ns)
parse_pendencias = ns["parse_pendencias"]


def check(cond, msg):
    if not cond:
        print(f"FAIL: {msg}")
        return 1
    return 0


def main():
    fails = 0
    # (a) padrão Seq→CNJ conhecido → devolve os blocos com seq/cnj
    padrao = "Seq\n123\n2000029-78.2023.8.05.0039\nExecução da Pena\nFulano de Tal\n"
    r = parse_pendencias(padrao)
    fails += check(len(r) >= 1 and r[0][0] == 123 and r[0][1] == "2000029-78.2023.8.05.0039",
                   f"padrão Seq→CNJ deveria casar, veio {r!r}")

    # (b) conteúdo fora do padrão (sem Seq→CNJ) mas não-vazio → 1 item cru
    fora = "Incidente de excesso de execução aguardando manifestação da Defensoria — Juízo X"
    r = parse_pendencias(fora)
    fails += check(len(r) == 1 and r[0][0] is None and r[0][1] is None and "Incidente" in r[0][2],
                   f"conteúdo fora do padrão deveria virar 1 item cru, veio {r!r}")

    # (c) tabela vazia → []
    for vazio in ["Nenhum registro encontrado", "Não há pendências", "sem pendências", "", "   "]:
        r = parse_pendencias(vazio)
        fails += check(r == [], f"vazio '{vazio[:20]}' deveria dar [], veio {r!r}")

    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
