"""Tests for /api/analyze-async endpoint."""

from unittest.mock import patch, MagicMock


def test_analyze_async_returns_202(client, auth_headers):
    """POST /api/analyze-async returns 202 with valid input."""
    with patch("routers.analysis.get_analysis_service") as mock_svc:
        mock_svc.return_value = MagicMock(available=True)
        resp = client.post(
            "/api/analyze-async",
            json={
                "transcript": "Speaker 1: Eu vi o acusado na cena do crime. " * 5,
                "file_name": "test_transcricao.md",
                "db_record_id": 999,
            },
            headers=auth_headers,
        )
    assert resp.status_code == 202
    data = resp.json()
    assert data["status"] == "accepted"
    assert data["db_record_id"] == 999


def test_analyze_async_rejects_short_transcript(client, auth_headers):
    """POST /api/analyze-async rejects transcript < 50 chars."""
    resp = client.post(
        "/api/analyze-async",
        json={
            "transcript": "curto",
            "file_name": "test.md",
            "db_record_id": 1,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_analyze_async_requires_db_record_id(client, auth_headers):
    """POST /api/analyze-async requires db_record_id."""
    resp = client.post(
        "/api/analyze-async",
        json={
            "transcript": "Speaker 1: Depoimento completo para teste. " * 5,
            "file_name": "test.md",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_analyze_async_503_when_unavailable(client, auth_headers):
    """POST /api/analyze-async returns 503 when Anthropic key missing."""
    with patch("routers.analysis.get_analysis_service") as mock_svc:
        mock_svc.return_value = MagicMock(available=False)
        resp = client.post(
            "/api/analyze-async",
            json={
                "transcript": "Speaker 1: Depoimento completo para teste. " * 5,
                "file_name": "test.md",
                "db_record_id": 1,
            },
            headers=auth_headers,
        )
    assert resp.status_code == 503
