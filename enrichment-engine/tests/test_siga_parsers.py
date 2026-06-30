from services.siga_parsers import parse_br_date, parse_licenca, parse_outra_ausencia

def test_parse_br_date():
    assert parse_br_date("01/07/2026") == "2026-07-01"
    assert parse_br_date("") is None
    assert parse_br_date("-") is None
    assert parse_br_date("31/12/2025") == "2025-12-31"

LICENCA_HEADERS = ["Número Solicitação","Data Início","Data Final","Situação","Motivo Ausência","Duração","Data Publicação","Nº Siga","Observação","Interrupção","Suspensão",""]

def test_parse_licenca_full():
    cells = ["12345","01/07/2026","10/07/2026","Gozada","LUTO","10","15/06/2026","SG-999","obs","Não","Sim",""]
    r = parse_licenca(LICENCA_HEADERS, cells)
    assert r["tipo"] == "licenca"
    assert r["numeroSolicitacao"] == "12345"
    assert r["dataInicio"] == "2026-07-01"
    assert r["dataFim"] == "2026-07-10"
    assert r["situacaoSiga"] == "Gozada"
    assert r["motivo"] == "LUTO"
    assert r["dataPublicacao"] == "2026-06-15"
    assert r["nSiga"] == "SG-999"
    assert r["observacao"] == "obs"
    assert r["interrompida"] is False
    assert r["suspensa"] is True

def test_parse_licenca_missing_trailing_cells():
    r = parse_licenca(LICENCA_HEADERS, ["1","01/07/2026","02/07/2026","Solicitada"])
    assert r["motivo"] is None and r["nSiga"] is None and r["suspensa"] is False

OUTRA_HEADERS = ["Numero Solicitação","Data Inicio","Data Final","Situação","Duração","Publicação","Motivo Ausencia","Observação","Interrupção","Nº Siga",""]

def test_parse_outra_uses_variant_headers():
    cells = ["77","05/08/2026","06/08/2026","Solicitada","2","01/08/2026","Compensação","-","Não","SG-7",""]
    r = parse_outra_ausencia(OUTRA_HEADERS, cells)
    assert r["tipo"] == "outra_ausencia"
    assert r["numeroSolicitacao"] == "77"
    assert r["dataInicio"] == "2026-08-05"
    assert r["motivo"] == "Compensação"
    assert r["dataPublicacao"] == "2026-08-01"
    assert r["nSiga"] == "SG-7"
    assert r["suspensa"] is False  # no Suspensão column
