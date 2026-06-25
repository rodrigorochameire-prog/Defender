import unittest
from pje_intimacoes_import import normalize_conteudo, compute_content_hash, decide_layer_a


class TestPureHelpers(unittest.TestCase):
    def test_normalize(self):
        self.assertEqual(normalize_conteudo("  Olá   MUNDO\n\t teste "), "olá mundo teste")

    def test_hash_matches_normalization(self):
        a = compute_content_hash("0001", "DOC1", "Conteúdo  X")
        b = compute_content_hash("0001", "DOC1", "conteúdo x")
        self.assertEqual(a, b)
        self.assertRegex(a, r"^[0-9a-f]{64}$")

    def test_hash_null_doc_id(self):
        self.assertEqual(
            compute_content_hash("0001", None, "x"),
            compute_content_hash("0001", "", "x"),
        )

    def test_decide_layer_a(self):
        ledger = {"by_doc": {"DOC1": "imported"}, "by_hash": {"HASH2": "skipped"}}
        self.assertEqual(decide_layer_a("DOC1", "h", ledger), "ja_importada")
        self.assertEqual(decide_layer_a(None, "HASH2", ledger), "duplicada")
        self.assertEqual(decide_layer_a("DOCX", "hx", ledger), "nova")
        # by_hash com decisao "imported" deve retornar "ja_importada" (não "duplicada")
        self.assertEqual(
            decide_layer_a(None, "HASH3", {"by_hash": {"HASH3": "imported"}}),
            "ja_importada",
        )


if __name__ == "__main__":
    unittest.main()
