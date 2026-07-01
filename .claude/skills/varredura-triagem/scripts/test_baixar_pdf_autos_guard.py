#!/usr/bin/env python3
"""baixar_pdf_autos: trava anti-ciência (rejeição sem browser). Standalone.

A trava roda e retorna None ANTES de ctx.new_page() ser chamado — por isso é
testável com ctx=None e SEM sessão viva/browser. Esta suíte é uma
característica-lock (lock test) do invariante mais crítico do codebase:
qualquer URL que não seja explicitamente "autos completos"
(listProcessoCompletoAdvogado.seam) deve ser recusada, retornando None,
sem jamais tocar em ctx (o que provaria que a trava não executou antes do
browser)."""
from __future__ import annotations
import asyncio
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
baixar_pdf_autos = ns["baixar_pdf_autos"]

REJECT_URLS = [
    "https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/visualizarExpediente.seam?idProcessoDocumento=123",
    "https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/TomarCiencia.seam?id=1",
    "https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/tomarciencia.seam?id=1",
    "https://pje.tjba.jus.br/pje/Painel/painelUsuario/listView.seam",
    "",
]


def main():
    fails = 0
    for url in REJECT_URLS:
        try:
            result = asyncio.run(baixar_pdf_autos(None, url))
        except Exception as e:
            print(f"FAIL: url={url!r} levantou exceção em vez de retornar None -> {e!r}")
            fails += 1
            continue
        if result is not None:
            print(f"FAIL: url={url!r} deveria retornar None (recusa anti-ciência), retornou {result!r}")
            fails += 1

    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
