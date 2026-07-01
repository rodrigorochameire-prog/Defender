import hashlib
from seeu_intimacoes_import import (
    normalize_conteudo,
    compute_content_hash,
    decide_layer_a_seeu,
    proc_seq_key,
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
