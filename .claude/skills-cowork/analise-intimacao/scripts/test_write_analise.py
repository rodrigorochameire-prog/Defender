import importlib.util, os
spec = importlib.util.spec_from_file_location(
    "write_analise",
    os.path.join(os.path.dirname(__file__), "write_analise.py"),
)
wa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wa)


def test_build_corpo_inclui_peca_quando_sugerida():
    r = {"resumo_objeto": "Despacho determina manifestação sobre cálculo",
         "o_que_fazer": "Manifestar sobre o cálculo em 5 dias",
         "peca_sugerida": "manifestacao_ep"}
    corpo = wa.build_corpo(r)
    assert any(l.startswith("Objeto:") for l in corpo)
    assert any(l.startswith("Cabe peça: manifestacao_ep") for l in corpo)


def test_build_corpo_sem_peca_quando_ciencia():
    r = {"resumo_objeto": "Ciência de juntada", "peca_sugerida": None}
    corpo = wa.build_corpo(r)
    assert not any(l.startswith("Cabe peça") for l in corpo)


def test_enrichment_sinal_deriva_de_peca():
    assert wa.sinal_2c({"peca_sugerida": "apelacao"}) == {
        "peca_sugerida": "apelacao", "requer_analise_profunda": True}
    assert wa.sinal_2c({"peca_sugerida": None}) == {
        "peca_sugerida": None, "requer_analise_profunda": False}
    assert wa.sinal_2c({}) == {"peca_sugerida": None, "requer_analise_profunda": False}


def test_peca_fora_do_enum_e_ignorada():
    # valor inválido do modelo → não dispara requer_analise_profunda
    assert wa.sinal_2c({"peca_sugerida": "habeas_corpus"}) == {
        "peca_sugerida": None, "requer_analise_profunda": False}
    assert wa.sinal_2c({"peca_sugerida": " apelacao "}) == {
        "peca_sugerida": "apelacao", "requer_analise_profunda": True}
    # e não aparece a linha "Cabe peça" no corpo
    assert not any(l.startswith("Cabe peça") for l in wa.build_corpo({"peca_sugerida": "xyz"}))
