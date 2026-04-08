"""PJe downloader — V1 for Júri + VVD Camaçari.

Consolidated replacement for the legacy scripts (pje_scraper.py,
pje_download_autos.py, pje_area_download.py, etc.). Handles:

  Phase 1 (same-origin): login + process search via Patchright
  Phase 2 (cross-origin): force PDF download via Chrome DevTools Protocol

CLI:
  python3 pje_downloader.py download \\
    --numero 0001234-56.2026.8.05.0044 \\
    --atribuicao JURI_CAMACARI \\
    --out-dir /path/to/drive/folder
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

# ------------------------------------------------------------------
# Pure helpers — no browser, safe to unit-test
# ------------------------------------------------------------------

SUPPORTED_ATRIBUICOES = {
    "JURI_CAMACARI": {
        "pje_base_url": "https://pje.tjba.jus.br/pje",
        "drive_subfolder": "Processos - Júri",
        "perfil": "Defensor Público - 1º Grau",
    },
    "VVD_CAMACARI": {
        "pje_base_url": "https://pje.tjba.jus.br/pje",
        "drive_subfolder": "Processos - VVD (Criminal)",
        "perfil": "Defensor Público - 1º Grau",
    },
}

MIN_PDF_BYTES = 10 * 1024  # 10KB — anything smaller is a PJe error page


def resolve_pje_config(atribuicao: str) -> dict[str, str]:
    """Return PJe config for the given atribuição.

    Raises ValueError for atribuições not supported in V1.
    """
    if atribuicao not in SUPPORTED_ATRIBUICOES:
        raise ValueError(
            f"Atribuição '{atribuicao}' not supported in V1. "
            f"Supported: {sorted(SUPPORTED_ATRIBUICOES)}"
        )
    return SUPPORTED_ATRIBUICOES[atribuicao]


def sanitize_filename(name: str) -> str:
    """Strip filesystem-unsafe characters from a filename fragment."""
    return re.sub(r'[\\/:*?"<>|]', "", name)


def build_pdf_filename(numero_processo: str) -> str:
    """Build the canonical filename for an autos PDF."""
    safe = sanitize_filename(numero_processo)
    date = datetime.now().strftime("%Y-%m-%d")
    return f"Autos - {safe} - {date}.pdf"


def has_recent_pdf(drive_dir: str, numero_processo: str) -> bool:
    """Return True if an existing, valid-size autos PDF is already in drive_dir."""
    d = Path(drive_dir)
    if not d.is_dir():
        return False
    safe = sanitize_filename(numero_processo)
    pattern = f"Autos - {safe} - *.pdf"
    for pdf in d.glob(pattern):
        try:
            if pdf.stat().st_size >= MIN_PDF_BYTES:
                return True
        except OSError:
            continue
    return False


# ------------------------------------------------------------------
# CLI scaffold (Phase 1 + Phase 2 implementation lands in Tasks 4 and 5)
# ------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="pje_downloader")
    sub = parser.add_subparsers(dest="cmd", required=True)

    dl = sub.add_parser("download", help="Download autos PDF for one process")
    dl.add_argument("--numero", required=True)
    dl.add_argument("--atribuicao", required=True)
    dl.add_argument("--out-dir", required=True)
    dl.add_argument("--assistido", default="")
    dl.add_argument("--force", action="store_true", help="Re-download even if PDF exists")

    args = parser.parse_args(argv)

    if args.cmd == "download":
        # Real implementation lands in Task 4 + Task 5
        print(json.dumps({"status": "not_implemented"}))
        return 2

    return 1


if __name__ == "__main__":
    sys.exit(main())
