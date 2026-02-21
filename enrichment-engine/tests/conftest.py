"""
Fixtures de teste — mock Gemini, mock Supabase, TestClient.
"""

import pytest
from fastapi.testclient import TestClient

from main import create_app
from config import Settings, get_settings


def get_test_settings() -> Settings:
    """Settings de teste com API key fixa."""
    return Settings(
        enrichment_api_key="test-api-key-123",
        gemini_api_key="test-gemini-key",
        supabase_url="https://test.supabase.co",
        supabase_service_role_key="test-service-role-key",
        debug=True,
    )


@pytest.fixture
def app():
    """FastAPI app para testes."""
    test_app = create_app()
    test_app.dependency_overrides[get_settings] = get_test_settings
    return test_app


@pytest.fixture
def client(app):
    """TestClient com API key válida."""
    return TestClient(app)


@pytest.fixture
def auth_headers():
    """Headers com API key válida."""
    return {"X-API-Key": "test-api-key-123"}
