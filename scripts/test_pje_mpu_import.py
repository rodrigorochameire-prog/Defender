#!/usr/bin/env python3
"""Testes sintéticos do importador MPU. Exit 0 se OK, 1 se falhou."""
from __future__ import annotations
import sys
from pathlib import Path
import requests

sys.path.insert(0, str(Path(__file__).parent))
from pje_mpu_import import (
    parse_expedientes_list,
    resolve_polo_passivo,
    identify_requerido,
    format_for_endpoint,
)


# ───── Fixture: HTML do painel VVD com 1 expediente MPU ─────
FIXTURE_PAINEL_VVD = """
<table id="formAbaExpediente:tabelaExpedientes">
  <tr class="rich-table-row">
    <td>
      <a onclick="openProcesso('1234567')" href="#">MPUMPCrim 8001234-12.2026.8.05.0039</a>
      <div>Maria Silva X João Pereira</div>
      <div>/Vara de Violência Doméstica de Camaçari</div>
      <div>Defensoria Pública</div>
      <div>Designação de audiência</div>
      <span>Expedição eletrônica (28/04/2026 10:23)</span>
      <span>Prazo: 5 dias</span>
    </td>
  </tr>
</table>
"""


def test_parse_expedientes_list():
    expedientes = parse_expedientes_list(FIXTURE_PAINEL_VVD)
    assert len(expedientes) == 1, f"esperado 1 expediente, veio {len(expedientes)}"
    e = expedientes[0]
    assert e["numero_cnj"] == "8001234-12.2026.8.05.0039", f"numero_cnj errado: {e}"
    assert e["processo_pje_id"] == "1234567", f"processo_pje_id errado: {e}"
    assert e["data_expedicao"] == "28/04/2026 10:23", f"data errada: {e}"
    assert e["tipo_documento"] == "Designação de audiência", f"tipo errado: {e}"
    assert e["prazo"] == "5 dias", f"prazo errado: {e}"
    print("  ✓ test_parse_expedientes_list")


# ───── Fixture: HTML do detalhe do processo COM partes visíveis (1ª via) ─────
FIXTURE_DETALHE_COM_PARTES = """
<div id="processo-detalhe">
  <table id="partes">
    <tr><td>Polo Ativo</td></tr>
    <tr><td>REQUERENTE</td><td>Maria Silva</td><td>CPF: 111.222.333-44</td></tr>
    <tr><td>Polo Passivo</td></tr>
    <tr><td>REQUERIDO</td><td>João Pereira</td><td>CPF: 555.666.777-88</td></tr>
    <tr><td>Outros</td></tr>
    <tr><td>REPRESENTANTE</td><td>DEFENSORIA PÚBLICA DA BAHIA</td><td>OAB: DPE/BA</td></tr>
  </table>
</div>
"""


# ───── Fixture: HTML do detalhe SEM partes na 1ª via (mas com popup Peticionar) ─────
FIXTURE_DETALHE_SEM_PARTES = """
<div id="processo-detalhe">
  <p>Sigilo total — partes não exibidas.</p>
  <a id="botaoPeticionar" data-ca="abc123def456abc123def456abc123de" onclick="abrirPopupPeticionar()">Peticionar</a>
</div>
"""


# ───── Fixture: HTML do listProcessoCompleto.seam (fallback) ─────
FIXTURE_LISTPROCESSOCOMPLETO = """
<div>
  <table id="partes">
    <tr><td>REQUERENTE</td><td>Ana Costa</td><td>CPF: 999.888.777-66</td></tr>
    <tr><td>REQUERIDO</td><td>Pedro Souza</td><td>CPF: 222.333.444-55</td></tr>
  </table>
</div>
"""


class _StubSession:
    """Mock de requests.Session que retorna fixtures conforme URL."""
    def __init__(self, responses: dict[str, str]):
        self.responses = responses
        self.calls: list[str] = []

    def get(self, url: str, **kwargs):
        self.calls.append(url)
        for pattern, body in self.responses.items():
            if pattern in url:
                r = requests.Response()
                r.status_code = 200
                r._content = body.encode("utf-8")
                return r
        raise RuntimeError(f"URL não esperada: {url}")


def test_resolve_polo_passivo_via_listview():
    session = _StubSession({"listView.seam": FIXTURE_DETALHE_COM_PARTES})
    result = resolve_polo_passivo(session, "1234567")
    partes = result["partes"]
    assert len(partes) == 3, f"esperado 3 partes, veio {len(partes)}"

    requerente = next((p for p in partes if "Maria" in p["nome"]), None)
    requerido = next((p for p in partes if "João" in p["nome"]), None)
    dpe = next((p for p in partes if "DEFENSORIA" in p["nome"].upper()), None)

    assert requerente and requerente["tipo"].lower() == "requerente"
    assert requerido and requerido["tipo"].lower() == "requerido"
    assert requerido["cpf"] == "555.666.777-88", f"cpf errado: {requerido}"
    assert dpe and dpe["tipo"].lower() == "representante"
    assert "ca" not in [c.split("?")[0] for c in session.calls], "fallback `ca` não devia rodar"
    print("  ✓ test_resolve_polo_passivo_via_listview")


