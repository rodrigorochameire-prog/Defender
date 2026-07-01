import hashlib
from seeu_intimacoes_import import (
    normalize_conteudo,
    compute_content_hash,
    decide_layer_a_seeu,
    proc_seq_key,
    _split_blocos_por_processo,
)


def test_normalize_colapsa_e_lower():
    assert normalize_conteudo("  A\tB\n C ") == "a b c"


def test_content_hash_matches_ts_formula():
    # sha256("proc|<vazio>|texto") — doc_id sempre "" no SEEU
    proc, conteudo = "2000068-07.2025.8.05.0039", "Bloco Cru"
    expected = hashlib.sha256(
        f"{proc}||{normalize_conteudo(conteudo)}".encode("utf-8")
    ).hexdigest()
    assert compute_content_hash(proc, None, conteudo) == expected


def test_proc_seq_key():
    assert proc_seq_key("2000068-07.2025.8.05.0039", 1552) == "2000068-07.2025.8.05.0039|1552"


def test_decide_nova_quando_ausente():
    idx = {"by_proc_seq": {}, "by_hash": {}}
    assert decide_layer_a_seeu("proc", 10, "hash", idx) == "nova"


def test_decide_ja_importada_por_proc_seq():
    idx = {"by_proc_seq": {"proc|10": "imported"}, "by_hash": {}}
    assert decide_layer_a_seeu("proc", 10, "hash", idx) == "ja_importada"


def test_decide_duplicada_por_proc_seq_skipped():
    idx = {"by_proc_seq": {"proc|10": "skipped"}, "by_hash": {}}
    assert decide_layer_a_seeu("proc", 10, "hash", idx) == "duplicada"


def test_decide_fallback_por_hash_quando_sem_seq():
    idx = {"by_proc_seq": {}, "by_hash": {"h": "imported"}}
    assert decide_layer_a_seeu("proc", None, "h", idx) == "ja_importada"


_TAB_2_BLOCOS = (
    "Pré-Análise\tLeitura de Prazo\nTodos \n"
    "\t1372\t\n2002228-90.2023.8.05.0001 \tExecução da Pena\n(Pena Privativa de Liberdade)\t\n"
    "Autoridade:\t\nEstado da Bahia\n\n\nExecutado:\t\nJOSE NEVES DA SILVA\n"
    "\t\t29/06/2026\n09/07/2026\t5 dias corridos\t\nAnalisar\n\t\n"
    "\t1552\t\n2000068-07.2025.8.05.0039 \tExecução da Pena\n(Acordo de Não Persecução Penal)\t\n"
    "Autoridade:\t\nMinistério Público do Estado da Bahia\n\n\nExecutado:\t\n"
    "NADSON WESLEY MASCARENHAS DOS SANTOS DA SILVA\n\n\nTerceiro:\t\n"
    "DEFENSORIA PÚBLICA DO ESTADO DA BAHIA\nPolícia Civil do Estado da Bahia\n"
    "\t\t29/06/2026\n09/07/2026\t5 dias corridos\t\nAnalisar\n"
)


def test_split_blocos_boundaries_and_seq():
    blocos = _split_blocos_por_processo(_TAB_2_BLOCOS)
    assert len(blocos) == 2
    seq1, cnj1, blk1 = blocos[0]
    seq2, cnj2, blk2 = blocos[1]
    assert (seq1, cnj1) == (1372, "2002228-90.2023.8.05.0001")
    assert (seq2, cnj2) == (1552, "2000068-07.2025.8.05.0039")
    # Bloco 1 preserva sua ULTIMA data (não truncada) e NÃO vaza o CNJ do próximo.
    assert "09/07/2026" in blk1
    assert "2000068-07" not in blk1
    # Bloco 2 começa limpo no seu Seq (sem a cauda do bloco anterior).
    assert blk2.lstrip().startswith("1552")
    assert "NADSON WESLEY" in blk2
