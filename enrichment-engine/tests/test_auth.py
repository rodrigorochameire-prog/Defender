"""
Testes de autenticação via API Key.
"""

from fastapi.testclient import TestClient


def test_health_no_auth_required(client: TestClient):
    """Health check não requer autenticação."""
    response = client.get("/health")
    assert response.status_code == 200


def test_enrich_requires_api_key(client: TestClient):
    """Endpoints de enrich requerem X-API-Key."""
    response = client.post("/enrich/pje-text", json={
        "raw_text": "Texto de teste para PJe",
        "defensor_id": "def-123"
    })
    # Sem header X-API-Key → 401
    assert response.status_code == 401


def test_enrich_rejects_invalid_key(client: TestClient):
    """API key inválida é rejeitada."""
    response = client.post(
        "/enrich/pje-text",
        json={"raw_text": "Texto de teste para PJe", "defensor_id": "def-123"},
        headers={"X-API-Key": "wrong-key"}
    )
    assert response.status_code == 403


def test_enrich_accepts_valid_key(client: TestClient, auth_headers: dict):
    """API key válida é aceita."""
    response = client.post(
        "/enrich/pje-text",
        json={"raw_text": "Texto de teste para PJe", "defensor_id": "def-123"},
        headers=auth_headers
    )
    assert response.status_code == 200
