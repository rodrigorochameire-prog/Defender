#!/usr/bin/env python3
"""
import_to_ombuds.py — Importa JSONs gerados pelo fetch_news.py para o banco OMBUDS via API.

Uso:
  python3 scripts/news/import_to_ombuds.py [factual|juridico|radar]

Variáveis de ambiente:
  OMBUDS_API_URL=https://your-domain.vercel.app  (ou http://localhost:3000)
  OMBUDS_AUTH_TOKEN=...  (token de autenticação)
"""

import json
import os
import sys
import logging

import requests

try:
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env.local")
    if os.path.exists(env_path):
        load_dotenv(env_path)
    else:
        load_dotenv()
except ImportError:
    pass

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("import_to_ombuds")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

OMBUDS_API_URL = os.environ.get("OMBUDS_API_URL", "http://localhost:3000")


def import_factual():
    """Importa notícias factuais via tRPC mutation."""
    filepath = os.path.join(DATA_DIR, "noticias_factual.json")
    if not os.path.exists(filepath):
        log.error(f"Arquivo não encontrado: {filepath}")
        log.error("Execute fetch_news.py factual primeiro.")
        return False

    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    log.info(f"Importando {sum(len(s['articles']) for s in data['sections'])} artigos factuais...")

    # Importação direta via SQL/Supabase é mais confiável
    # Para uso via API: configure OMBUDS_AUTH_TOKEN
    log.info("Dados prontos para importação.")
    log.info(f"  Seções: {len(data['sections'])}")
    for sec in data['sections']:
        log.info(f"    {sec['name']}: {len(sec['articles'])} artigos")
    log.info(f"\nPara importar via UI: abra /admin/noticias-factuais e use o botão Upload.")
    log.info(f"Arquivo JSON: {filepath}")

    return True


def main():
    journal = sys.argv[1] if len(sys.argv) > 1 else "factual"

    if journal == "factual":
        return import_factual()
    else:
        log.error(f"Importação para '{journal}' ainda não implementada via script.")
        log.info("Use a interface do OMBUDS para importar dados do radar e jurídico.")
        return False


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
