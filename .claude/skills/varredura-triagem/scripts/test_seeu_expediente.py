import importlib.util, os
spec = importlib.util.spec_from_file_location(
    "seeu_expediente",
    os.path.join(os.path.dirname(__file__), "seeu_expediente.py"))
se = importlib.util.module_from_spec(spec); spec.loader.exec_module(se)

_ALVO = "Juntar MANIFESTAÇÃO referente ao movimento - PROFERIDO DESPACHO DE MERO EXPEDIENTE ( 29 de maio de 2026 às 16:01 )"
_PENA = "Início: 10/10/2024 Término: 28/07/2032 Livramento Condicional: 24/12/2025 REALCES Realçar"


def test_parse_movimento_alvo():
    r = se.parse_movimento_alvo(_ALVO)
    assert r["tipo"] == "PROFERIDO DESPACHO DE MERO EXPEDIENTE"
    assert r["data"] == "29/05/2026"


def test_parse_movimento_alvo_ausente():
    assert se.parse_movimento_alvo("nenhum movimento aqui") is None


def test_parse_pena_context():
    p = se.parse_pena_context(_PENA)
    assert p["inicio"] == "10/10/2024"
    assert p["termino"] == "28/07/2032"
    assert p["livramento_condicional"] == "24/12/2025"
