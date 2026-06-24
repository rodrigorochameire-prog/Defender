#!/usr/bin/env python3
"""
Organiza PDFs baixados e detecta duplicatas por hash.

Para cada processo da pauta do dia, varre:
  1. A pasta de destino canônica (`<assistido>/<numero_autos>/`)
  2. Pastas-padrão de download em ~/Desktop (`pje-autos-vvd`, `pje-autos-juri`)

E:
  - Renomeia PDFs com nomes longos do PJe para o padrão
    `Autos Digitais - <numero_autos>.pdf` na pasta canônica do Drive.
  - Detecta duplicatas por hash SHA-256 (não duplica no Drive).
  - Move sobras de ~/Desktop para a pasta canônica.

Uso:
  python3 .claude/skills-cowork/preparar-audiencias/scripts/05_organizar.py 2026-05-05
"""
import argparse
import hashlib
import json
import shutil
import sys
from pathlib import Path

DESKTOP_DIRS = [
    Path.home() / "Desktop" / "pje-autos-vvd",
    Path.home() / "Desktop" / "pje-autos-juri",
    Path.home() / "Desktop" / "pje-autos-ep",
]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def find_pdf_for_processo(numero_autos: str) -> list[Path]:
    """Procura PDFs cujo nome contenha o numero_autos (com ou sem . e -)."""
    norm = numero_autos.replace(".", "").replace("-", "")
    found: list[Path] = []
    for d in DESKTOP_DIRS:
        if not d.exists():
            continue
        for f in d.glob("**/*.pdf"):
            n = f.name.replace(".", "").replace("-", "")
            if numero_autos in f.name or norm in n:
                found.append(f)
    return found


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("dia")
    parser.add_argument("--keep-desktop", action="store_true",
                        help="Não apagar PDFs do Desktop após mover")
    args = parser.parse_args()

    pastas = json.loads(Path(f"/tmp/pastas-{args.dia}.json").read_text())

    summary = {"renamed": 0, "moved": 0, "duplicates": 0, "untouched": 0}

    for p in pastas:
        canonical_dir = Path(p["pasta_autos"])
        canonical_pdf = canonical_dir / f"Autos Digitais - {p['numero_autos']}.pdf"

        # 1) Coletar PDFs candidatos
        candidates: list[Path] = []
        if canonical_dir.exists():
            for f in canonical_dir.glob("*.pdf"):
                candidates.append(f)
        candidates.extend(find_pdf_for_processo(p["numero_autos"]))

        candidates = list({str(c): c for c in candidates}.values())
        if not candidates:
            continue

        print(f"\n=== {p['nome']} · {p['numero_autos']} ===")

        # 2) Hashear para detectar duplicata
        canonical_dir.mkdir(parents=True, exist_ok=True)
        hashes_seen: dict[str, Path] = {}
        if canonical_pdf.exists():
            hashes_seen[sha256(canonical_pdf)] = canonical_pdf

        for src in candidates:
            try:
                h = sha256(src)
            except Exception as e:
                print(f"  ! erro hashing {src}: {e}")
                continue

            if h in hashes_seen:
                if src.resolve() != hashes_seen[h].resolve():
                    print(f"  [dup] {src.name} (hash idêntico ao já presente) — descartando")
                    if not args.keep_desktop and any(str(src).startswith(str(d)) for d in DESKTOP_DIRS):
                        src.unlink()
                    summary["duplicates"] += 1
                continue

            hashes_seen[h] = src

            if not canonical_pdf.exists():
                # Mover/copiar para o nome canônico
                if any(str(src).startswith(str(d)) for d in DESKTOP_DIRS):
                    shutil.move(str(src), str(canonical_pdf))
                    print(f"  [mv] {src} → {canonical_pdf.name}")
                    summary["moved"] += 1
                else:
                    src.rename(canonical_pdf)
                    print(f"  [rename] {src.name} → {canonical_pdf.name}")
                    summary["renamed"] += 1
            else:
                # Já existe um canônico com hash diferente — manter ambos
                fallback = canonical_dir / f"Autos Digitais - {p['numero_autos']} (alt {h[:8]}).pdf"
                if any(str(src).startswith(str(d)) for d in DESKTOP_DIRS):
                    shutil.move(str(src), str(fallback))
                    print(f"  [mv-alt] versão alternativa preservada como {fallback.name}")
                    summary["moved"] += 1
                else:
                    src.rename(fallback)
                    summary["renamed"] += 1

    print("\n=== Resumo ===")
    for k, v in summary.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
