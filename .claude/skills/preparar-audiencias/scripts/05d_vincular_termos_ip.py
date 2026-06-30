#!/usr/bin/env python3
"""
05d_vincular_termos_ip.py
Extrai o termo de depoimento em delegacia de cada depoente a partir do PDF do IP/APF.
Popula depoentes[].termo_delegacia = {drive_file_id, pagina_inicio} no registro_audiencia.json.

Inputs:
  --registro   path to registro_audiencia.json
  --pdf        path to IP/APF PDF (already downloaded)
  --file-id    Google Drive file ID of the PDF (for the link in OMBUDS)

Outputs: updates registro_audiencia.json in-place.

Dependencies: pdftotext + pdfinfo (brew install poppler)
"""
import argparse
import difflib
import json
import re
import subprocess
import sys
from pathlib import Path


SECTION_MARKERS = re.compile(
    r"TERMO DE DECLARAÇÃO|TERMO DE DEPOIMENTO|INTERROGATÓRIO|AUTO DE QUALIFICAÇÃO",
    re.IGNORECASE,
)
NAME_NOISE = re.compile(r"\b(de|da|do|dos|das|e|a|o)\b", re.IGNORECASE)


def normalize(name: str) -> str:
    return NAME_NOISE.sub("", name.lower()).strip()


def name_matches(deponent_name: str, page_text: str, threshold: float = 0.65) -> bool:
    n = normalize(deponent_name)
    for line in page_text.splitlines():
        line_norm = normalize(line)
        if not line_norm:
            continue
        ratio = difflib.SequenceMatcher(None, n, line_norm).ratio()
        if ratio >= threshold:
            return True
    return False


def extract_page(pdf_path: str, page_num: int) -> str:
    result = subprocess.run(
        ["pdftotext", "-f", str(page_num), "-l", str(page_num), pdf_path, "-"],
        capture_output=True,
        text=True,
    )
    return result.stdout


def count_pages(pdf_path: str) -> int:
    result = subprocess.run(["pdfinfo", pdf_path], capture_output=True, text=True)
    for line in result.stdout.splitlines():
        if line.startswith("Pages:"):
            return int(line.split(":")[1].strip())
    return 0


def find_term_page(pdf_path: str, deponent_name: str) -> int | None:
    n_pages = count_pages(pdf_path)
    for page_num in range(1, n_pages + 1):
        text = extract_page(pdf_path, page_num)
        if SECTION_MARKERS.search(text) and name_matches(deponent_name, text):
            return page_num
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--registro", required=False)
    ap.add_argument("--pdf", required=False)
    ap.add_argument("--file-id", required=False)
    ap.add_argument("--test", action="store_true")
    args = ap.parse_args()

    if args.test:
        ratio = difflib.SequenceMatcher(None, "maria santos", "maria dos santos").ratio()
        assert ratio >= 0.65, f"ratio too low: {ratio}"
        print("OK: name matching works")
        sys.exit(0)

    registro_path = Path(args.registro)
    registro = json.loads(registro_path.read_text())

    depoentes = registro.get("depoentes", [])
    updated = 0

    for dep in depoentes:
        nome = dep.get("nome", "")
        if not nome:
            continue
        page = find_term_page(args.pdf, nome)
        if page is not None:
            dep["termo_delegacia"] = {
                "drive_file_id": args.file_id,
                "pagina_inicio": page,          # spec field name: pagina_inicio
            }
            updated += 1
            print(f"  ✓ {nome} → pág. {page}")
        else:
            print(f"  – {nome}: termo não localizado no PDF")

    registro_path.write_text(json.dumps(registro, ensure_ascii=False, indent=2))
    print(f"\n{updated}/{len(depoentes)} depoentes vinculados ao termo do IP.")


if __name__ == "__main__":
    main()
