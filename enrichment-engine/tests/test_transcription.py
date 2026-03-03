"""
Testes unitários para TranscriptionService — funções utilitárias.
Sem I/O real: mocks para OpenAI, httpx, pydub.
"""
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch, mock_open
import pytest

from services.transcription_service import TranscriptionService


@pytest.fixture
def service():
    """TranscriptionService com settings mínimos."""
    with patch("services.transcription_service.get_settings") as mock_settings:
        mock_settings.return_value = MagicMock(
            openai_api_key="test-key",
            whisper_model="whisper-1",
            whisper_max_file_size_mb=23,
            transcription_language="pt",
            diarization_enabled=False,
            hf_token=None,
            gemini_api_key="test-gemini-key",
            gemini_model="gemini-2.5-flash",
        )
        with patch("services.transcription_service.OpenAI"):
            svc = TranscriptionService()
    return svc


# ── Task 1: _validate_output_quality ──────────────────────────────

def test_quality_ok(service):
    result = {"transcript_plain": "palavra " * 300}  # 300 palavras
    out = service._validate_output_quality(result, duration_s=120)  # 2 min
    assert "quality_warning" not in out


def test_quality_too_short(service):
    result = {"transcript_plain": "palavra " * 5}  # 5 palavras para 10 min
    out = service._validate_output_quality(result, duration_s=600)
    assert out["quality_warning"] == "output_too_short"


def test_quality_too_long_triggers_cleaning(service):
    repeated = "né " * 5000  # 5000 palavras para 1 min
    result = {"transcript_plain": repeated}
    with patch.object(service, "_clean_repetition_aggressive", return_value="cleaned") as mock_clean:
        out = service._validate_output_quality(result, duration_s=60)
        assert out["quality_warning"] == "output_too_long_cleaned"
        mock_clean.assert_called_once()


# ── Task 1: _clean_repetition_aggressive ─────────────────────────

def test_clean_repetition_aggressive_removes_loop(service):
    # Texto normal + loop no final
    normal = "O réu disse que não estava no local. " * 10
    loop = "né, né, né, né, né, né, né, né, né, né, né, né"
    text = normal + loop
    cleaned = service._clean_repetition_aggressive(text)
    assert "né, né, né, né" not in cleaned
    assert "O réu disse" in cleaned


def test_clean_repetition_aggressive_preserves_normal(service):
    text = "A testemunha afirmou que viu o acusado no local às 15h."
    cleaned = service._clean_repetition_aggressive(text)
    assert cleaned == text


# ── Task 1: _is_already_compressed_audio ─────────────────────────

def test_already_compressed_small_mp3(service, tmp_path):
    f = tmp_path / "audio.mp3"
    f.write_bytes(b"x" * (5 * 1024 * 1024))  # 5MB
    assert service._is_already_compressed_audio(f) is True


def test_video_needs_extraction(service, tmp_path):
    f = tmp_path / "video.mp4"
    f.write_bytes(b"x" * (50 * 1024 * 1024))  # 50MB
    assert service._is_already_compressed_audio(f) is False


def test_large_mp3_needs_extraction(service, tmp_path):
    f = tmp_path / "audio.mp3"
    f.write_bytes(b"x" * (15 * 1024 * 1024))  # 15MB > 10MB threshold
    assert service._is_already_compressed_audio(f) is False
