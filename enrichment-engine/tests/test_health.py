"""
Testes do endpoint /health.
"""

from fastapi.testclient import TestClient


def test_health_returns_ok(client: TestClient):
    """Health check retorna status ok sem autenticação."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "docling_available" in data
    assert "gemini_configured" in data
    assert "supabase_configured" in data


def test_health_shows_configured_services(client: TestClient):
    """Health check indica que Gemini e Supabase estão configurados."""
    response = client.get("/health")
    data = response.json()
    # Com test settings, ambos devem estar configurados
    assert data["gemini_configured"] is True
    assert data["supabase_configured"] is True
