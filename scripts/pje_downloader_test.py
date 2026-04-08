"""Tests for pje_downloader pure helpers."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from pje_downloader import (
    resolve_pje_config,
    sanitize_filename,
    build_pdf_filename,
    has_recent_pdf,
    is_valid_pdf,
)


def test_resolve_pje_config_juri():
    cfg = resolve_pje_config("JURI_CAMACARI")
    assert cfg["drive_subfolder"] == "Processos - Júri"
    assert cfg["pje_base_url"] == "https://pje.tjba.jus.br/pje"
    assert cfg["perfil"] == "Defensor Público - 1º Grau"


def test_resolve_pje_config_vvd():
    cfg = resolve_pje_config("VVD_CAMACARI")
    assert cfg["drive_subfolder"] == "Processos - VVD (Criminal)"
    assert cfg["pje_base_url"] == "https://pje.tjba.jus.br/pje"


def test_resolve_pje_config_unknown_raises():
    try:
        resolve_pje_config("EXECUCAO_PENAL")
    except ValueError as e:
        assert "not supported in V1" in str(e)
    else:
        raise AssertionError("expected ValueError")


def test_sanitize_filename_strips_path_chars():
    assert sanitize_filename("0001234-56.2026.8.05.0044") == "0001234-56.2026.8.05.0044"
    assert sanitize_filename("foo/bar\\baz") == "foobarbaz"
    assert sanitize_filename("a:b*c?d") == "abcd"


def test_build_pdf_filename_has_date_and_numero():
    import re
    name = build_pdf_filename("0001234-56.2026.8.05.0044")
    assert name.startswith("Autos - 0001234-56.2026.8.05.0044 - ")
    assert name.endswith(".pdf")
    assert re.search(r"\d{4}-\d{2}-\d{2}\.pdf$", name)


def test_has_recent_pdf_empty_dir(tmp_path):
    assert has_recent_pdf(str(tmp_path), "0001234-56.2026.8.05.0044") is False


def test_has_recent_pdf_finds_matching(tmp_path):
    pdf = tmp_path / "Autos - 0001234-56.2026.8.05.0044 - 2026-04-01.pdf"
    pdf.write_bytes(b"%PDF-1.7\n" + b"content" * 5000)
    assert has_recent_pdf(str(tmp_path), "0001234-56.2026.8.05.0044") is True


def test_has_recent_pdf_ignores_small_files(tmp_path):
    pdf = tmp_path / "Autos - 0001234-56.2026.8.05.0044 - 2026-04-01.pdf"
    pdf.write_bytes(b"x")  # too small
    assert has_recent_pdf(str(tmp_path), "0001234-56.2026.8.05.0044") is False


def test_has_recent_pdf_rejects_html_posing_as_pdf(tmp_path):
    """V1.1 regression: PJe sometimes returns 40KB HTML error pages."""
    pdf = tmp_path / "Autos - 0001234-56.2026.8.05.0044 - 2026-04-01.pdf"
    html = b"<!DOCTYPE html>\n<html><body>Painel do Defensor</body></html>\n" * 800
    pdf.write_bytes(html)
    assert len(html) >= 10 * 1024
    assert has_recent_pdf(str(tmp_path), "0001234-56.2026.8.05.0044") is False


def test_has_recent_pdf_accepts_real_pdf_magic(tmp_path):
    pdf = tmp_path / "Autos - 0001234-56.2026.8.05.0044 - 2026-04-01.pdf"
    content = b"%PDF-1.7\n" + b"0" * 20_000
    pdf.write_bytes(content)
    assert has_recent_pdf(str(tmp_path), "0001234-56.2026.8.05.0044") is True


def test_is_valid_pdf_magic_and_size():
    assert is_valid_pdf(b"%PDF-1.4\n" + b"x" * 20_000) is True
    assert is_valid_pdf(b"<!DOCTYPE html>\n" + b"x" * 20_000) is False
    assert is_valid_pdf(b"%PDF-1.4\n" + b"x" * 100) is False  # too small
    assert is_valid_pdf(b"") is False


if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main([__file__, "-v"]))
