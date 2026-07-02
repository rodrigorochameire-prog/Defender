#!/usr/bin/env python3
"""sentenca_ja_processada. Standalone."""
import sys
from pathlib import Path
SCRIPT = Path(__file__).parent / "varredura_triagem.py"
ns = {"__file__": str(SCRIPT), "__name__": "_t"}
src = SCRIPT.read_text()
src_no_main = "\n".join(l for l in src.splitlines()
    if not l.strip().startswith("main()") and l.strip() != 'if __name__ == "__main__":')
exec(compile(src_no_main, str(SCRIPT), "exec"), ns)
guard = ns["sentenca_ja_processada"]

def main():
    f = 0
    class SB:
        def __init__(self, sent=None, task=None, boom=False):
            self.sent, self.task, self.boom = sent or [], task or [], boom
        def _req(self, method, path):
            if self.boom:
                raise RuntimeError("net")
            if "/sentencas?" in path:
                return self.sent
            if "claude_code_tasks?" in path:
                return self.task
            return []
    # 1. sentença já existe → True
    if guard(SB(sent=[{"id": 1}]), 9, "doc-1") is not True:
        print("FAIL sentença existente → True"); f += 1
    # 2. sem sentença + task pendente → True
    if guard(SB(sent=[], task=[{"id": 2}]), 9, "doc-1") is not True:
        print("FAIL task pendente → True"); f += 1
    # 3. nenhum → False
    if guard(SB(sent=[], task=[]), 9, "doc-1") is not False:
        print("FAIL nenhum → False"); f += 1
    # 4. erro no _req → False (fail-open)
    if guard(SB(boom=True), 9, "doc-1") is not False:
        print("FAIL erro → False (fail-open)"); f += 1
    # 5. sem processo_id → não quebra (checa só o que dá) → False se nada
    if guard(SB(sent=[], task=[]), None, "doc-1") is not False:
        print("FAIL sem proc_id → False"); f += 1
    print("OK" if not f else f"{f} FALHAS")
    sys.exit(1 if f else 0)

if __name__ == "__main__":
    main()
