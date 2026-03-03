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


# ── Task 3: _get_audio_file streaming ────────────────────────────

import pytest

@pytest.mark.asyncio
async def test_download_streaming_saves_to_disk(service, tmp_path):
    """Garante que o download não carrega tudo em RAM."""
    fake_content = b"fake audio data " * 100

    mock_response = AsyncMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.headers = {"content-length": str(len(fake_content))}

    # Simular aiter_bytes em chunks de 16 bytes
    async def fake_aiter_bytes(chunk_size):
        for i in range(0, len(fake_content), chunk_size):
            yield fake_content[i:i + chunk_size]
    mock_response.aiter_bytes = fake_aiter_bytes

    mock_stream_ctx = AsyncMock()
    mock_stream_ctx.__aenter__ = AsyncMock(return_value=mock_response)
    mock_stream_ctx.__aexit__ = AsyncMock(return_value=False)

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.stream = MagicMock(return_value=mock_stream_ctx)
        mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result_path = await service._get_audio_file(
            file_url="https://example.com/audio.mp3",
            file_bytes=None,
            file_name="audio.mp3",
        )

    assert result_path.exists()
    assert result_path.read_bytes() == fake_content
    result_path.unlink(missing_ok=True)


@pytest.mark.asyncio
async def test_download_rejects_oversized_file(service):
    """Arquivo declarado maior que 600MB deve ser rejeitado."""
    mock_response = AsyncMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.headers = {"content-length": str(601 * 1024 * 1024)}

    mock_stream_ctx = AsyncMock()
    mock_stream_ctx.__aenter__ = AsyncMock(return_value=mock_response)
    mock_stream_ctx.__aexit__ = AsyncMock(return_value=False)

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.stream = MagicMock(return_value=mock_stream_ctx)
        mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        with pytest.raises(ValueError, match="excede limite"):
            await service._get_audio_file(
                file_url="https://example.com/huge.mp4",
                file_bytes=None,
                file_name="huge.mp4",
            )


# ── Task 4: _whisper_with_retry ───────────────────────────────────

@pytest.mark.asyncio
async def test_whisper_retry_on_rate_limit(service, tmp_path):
    """Deve tentar 3x em RateLimitError e falhar na 3ª."""
    import openai
    audio = tmp_path / "audio.mp3"
    audio.write_bytes(b"fake")

    call_count = 0
    def fake_transcribe(path, lang):
        nonlocal call_count
        call_count += 1
        raise openai.RateLimitError("rate limit", response=MagicMock(), body={})

    with patch.object(service, "_transcribe_whisper", side_effect=fake_transcribe):
        with patch("asyncio.sleep", new_callable=AsyncMock):
            with pytest.raises(openai.RateLimitError):
                await service._whisper_with_retry(audio, "pt")

    assert call_count == 3  # tentou 3 vezes


@pytest.mark.asyncio
async def test_whisper_retry_succeeds_on_second_attempt(service, tmp_path):
    """Deve ter sucesso na 2ª tentativa após RateLimitError."""
    import openai
    audio = tmp_path / "audio.mp3"
    audio.write_bytes(b"fake")

    call_count = 0
    def fake_transcribe(path, lang):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise openai.RateLimitError("rate limit", response=MagicMock(), body={})
        return {"text": "transcrito", "segments": [], "language": "pt", "duration": 10}

    with patch.object(service, "_transcribe_whisper", side_effect=fake_transcribe):
        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await service._whisper_with_retry(audio, "pt")

    assert call_count == 2
    assert result["text"] == "transcrito"


@pytest.mark.asyncio
async def test_whisper_no_retry_on_client_error(service, tmp_path):
    """Erros 4xx (input inválido) não devem ser retentados."""
    import openai
    audio = tmp_path / "audio.mp3"
    audio.write_bytes(b"fake")

    call_count = 0
    def fake_transcribe(path, lang):
        nonlocal call_count
        call_count += 1
        mock_resp = MagicMock()
        mock_resp.status_code = 400
        raise openai.BadRequestError("bad request", response=mock_resp, body={})

    with patch.object(service, "_transcribe_whisper", side_effect=fake_transcribe):
        with pytest.raises(openai.BadRequestError):
            await service._whisper_with_retry(audio, "pt")

    assert call_count == 1  # sem retry para 4xx