def test_resolve_polo_passivo_fallback_ca():
    session = _StubSession({
        "listView.seam": FIXTURE_DETALHE_SEM_PARTES,
        "listProcessoCompleto.seam": FIXTURE_LISTPROCESSOCOMPLETO,
    })
    result = resolve_polo_passivo(session, "9999999")
    partes = result["partes"]
    assert len(partes) == 2, f"esperado 2 partes do fallback, veio {len(partes)}"
    assert result["via"] == "ca_fallback", f"via errada: {result.get('via')}"

    requerido = next((p for p in partes if "Pedro" in p["nome"]), None)
    assert requerido and requerido["tipo"] == "requerido"
    assert requerido["cpf"] == "222.333.444-55"
    print("  ✓ test_resolve_polo_passivo_fallback_ca")


def test_identify_requerido_caso_simples():
    partes = [
        {"tipo": "requerente", "nome": "Maria Silva", "cpf": "111.111.111-11"},
        {"tipo": "requerido", "nome": "João Pereira", "cpf": "222.222.222-22"},
        {"tipo": "representante", "nome": "Defensoria Pública", "oab": "DPE/BA"},
    ]
    assert identify_requerido(partes) == "João Pereira"
    print("  ✓ test_identify_requerido_caso_simples")


def test_identify_requerido_dois_requeridos():
    partes = [
        {"tipo": "requerido", "nome": "João Pereira"},
        {"tipo": "requerido", "nome": "Pedro Silva"},
    ]
    assert identify_requerido(partes) == "João Pereira e Pedro Silva"
    print("  ✓ test_identify_requerido_dois_requeridos")


def test_identify_requerido_sem_tipo_explicito():
    """Sem REQUERIDO rotulado, cascata cai pra CPF (regra 2)."""
    partes = [
        {"tipo": "parte", "nome": "Maria Silva", "cpf": "111.111.111-11"},
        {"tipo": "representante", "nome": "Defensoria Pública", "oab": "DPE/BA"},
    ]
    # Regra 2: primeira parte com CPF que NÃO é DPE → Maria
    assert identify_requerido(partes) == "Maria Silva"
    print("  ✓ test_identify_requerido_sem_tipo_explicito")


def test_identify_requerido_so_dpe():
    """Só DPE-BA → cascata esgota → None (placeholder)."""
    partes = [
        {"tipo": "representante", "nome": "Defensoria Pública", "oab": "DPE/BA"},
    ]
    assert identify_requerido(partes) is None
    print("  ✓ test_identify_requerido_so_dpe")


def test_format_for_endpoint_com_nome():
    expediente = {
        "numero_cnj": "8001234-12.2026.8.05.0039",
        "processo_pje_id": "1234567",
        "data_expedicao": "28/04/2026 10:23",
        "tipo_documento": "Designação de audiência",
        "prazo": "5 dias",
    }
    bloco = format_for_endpoint(expediente, "João Pereira")
    assert "Designação de audiência" in bloco
    assert "MPUMPCrim 8001234-12.2026.8.05.0039" in bloco
    assert "X João Pereira" in bloco
    assert "/Vara de Violência Doméstica" in bloco
    assert "Expedição eletrônica (28/04/2026 10:23)" in bloco
    assert "Prazo: 5 dias" in bloco
    print("  ✓ test_format_for_endpoint_com_nome")


def test_format_for_endpoint_placeholder():
    expediente = {
        "numero_cnj": "8009999-99.2026.8.05.0039",
        "processo_pje_id": "9999999",
        "data_expedicao": "29/04/2026",
        "tipo_documento": "Decisão",
        "prazo": "",
    }
    bloco = format_for_endpoint(expediente, None)
    assert "⚠ A identificar — 8009999-99.2026.8.05.0039" in bloco
    print("  ✓ test_format_for_endpoint_placeholder")


TESTS = [
    test_parse_expedientes_list,
    test_resolve_polo_passivo_via_listview,
    test_resolve_polo_passivo_fallback_ca,
    test_identify_requerido_caso_simples,
    test_identify_requerido_dois_requeridos,
    test_identify_requerido_sem_tipo_explicito,
    test_identify_requerido_so_dpe,
    test_format_for_endpoint_com_nome,
    test_format_for_endpoint_placeholder,
]


def main():
    failures = 0
    for t in TESTS:
        try:
            t()
        except AssertionError as e:
            print(f"  ✗ {t.__name__}: {e}")
            failures += 1
        except Exception as e:
            print(f"  ✗ {t.__name__}: ERRO {type(e).__name__}: {e}")
            failures += 1
    total = len(TESTS)
    if failures:
        print(f"\n{failures}/{total} testes falharam")
        sys.exit(1)
    print(f"\n{total}/{total} testes passaram")
    sys.exit(0)


if __name__ == "__main__":
    main()
