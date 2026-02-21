"""
Configuração centralizada do Enrichment Engine.
Usa Pydantic BaseSettings para carregar env vars automaticamente.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Configurações do serviço - carregadas de variáveis de ambiente."""

    # --- App ---
    app_name: str = "OMBUDS Enrichment Engine"
    app_version: str = "0.1.0"
    debug: bool = False

    # --- Auth ---
    enrichment_api_key: str = ""

    # --- Gemini ---
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    gemini_max_retries: int = 3
    gemini_timeout: int = 60  # seconds
    gemini_rate_limit: int = 60  # requests per minute

    # --- Supabase ---
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # --- Docling ---
    docling_max_file_size_mb: int = 50
    docling_ocr_enabled: bool = True
    docling_ocr_lang: str = "por"

    # --- Limites ---
    max_text_length: int = 100_000  # chars
    rate_limit_per_minute: int = 100

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


@lru_cache
def get_settings() -> Settings:
    """Singleton de settings — cached para performance."""
    return Settings()
