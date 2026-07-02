import importlib.util, os, tempfile

spec = importlib.util.spec_from_file_location(
    "seeu_autos",
    os.path.join(os.path.dirname(__file__), "seeu_autos.py"))
sa = importlib.util.module_from_spec(spec); spec.loader.exec_module(sa)


# ───── escolhe_fonte_autos (roteamento EP→SEEU, resto→PJe) ────────────────────

def test_fonte_ep_vai_para_seeu():
    assert sa.escolhe_fonte_autos("EXECUCAO_PENAL") == "seeu"


def test_fonte_juri_vvd_criminal_vao_para_pje():
    for atrib in ("JURI_CAMACARI", "GRUPO_JURI", "VVD_CAMACARI", "CRIMINAL"):
        assert sa.escolhe_fonte_autos(atrib) == "pje"


def test_fonte_vazia_ou_none_default_pje():
    assert sa.escolhe_fonte_autos("") == "pje"
    assert sa.escolhe_fonte_autos(None) == "pje"


# ───── dedup_documentos (por id, com fallback p/ seq; 1º vence; ordem mantida) ─

def test_dedup_por_id():
    docs = [
        {"id": "a", "seq": "1", "tipo": "Decisão"},
        {"id": "a", "seq": "1", "tipo": "Decisão (dup)"},
        {"id": "b", "seq": "2", "tipo": "Despacho"},
    ]
    out = sa.dedup_documentos(docs)
    assert [d["id"] for d in out] == ["a", "b"]
    assert out[0]["tipo"] == "Decisão"  # 1º vence


def test_dedup_fallback_por_seq_quando_sem_id():
    docs = [{"seq": "10"}, {"seq": "10"}, {"seq": "11"}]
    out = sa.dedup_documentos(docs)
    assert [d["seq"] for d in out] == ["10", "11"]


def test_dedup_sem_chave_nunca_descarta():
    docs = [{"tipo": "X"}, {"tipo": "Y"}]
    assert len(sa.dedup_documentos(docs)) == 2


def test_dedup_preserva_ordem():
    docs = [{"seq": "3"}, {"seq": "1"}, {"seq": "3"}, {"seq": "2"}]
    assert [d["seq"] for d in sa.dedup_documentos(docs)] == ["3", "1", "2"]


# ───── nome_arquivo_doc (seq zero-pad + slug do tipo + .pdf) ──────────────────

def test_nome_arquivo_zero_pad():
    assert sa.nome_arquivo_doc("12") == "0012.pdf"


def test_nome_arquivo_com_tipo_slug():
    assert sa.nome_arquivo_doc("7", "Decisão") == "0007_decisao.pdf"
    assert sa.nome_arquivo_doc("103", "Ato Ordinatório") == "0103_ato_ordinatorio.pdf"


def test_nome_arquivo_seq_nao_numerico():
    # seq não-numérico não quebra: vira slug seguro
    assert sa.nome_arquivo_doc("mov-9", "Sentença").endswith(".pdf")


# ───── tmp_dir_para_cnj (determinístico, sob o tempdir, só dígitos do CNJ) ────

def test_tmp_dir_deterministico_e_sob_tempdir():
    cnj = "0001234-56.2024.8.05.0039"
    d1 = sa.tmp_dir_para_cnj(cnj)
    d2 = sa.tmp_dir_para_cnj("000123456.2024.8.05.0039")  # mesmo dígitos, pontuação diferente
    assert str(d1) == str(d2)  # determinístico por dígitos
    assert str(d1).startswith(tempfile.gettempdir())
    assert "seeu_autos" in str(d1)


# ───── contrato assíncrono da primitiva ───────────────────────────────────────

def test_baixar_autos_seeu_e_coroutine():
    import inspect
    assert inspect.iscoroutinefunction(sa.baixar_autos_seeu)


def test_coletar_e_baixar_sao_coroutines():
    import inspect
    assert inspect.iscoroutinefunction(sa._coletar_documentos_disponiveis)
    assert inspect.iscoroutinefunction(sa._baixar_documento)
