#!/usr/bin/env python3
"""
Scraping de autos digitais do PJe para os processos da pauta do dia.

Wrapper: lê /tmp/pastas-<DIA>.json (gerado por 03_verificar_pastas.ts) e,
para cada processo com acao_proxima in {scraping_pendente, criar_dir,
criar_pasta_assistido}, invoca scripts/pje_download_autos.py com -p <numero>
-o <pasta-do-assistido>/<numero>.

Os PDFs são baixados direto na pasta-de-destino do Drive (não em ~/Desktop).
Detecta autos já existentes com nome convencional para evitar redownload.

Uso:
  python3 .claude/skills-cowork/preparar-audiencias/scripts/04_scraping.py 2026-05-05
  python3 .claude/skills-cowork/preparar-audiencias/scripts/04_scraping.py 2026-05-05 --headless
  python3 .claude/skills-cowork/preparar-audiencias/scripts/04_scraping.py 2026-05-05 --only 8000733-81.2026.8.05.0039

Pré-requisitos: PJE_CPF e PJE_SENHA em .env.local.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path("/Users/rodrigorochameire/Projetos/Defender")
PJE_DOWNLOAD_SCRIPT = ROOT / "scripts" / "pje_download_autos.py"


def already_has_autos(pasta_autos: Path, numero_autos: str) -> bool:
    """Verifica se a pasta já contém algum PDF dos autos digitais."""
    if not pasta_autos.exists():
        return False
    nome_padrao = f"Autos Digitais - {numero_autos}.pdf"
    if (pasta_autos / nome_padrao).exists():
        return True
    # heurística: arquivo qualquer .pdf que contenha o numero_autos no nome
    for f in pasta_autos.iterdir():
        if f.suffix.lower() == ".pdf" and numero_autos.replace(".", "").replace("-", "") in f.name.replace(".", "").replace("-", ""):
            return True
    return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("dia")
    parser.add_argument("--only", help="Baixar apenas este número de autos")
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--force", action="store_true",
                        help="Re-baixar mesmo se autos já existirem")
    args = parser.parse_args()

    pastas_path = Path(f"/tmp/pastas-{args.dia}.json")
    if not pastas_path.exists():
        print(f"ERRO: {pastas_path} não existe. Rode 03_verificar_pastas.ts primeiro.")
        sys.exit(1)

    pastas = json.loads(pastas_path.read_text())

    pendentes = []
    for p in pastas:
        if args.only and p["numero_autos"] != args.only:
            continue
        if not args.force and already_has_autos(Path(p["pasta_autos"]), p["numero_autos"]):
            print(f"[skip] {p['nome']} · {p['numero_autos']} — autos já presentes")
            continue
        pendentes.append(p)

    print(f"\n=== {len(pendentes)} processos para scraping ===\n")
    for p in pendentes:
        print(f"  · {p['nome']} · {p['numero_autos']} → {p['pasta_autos']}")

    if not pendentes:
        print("\nNada a fazer.")
        return

    print()
    for p in pendentes:
        out_dir = Path(p["pasta_autos"])
        out_dir.mkdir(parents=True, exist_ok=True)
        cmd = [
            sys.executable,
            str(PJE_DOWNLOAD_SCRIPT),
            "-p", p["numero_autos"],
            "-o", str(out_dir),
        ]
        if args.headless:
            cmd.append("--headless")

        print(f"\n--- {p['nome']} · {p['numero_autos']} ---")
        try:
            res = subprocess.run(cmd, timeout=900)
            if res.returncode != 0:
                print(f"  ⚠ download falhou (exit {res.returncode})")
        except subprocess.TimeoutExpired:
            print(f"  ⚠ timeout (15min) — pular")
        except KeyboardInterrupt:
            print("\nInterrompido pelo usuário.")
            sys.exit(130)


if __name__ == "__main__":
    main()
