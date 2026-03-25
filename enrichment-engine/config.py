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
    gemini_model: str = "gemini-2.5-flash"
    gemini_max_retries: int = 3
    gemini_timeout: int = 60  # seconds
    gemini_rate_limit: int = 60  # requests per minute

    # --- Supabase ---
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    system_user_id: int = 1  # User ID para created_by_id em anotações automáticas

    # --- Docling ---
    docling_max_file_size_mb: int = 50
    docling_ocr_enabled: bool = True
    docling_ocr_lang: str = "por"

    # --- Solar (Defensoria Pública - DPEBA) ---
    solar_username: str = ""
    solar_password: str = ""
    solar_base_url: str = "https://solar.defensoria.ba.def.br"
    solar_session_timeout: int = 1800  # 30 min - conservative Keycloak session
    solar_rate_limit_seconds: float = 3.0  # delay between page navigations
    solar_max_pdfs_per_sync: int = 10  # max PDFs to download per processo
    solar_headless: bool = True  # False for local debugging

    # --- Transcription (Whisper + pyannote) ---
    openai_api_key: str = ""
    whisper_model: str = "whisper-1"  # OpenAI Whisper API model
    whisper_max_file_size_mb: int = 25  # OpenAI limit
    hf_token: str = ""  # HuggingFace token for pyannote (speaker diarization)
    diarization_enabled: bool = True  # Enable speaker diarization by default
    transcription_language: str = "pt"  # ISO 639-1 language code

    # --- Anthropic (Claude) ---
    anthropic_api_key: str = ""
    claude_sonnet_model: str = "claude-sonnet-4-6"
    claude_opus_model: str = "claude-opus-4-20250514"
    claude_max_tokens: int = 4096
    claude_timeout: int = 120  # seconds

    # --- Gemini Pro (para minutas/análises) ---
    gemini_pro_model: str = "gemini-2.5-pro"
    gemini_reasoning_model: str = "gemini-3.1-pro-preview"

    # --- Embedding ---
    embedding_model: str = "text-embedding-004"
    embedding_dimensions: int = 768
    chunk_max_tokens: int = 500
    chunk_overlap_tokens: int = 50
    search_default_limit: int = 20

    # --- PJe Scraper (CDP — connect to existing Chrome) ---
    pje_cdp_url: str = "http://localhost:9222"
    pje_scrape_rate_limit_seconds: float = 2.0  # delay between process navigations
    pje_scrape_timeout: int = 30_000  # ms per page load

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
