import unittest
from pje_intimacoes_import import (
    normalize_conteudo, compute_content_hash, decide_layer_a,
    _pje_datetime_to_iso, _pje_prazo_to_date,
)


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


class TestDateHelpers(unittest.TestCase):
    """Testes para _pje_datetime_to_iso e _pje_prazo_to_date (Fix 1)."""

    # _pje_datetime_to_iso ──────────────────────────────────────────────

    def test_datetime_iso_date_only(self):
        """DD/MM/YYYY → YYYY-MM-DDTHH:MM:00"""
        self.assertEqual(_pje_datetime_to_iso("15/03/2025"), "2025-03-15T00:00:00")

    def test_datetime_iso_with_time(self):
        """DD/MM/YYYY HH:MM → YYYY-MM-DDTHH:MM:00"""
        self.assertEqual(_pje_datetime_to_iso("15/03/2025 14:30"), "2025-03-15T14:30:00")

    def test_datetime_iso_empty_returns_none(self):
        """Entrada vazia/None → None"""
        self.assertIsNone(_pje_datetime_to_iso(""))
        self.assertIsNone(_pje_datetime_to_iso(None))
        self.assertIsNone(_pje_datetime_to_iso("   "))

    def test_datetime_iso_non_date_returns_none(self):
        """String não-data (número de dias, texto livre) → None"""
        self.assertIsNone(_pje_datetime_to_iso("10"))
        self.assertIsNone(_pje_datetime_to_iso("texto"))
        self.assertIsNone(_pje_datetime_to_iso("2025-03-15"))  # ISO direto não suportado

    # _pje_prazo_to_date ────────────────────────────────────────────────

    def test_prazo_date_converts(self):
        """DD/MM/YYYY → YYYY-MM-DD"""
        self.assertEqual(_pje_prazo_to_date("30/03/2025"), "2025-03-30")

    def test_prazo_number_returns_none(self):
        """Número de dias → None (não fabrica prazo)"""
        self.assertIsNone(_pje_prazo_to_date("10"))
        self.assertIsNone(_pje_prazo_to_date("30"))

    def test_prazo_empty_returns_none(self):
        self.assertIsNone(_pje_prazo_to_date(""))
        self.assertIsNone(_pje_prazo_to_date(None))


if __name__ == "__main__":
    unittest.main()
