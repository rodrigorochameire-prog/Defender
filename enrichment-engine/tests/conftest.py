"""
Fixtures de teste — mock Gemini, mock Supabase, TestClient.
"""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from main import create_app
from config import Settings, get_settings

TEST_API_KEY = "test-api-key-123"


def get_test_settings() -> Settings:
    """Settings de teste com API key fixa."""
    return Settings(
        enrichment_api_key=TEST_API_KEY,
        gemini_api_key="test-gemini-key",
        supabase_url="https://test.supabase.co",
        supabase_service_role_key="test-service-role-key",
        debug=True,
    )


@pytest.fixture
def app():
    """FastAPI app para testes com get_settings patched no middleware."""
    # Patch get_settings at module level so the middleware (which calls it
    # directly, bypassing FastAPI DI) also sees the test settings.
    with patch("auth.get_settings", get_test_settings):
        test_app = create_app()
        test_app.dependency_overrides[get_settings] = get_test_settings
        yield test_app


@pytest.fixture
def client(app):
    """TestClient com API key válida."""
    return TestClient(app)


@pytest.fixture
def auth_headers():
    """Headers com API key válida."""
    return {"X-API-Key": TEST_API_KEY}
