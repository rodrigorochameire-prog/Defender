#!/usr/bin/env python3
"""Testes puros (sem Playwright) para importar_pauta.py.

Carrega o módulo via importlib para não arrastar Playwright.
"""
import importlib.util
import os

spec = importlib.util.spec_from_file_location(
    "ip",
    os.path.join(os.path.dirname(__file__), "importar_pauta.py"),
)
ip = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ip)


def test_content_hash_estavel():
    h1 = ip.compute_pauta_hash(
        "8009660-70.2025.8.05.0039", "2026-06-30T09:00:00", "OITIVA", "designada"
    )
    h2 = ip.compute_pauta_hash(
        "8009660-70.2025.8.05.0039", "2026-06-30T09:00:00", "OITIVA", "designada"
    )
    assert h1 == h2 and len(h1) == 64, f"hash instável ou tamanho errado: {h1!r}"
    assert ip.compute_pauta_hash("X", "Y", "Z", "w") != h1, "colisão inesperada"


def test_parse_data_hora():
    iso, hhmm = ip.parse_data_hora("30/06/26 09:00")
    assert iso == "2026-06-30T09:00:00", f"iso errado: {iso!r}"
    assert hhmm == "09:00", f"hhmm errado: {hhmm!r}"
    assert ip.parse_data_hora("lixo") == (None, None), "lixo deve retornar (None, None)"


def test_join_cnj_quebrado():
    # CNJ partido por quebra de linha deve ser rejuntado
    resultado = ip.normaliza_cnj("8009660-\n70.2025.8.05.0039")
    assert resultado == "8009660-70.2025.8.05.0039", f"CNJ não rejuntado: {resultado!r}"


if __name__ == "__main__":
    test_content_hash_estavel()
    test_parse_data_hora()
    test_join_cnj_quebrado()
    print("OK")
