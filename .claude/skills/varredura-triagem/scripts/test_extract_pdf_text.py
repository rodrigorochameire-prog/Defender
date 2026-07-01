#!/usr/bin/env python3
"""extract_pdf_text: pdftotext + fallback OCR. Standalone."""
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
extract = ns["extract_pdf_text"]

def main():
    fails = 0
    pdf = Path(__file__).parent / "tests" / "fixtures" / "sample_text.pdf"
    txt = extract(str(pdf))
    if "instrucao e julgamento" not in txt.lower():
        print(f"FAIL texto não extraído -> {txt!r}"); fails += 1
    # arquivo inexistente NUNCA lança, retorna ""
    if extract("/nao/existe.pdf") != "":
        print("FAIL: inexistente deveria retornar ''"); fails += 1
    print("OK" if not fails else f"{fails} FALHAS")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
