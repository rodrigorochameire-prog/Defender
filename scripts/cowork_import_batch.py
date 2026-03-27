#!/usr/bin/env python3
"""
Import batch dos _analise_ia.json locais (Google Drive) para o banco OMBUDS.
Lê os arquivos do disco local e grava via Supabase REST API.

Uso:
  python3 scripts/cowork_import_batch.py [--dry-run] [--assistido "Nome"]
"""

import argparse
import json
import logging
import os
import re
import time
from datetime import datetime
from pathlib import Path

import httpx

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("cowork-import")

PROJECT_DIR = Path(__file__).parent.parent
JURI_FOLDER = Path.home() / "Meu Drive" / "1 - Defensoria 9ª DP" / "Processos - Júri"

def load_env():
    env = {}
    with open(PROJECT_DIR / ".env.local") as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip().strip('"')
    return env

ENV = load_env()
SUPABASE_URL = ENV["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = ENV["SUPABASE_SERVICE_ROLE_KEY"]
HEADERS = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}


def supabase_get(table, params):
    resp = httpx.get(f"{SUPABASE_URL}/rest/v1/{table}", headers=HEADERS, params=params, timeout=15)
    resp.raise_for_status()
    return resp.json()


def supabase_patch(table, row_id, data):
    resp = httpx.patch(f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{row_id}", headers={**HEADERS, "Prefer": "return=minimal"}, json=data, timeout=15)
    return resp.status_code in (200, 204)


def supabase_post(table, data):
    resp = httpx.post(f"{SUPABASE_URL}/rest/v1/{table}", headers={**HEADERS, "Prefer": "return=minimal"}, json=data, timeout=15)
    return resp.status_code in (200, 201)


def find_assistido_by_name(nome):
    """Busca assistido no banco pelo nome (case-insensitive)."""
    results = supabase_get("assistidos", {"select": "id,nome", "nome": f"ilike.{nome}", "limit": "1"})
    if results:
        return results[0]
    # Busca parcial
    primeiro = nome.split()[0]
    results = supabase_get("assistidos", {"select": "id,nome", "nome": f"ilike.%{primeiro}%", "limit": "10"})
    ultimo = nome.split()[-1].lower()
    for r in results:
        if ultimo in r["nome"].lower():
            return r
    return None


def find_processos(assistido_id):
    """Busca processos do assistido."""
    return supabase_get("processos", {
        "select": "id,numero_autos,area,is_juri",
        "assistido_id": f"eq.{assistido_id}",
        "deleted_at": "is.null",
    })


def import_analise(pasta: Path, dry_run=False):
    """Importa _analise_ia.json de uma pasta de assistido."""
    json_file = pasta / "_analise_ia.json"
    if not json_file.exists():
        return None

    nome = pasta.name
    log.info("━━━ %s ━━━", nome)

    with open(json_file) as f:
        analise = json.load(f)

    # Validar campos mínimos
    if not analise.get("resumo_fato") and not analise.get("tese_defesa"):
        log.warning("  ⚠️ JSON sem dados úteis — pulando")
        return None

    # Encontrar assistido no banco
    assistido = find_assistido_by_name(nome)
    if not assistido:
        log.warning("  ⚠️ Assistido '%s' não encontrado no banco", nome)
        return None

    assistido_id = assistido["id"]
    log.info("  👤 Assistido: %s (id=%d)", assistido["nome"], assistido_id)

    # Encontrar processo do júri
    processos = find_processos(assistido_id)
    juri_proc = next((p for p in processos if p.get("is_juri") or p.get("area") == "JURI"), None)
    processo_id = juri_proc["id"] if juri_proc else (processos[0]["id"] if processos else None)

    if processo_id:
        log.info("  📋 Processo: %s (id=%d)", juri_proc["numero_autos"] if juri_proc else "?", processo_id)
    else:
        log.warning("  ⚠️ Sem processo vinculado")

    if dry_run:
        log.info("  [DRY RUN] Importaria: tese=%s", (analise.get("tese_defesa") or "N/A")[:60])
        return {"nome": nome, "status": "dry_run"}

    payload = analise.get("payload", {})
    tipo = analise.get("tipo", "juri")
    updated_fields = []

    # 1. Salvar na tabela analises_cowork
    try:
        supabase_post("analises_cowork", {
            "assistido_id": assistido_id,
            "processo_id": processo_id,
            "tipo": tipo,
            "schema_version": analise.get("schema_version", "1.0"),
            "resumo_fato": analise.get("resumo_fato"),
            "tese_defesa": analise.get("tese_defesa"),
            "estrategia_atual": analise.get("estrategia_atual"),
            "crime_principal": analise.get("crime_principal"),
            "pontos_criticos": analise.get("pontos_criticos", []),
            "payload": payload,
            "fonte_arquivo": "_analise_ia.json",
        })
        updated_fields.append("analises_cowork")
        log.info("  ✅ analises_cowork inserido")
    except Exception as e:
        log.warning("  ⚠️ analises_cowork falhou: %s", e)

    # 2. Atualizar processos.analysis_data
    if processo_id:
        analysis_data = {
            "resumo": analise.get("resumo_fato", ""),
            "teses": [analise["tese_defesa"]] if analise.get("tese_defesa") else [],
            "estrategia": analise.get("estrategia_atual", ""),
            "crimePrincipal": analise.get("crime_principal", ""),
            "pontosCriticos": analise.get("pontos_criticos", []),
            "fonte": "cowork",
            "perspectivaPlenaria": payload.get("perspectiva_plenaria", ""),
            "quesitoscriticos": payload.get("quesitos_criticos", []),
            "orientacaoAssistido": payload.get("orientacao_ao_assistido", ""),
            "updatedAt": datetime.now().isoformat(),
        }
        if supabase_patch("processos", processo_id, {
            "analysis_data": json.dumps(analysis_data, ensure_ascii=False),
            "analysis_status": "completed",
        }):
            updated_fields.append("processos.analysis_data")
            log.info("  ✅ processos.analysis_data atualizado")

    # 3. Atualizar testemunhas.perguntas_sugeridas
    testemunhas_atualizadas = 0
    perguntas = payload.get("perguntas_por_testemunha", [])
    if perguntas and processo_id:
        testemunhas_db = supabase_get("testemunhas", {
            "select": "id,nome",
            "processo_id": f"eq.{processo_id}",
        })
        testemunhas_map = {t["nome"].lower(): t["id"] for t in testemunhas_db}

        for item in perguntas:
            nome_t = item.get("nome", "").lower()
            match_id = testemunhas_map.get(nome_t)
            if match_id:
                supabase_patch("testemunhas", match_id, {
                    "perguntas_sugeridas": json.dumps(item.get("perguntas", []), ensure_ascii=False),
                })
                testemunhas_atualizadas += 1

        if testemunhas_atualizadas:
            updated_fields.append(f"testemunhas[{testemunhas_atualizadas}]")
            log.info("  ✅ %d testemunhas atualizadas com perguntas", testemunhas_atualizadas)

    # 4. Atualizar depoimentos_analise (contradições)
    contradicoes = payload.get("contradicoes", [])
    if contradicoes and processo_id:
        # Buscar caso_id via processos.caso_id
        proc_data = supabase_get("processos", {"select": "caso_id", "id": f"eq.{processo_id}", "limit": "1"})
        caso_id = proc_data[0].get("caso_id") if proc_data else None
        if caso_id:
            for c in contradicoes:
                nome_t = c.get("testemunha")
                if not nome_t:
                    continue
                supabase_post("depoimentos_analise", {
                    "caso_id": caso_id,
                    "testemunha_nome": nome_t,
                    "versao_delegacia": c.get("delegacia"),
                    "versao_juizo": c.get("juizo"),
                    "contradicoes_identificadas": c.get("contradicao"),
                })
            updated_fields.append("depoimentos_analise")
            log.info("  ✅ %d contradições importadas", len(contradicoes))

    tese = (analise.get("tese_defesa") or "N/A")[:80]
    log.info("  📊 Campos atualizados: %s", ", ".join(updated_fields))
    log.info("  🎯 Tese: %s", tese)
    return {"nome": nome, "status": "success", "campos": updated_fields, "tese": tese}


def main():
    parser = argparse.ArgumentParser(description="Import batch _analise_ia.json → OMBUDS")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--assistido", type=str, help="Importar só um assistido")
    args = parser.parse_args()

    log.info("=" * 50)
    log.info("IMPORT BATCH — _analise_ia.json → OMBUDS")
    log.info("=" * 50)

    if not JURI_FOLDER.exists():
        log.error("Pasta não encontrada: %s", JURI_FOLDER)
        return

    # Encontrar todas as pastas com _analise_ia.json
    pastas = []
    for d in sorted(JURI_FOLDER.iterdir()):
        if not d.is_dir():
            continue
        if args.assistido and args.assistido.lower() not in d.name.lower():
            continue
        if (d / "_analise_ia.json").exists():
            pastas.append(d)

    log.info("📋 %d pastas com _analise_ia.json", len(pastas))

    results = []
    for i, pasta in enumerate(pastas, 1):
        log.info("")
        log.info("━━━ %d/%d ━━━", i, len(pastas))
        result = import_analise(pasta, dry_run=args.dry_run)
        if result:
            results.append(result)

    success = [r for r in results if r["status"] == "success"]
    log.info("")
    log.info("=" * 50)
    log.info("✅ Importados: %d | Total: %d", len(success), len(results))
    log.info("=" * 50)


if __name__ == "__main__":
    main()
