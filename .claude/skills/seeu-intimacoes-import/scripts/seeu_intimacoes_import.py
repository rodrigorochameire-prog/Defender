#!/usr/bin/env python3
"""Worker (browser lane): raspa a Mesa do Defensor do SEEU (Execução Penal) por
aba e grava em seeu_import_staging (NUNCA em demandas). Dedup Layer-A via
seeu_ledger, chave forte = (processoNumero, seq).

Read-only sobre o SEEU: só lê DOM + troca de aba + paginação. Nunca clica
"Dispensar Juntada"/"Analisar"/assinar/peticionar.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import os
import re
import sys
from datetime import datetime, timezone

CDP_URL = os.environ.get("SEEU_CDP_URL", "http://127.0.0.1:9222")
SEEU_BASE = "https://seeu.pje.jus.br/seeu"
MESA_FRAME_MARKER = "mesaDefensor1Grau.do"

# Abas suportadas na Fase 1 → (texto do link, ato da demanda).
ABAS_SUPORTADAS: dict[str, tuple[str, str]] = {
    "manifestacao": ("Manifestação", "Manifestação"),
    "ciencia": ("Ciência", "Ciência"),
    "razoes": ("Razões/Contrarrazões", "Razões"),
}


def normalize_conteudo(s: str) -> str:
    """Colapsa whitespace, strip, lowercase. Byte-idêntico ao TS normalizeConteudo."""
    s = s or ""
    return re.sub(r"\s+", " ", s).strip().lower()


def compute_content_hash(processo: str, doc_id: str | None, conteudo: str) -> str:
    """sha256(processo + "|" + (doc_id or "") + "|" + normalize_conteudo(conteudo)).
    No SEEU doc_id é sempre None → segmento vazio. Byte-idêntico ao TS."""
    payload = "%s|%s|%s" % (processo or "", doc_id or "", normalize_conteudo(conteudo))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def proc_seq_key(processo: str | None, seq: int | None) -> str | None:
    """Chave forte '<processo>|<seq>' ou None se faltar processo ou seq."""
    if not processo or seq is None:
        return None
    return "%s|%s" % (processo, seq)


def decide_layer_a_seeu(
    processo: str | None,
    seq: int | None,
    content_hash: str,
    ledger_index: dict,
) -> str:
    """ledger_index = {"by_proc_seq": {key: decisao}, "by_hash": {hash: decisao}}.
    Retorna 'nova' | 'duplicada' | 'ja_importada'. Chave forte = processo+seq;
    content_hash é fallback."""
    key = proc_seq_key(processo, seq)
    if key and key in ledger_index.get("by_proc_seq", {}):
        prev = ledger_index["by_proc_seq"][key]
        return "ja_importada" if prev == "imported" else "duplicada"
    if content_hash in ledger_index.get("by_hash", {}):
        prev = ledger_index["by_hash"][content_hash]
        return "ja_importada" if prev == "imported" else "duplicada"
    return "nova"


def load_seeu_ledger_index(sb) -> dict:
    """Lê TODOS os rows de seeu_ledger e indexa por (processo|seq) e por hash.
    Pagina de 1000 em 1000 (PostgREST limita a resposta) p/ não subcontar."""
    PAGE = 1000
    idx: dict = {"by_proc_seq": {}, "by_hash": {}}
    offset = 0
    while True:
        rows = sb._req(
            "GET",
            f"/rest/v1/seeu_ledger"
            f"?select=processo_numero,seq,content_hash,decisao"
            f"&limit={PAGE}&offset={offset}",
        ) or []
        for r in rows:
            k = proc_seq_key(r.get("processo_numero"), r.get("seq"))
            if k:
                idx["by_proc_seq"][k] = r["decisao"]
            if r.get("content_hash"):
                idx["by_hash"][r["content_hash"]] = r["decisao"]
        if len(rows) < PAGE:
            break
        offset += PAGE
    return idx
