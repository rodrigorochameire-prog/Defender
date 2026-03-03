# Transcription Whisper-First Pipeline — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reescrever o pipeline de transcrição para ser seguro (streaming), confiável (retry, idempotência, recovery) e eficiente (extração de áudio universal, chunks paralelos, Gemini como último recurso real).

**Architecture:** Download em streaming 64KB → extração MP3 mono 32kbps universal → Whisper direto ou chunks paralelos com retry → Gemini apenas se Whisper falhar completamente → validação qualidade por proporção palavras×duração.

**Tech Stack:** Python 3.12, FastAPI, OpenAI Whisper API, `asyncio`, `pydub`, `httpx`, Supabase direto, Railway Cron. TypeScript/tRPC no lado Next.js.

**Design doc:** `docs/plans/2026-03-03-transcription-whisper-first-design.md`

**Files principais:**
- `enrichment-engine/services/transcription_service.py` (principal)
- `enrichment-engine/routers/transcription.py`
- `enrichment-engine/railway.toml`
- `src/lib/trpc/routers/drive.ts`
- `enrichment-engine/tests/test_transcription.py` (novo)

---

## Task 1: Testes base para as funções utilitárias novas

**Files:**
- Create: `enrichment-engine/tests/test_transcription.py`

**Step 1: Criar arquivo de testes**

```python
"""
Testes unitários para TranscriptionService — funções utilitárias.
Sem I/O real: mocks para OpenAI, httpx, pydub.
"""
import asyncio
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
```

**Step 2: Rodar — todos devem FALHAR (funções ainda não existem)**

```bash
cd enrichment-engine && python -m pytest tests/test_transcription.py -v 2>&1 | head -40
```

Esperado: `AttributeError: 'TranscriptionService' object has no attribute '_validate_output_quality'`

**Step 3: Commit dos testes**

```bash
git add enrichment-engine/tests/test_transcription.py
git commit -m "test(transcription): testes base para funções utilitárias novas"
```

---

## Task 2: `_validate_output_quality` + `_clean_repetition_aggressive` + `_is_already_compressed_audio`

**Files:**
- Modify: `enrichment-engine/services/transcription_service.py`

**Step 1: Adicionar os três métodos** no final da classe, antes de `_format_timestamp`:

```python
# ==========================================
# QUALITY & VALIDATION
# ==========================================

def _validate_output_quality(self, result: dict, duration_s: float) -> dict:
    """
    Valida se o output é proporcional à duração do arquivo.
    Heurística: 80–200 palavras/minuto de fala típica pt-BR.
    """
    text = result.get("transcript_plain", "")
    words = len(text.split())
    duration_min = max(duration_s / 60, 0.1)  # evitar divisão por zero

    expected_min = duration_min * 80
    expected_max = duration_min * 200

    if words < expected_min * 0.3:
        logger.warning(
            "Output suspeito: %d palavras para %.1fmin de áudio "
            "(esperado ~%d–%d). Possível falha silenciosa.",
            words, duration_min, int(expected_min), int(expected_max),
        )
        result["quality_warning"] = "output_too_short"

    elif words > expected_max * 2:
        logger.warning(
            "Output suspeito: %d palavras para %.1fmin "
            "(esperado ~%d–%d). Possível loop — limpando.",
            words, duration_min, int(expected_min), int(expected_max),
        )
        result["transcript_plain"] = self._clean_repetition_aggressive(
            result["transcript_plain"]
        )
        result["quality_warning"] = "output_too_long_cleaned"

    return result

def _clean_repetition_aggressive(self, text: str) -> str:
    """
    Versão agressiva de _clean_repetition: varre o texto inteiro
    procurando por loops (não apenas os últimos 20%).
    Remove a partir do primeiro loop detectado.
    """
    import re
    if not text or len(text) < 50:
        return text

    # Padrão 1: palavra repetida 6+ vezes em qualquer ponto do texto
    pattern1 = re.compile(
        r'(?:^|[\s,;.])(\b\w{1,20}\b)(?:(?:[,\s]+)\1){5,}',
        re.IGNORECASE,
    )
    match = pattern1.search(text)
    if match:
        cut = match.start()
        cleaned = text[:cut].rstrip(" ,;.")
        if cleaned and cleaned[-1] not in ".!?":
            cleaned += "."
        logger.info(
            "_clean_repetition_aggressive: cortou %d chars na posição %d (palavra: '%s')",
            len(text) - len(cleaned), cut, match.group(1),
        )
        return cleaned

    # Padrão 2: frase curta idêntica repetida 4+ vezes
    pattern2 = re.compile(
        r'(.{8,60}?)\s*(?:[.!?]\s*\1\s*){3,}',
        re.IGNORECASE,
    )
    match2 = pattern2.search(text)
    if match2:
        cut = match2.start()
        cleaned = text[:cut].rstrip(" ,;.")
        if cleaned and cleaned[-1] not in ".!?":
            cleaned += "."
        return cleaned

    # Fallback: delega para o método original
    return self._clean_repetition(text)

@staticmethod
def _is_already_compressed_audio(path: Path) -> bool:
    """
    Retorna True se o arquivo já é áudio comprimido pequeno
    e pode ser enviado direto ao Whisper sem re-extração.
    Condições: extensão de áudio (não vídeo) E tamanho ≤ 10MB.
    """
    AUDIO_EXTENSIONS = {".mp3", ".wav", ".flac", ".m4a", ".ogg", ".webm"}
    VIDEO_EXTENSIONS = {".mp4", ".mpeg", ".mov", ".avi", ".mkv", ".mpga"}
    SKIP_EXTRACTION_MAX_MB = 10

    suffix = path.suffix.lower()
    size_mb = path.stat().st_size / (1024 * 1024)

    if suffix in VIDEO_EXTENSIONS:
        return False  # sempre extrair de vídeo
    if suffix in AUDIO_EXTENSIONS and size_mb <= SKIP_EXTRACTION_MAX_MB:
        return True
    return False  # áudio grande — extrair para comprimir
```

**Step 2: Rodar os testes de qualidade**

```bash
cd enrichment-engine && python -m pytest tests/test_transcription.py -v 2>&1 | tail -20
```

Esperado: todos os testes de Task 1 passam.

**Step 3: Commit**

```bash
git add enrichment-engine/services/transcription_service.py
git commit -m "feat(transcription): quality validation, aggressive repetition cleaner, audio detection"
```

---

## Task 3: Download em streaming (substituir `response.content`)

**Files:**
- Modify: `enrichment-engine/services/transcription_service.py` — método `_get_audio_file`

**Step 1: Adicionar testes de download**

Em `enrichment-engine/tests/test_transcription.py`, adicionar:

```python
# ── Task 3: _get_audio_file streaming ────────────────────────────

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
```

**Step 2: Rodar — deve FALHAR** (método atual não usa streaming)

```bash
cd enrichment-engine && python -m pytest tests/test_transcription.py::test_download_streaming_saves_to_disk tests/test_transcription.py::test_download_rejects_oversized_file -v
```

**Step 3: Reescrever `_get_audio_file`** — substituir o método inteiro:

```python
MAX_DOWNLOAD_BYTES = 600 * 1024 * 1024  # 600MB hard limit

async def _get_audio_file(
    self,
    file_url: str | None,
    file_bytes: bytes | None,
    file_name: str,
    auth_header: str | None = None,
) -> Path:
    """Baixa ou salva arquivo em temp. Download em streaming — RAM constante O(64KB)."""
    suffix = Path(file_name).suffix or ".mp3"
    suffix = suffix.encode("ascii", errors="replace").decode("ascii")

    if file_bytes:
        tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
        tmp.write(file_bytes)
        tmp.close()
        logger.info("Saved %d bytes from file_bytes to %s", len(file_bytes), tmp.name)
        return Path(tmp.name)

    if not file_url:
        raise ValueError("Forneça file_url ou file_bytes")

    headers = {}
    if auth_header:
        headers["Authorization"] = auth_header.strip()

    logger.info("Streaming download from URL (%d chars)...", len(file_url))

    tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    tmp_path = Path(tmp.name)

    try:
        async with httpx.AsyncClient(timeout=300, follow_redirects=True) as client:
            async with client.stream("GET", file_url, headers=headers) as response:
                response.raise_for_status()

                content_length = int(response.headers.get("content-length", 0))
                if content_length > self.MAX_DOWNLOAD_BYTES:
                    raise ValueError(
                        f"Arquivo declarado ({content_length / 1e6:.0f}MB) "
                        f"excede limite de {self.MAX_DOWNLOAD_BYTES // (1024*1024)}MB"
                    )

                downloaded = 0
                async for chunk in response.aiter_bytes(65536):  # 64KB chunks
                    downloaded += len(chunk)
                    if downloaded > self.MAX_DOWNLOAD_BYTES:
                        raise ValueError(
                            f"Download excedeu limite de "
                            f"{self.MAX_DOWNLOAD_BYTES // (1024*1024)}MB"
                        )
                    tmp.write(chunk)

        tmp.close()
        logger.info(
            "Streaming download complete: %d bytes → %s", downloaded, tmp_path
        )
        return tmp_path

    except Exception:
        tmp.close()
        tmp_path.unlink(missing_ok=True)
        raise
```

Também mover `MAX_DOWNLOAD_BYTES = 600 * 1024 * 1024` para nível de classe (logo após `def __init__`).

**Step 4: Rodar testes**

```bash
cd enrichment-engine && python -m pytest tests/test_transcription.py -v 2>&1 | tail -20
```

Esperado: todos passam.

**Step 5: Commit**

```bash
git add enrichment-engine/services/transcription_service.py enrichment-engine/tests/test_transcription.py
git commit -m "feat(transcription): streaming download — RAM O(64KB) independente do tamanho"
```

---

## Task 4: Retry com backoff exponencial para Whisper

**Files:**
- Modify: `enrichment-engine/services/transcription_service.py`

**Step 1: Adicionar teste de retry**

Em `test_transcription.py`:

```python
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
```

**Step 2: Rodar — deve FALHAR**

```bash
cd enrichment-engine && python -m pytest tests/test_transcription.py -k "retry" -v
```

**Step 3: Implementar `_whisper_with_retry`** — adicionar após `_transcribe_whisper`:

```python
async def _whisper_with_retry(self, audio_path: Path, language: str) -> dict:
    """
    Transcreve com Whisper, com retry em erros transientes.
    - RateLimitError / 5xx → retry com backoff: 0s, 5s, 15s
    - 4xx (input inválido) → falha imediata, sem retry
    """
    import openai

    delays = [0, 5, 15]
    last_exc: Exception | None = None

    for attempt, delay in enumerate(delays):
        if delay:
            await asyncio.sleep(delay)
        try:
            return self._transcribe_whisper(audio_path, language)
        except openai.RateLimitError as e:
            last_exc = e
            logger.warning(
                "Whisper RateLimitError (tentativa %d/3) — aguardando %ds",
                attempt + 1, delays[attempt + 1] if attempt + 1 < len(delays) else 0,
            )
        except openai.APIStatusError as e:
            if e.status_code >= 500:
                last_exc = e
                logger.warning(
                    "Whisper servidor %d (tentativa %d/3): %s",
                    e.status_code, attempt + 1, str(e)[:100],
                )
            else:
                raise  # 4xx = bug de input, não vale retry
        except Exception as e:
            raise  # erros inesperados propagam direto

    raise last_exc  # type: ignore[misc]
```

**Step 4: Adicionar `import asyncio`** no topo do arquivo se não existir (já deve existir).

**Step 5: Rodar testes**

```bash
cd enrichment-engine && python -m pytest tests/test_transcription.py -v 2>&1 | tail -20
```

**Step 6: Commit**

```bash
git add enrichment-engine/services/transcription_service.py enrichment-engine/tests/test_transcription.py
git commit -m "feat(transcription): retry backoff exponencial no Whisper (3x: 0s, 5s, 15s)"
```

---

## Task 5: Extração universal de áudio + novo fluxo `transcribe()`

**Files:**
- Modify: `enrichment-engine/services/transcription_service.py`

**Step 1: Reescrever o método público `transcribe()`** — substituir completamente:

```python
async def transcribe(
    self,
    file_url: str | None = None,
    file_bytes: bytes | None = None,
    file_name: str = "audio.mp3",
    language: str | None = None,
    diarize: bool = True,
    expected_speakers: int | None = None,
    auth_header: str | None = None,
) -> dict[str, Any]:
    """
    Transcreve um arquivo de áudio/vídeo.

    Prioridade (Whisper-First):
    1. Extrair áudio MP3 mono 32kbps (SEMPRE, exceto se já é áudio pequeno)
    2. Whisper direto (se ≤ max_file_size_mb após extração)
    3. Whisper em chunks paralelos (se > max_file_size_mb)
    4. Gemini 2.5 Flash (APENAS se Whisper falhar completamente ou indisponível)
    """
    start = time.time()
    lang = language or self.language

    if not self.whisper_available and not self.gemini_available:
        raise RuntimeError(
            "Nenhum serviço de transcrição configurado. "
            "Configure OPENAI_API_KEY (Whisper) ou GEMINI_API_KEY (Gemini)."
        )

    # 1. Download (streaming)
    tmp_path = await self._get_audio_file(file_url, file_bytes, file_name, auth_header)

    try:
        # 2. Extrair áudio comprimido SEMPRE (exceto se já é áudio pequeno)
        if self._is_already_compressed_audio(tmp_path):
            audio_path = tmp_path
            logger.info(
                "Áudio já comprimido (%.1fMB) — pulando extração",
                tmp_path.stat().st_size / (1024 * 1024),
            )
        else:
            audio_path = self._extract_compressed_audio(tmp_path)
            if audio_path != tmp_path:
                tmp_path.unlink(missing_ok=True)

        audio_size_mb = audio_path.stat().st_size / (1024 * 1024)

        # 3. Tentar Whisper (direto ou chunks paralelos)
        backend_used = None
        last_whisper_error: Exception | None = None

        if self.whisper_available:
            try:
                if audio_size_mb <= self.max_file_size_mb:
                    logger.info(
                        "Whisper direto | file=%s | size=%.1fMB | lang=%s",
                        file_name, audio_size_mb, lang,
                    )
                    result = await self._transcribe_with_whisper_retry(
                        audio_path, file_name, lang, diarize, expected_speakers
                    )
                    backend_used = "whisper"
                else:
                    logger.info(
                        "Whisper chunked paralelo | file=%s | size=%.1fMB | lang=%s",
                        file_name, audio_size_mb, lang,
                    )
                    result = await self._transcribe_chunked_parallel(
                        audio_path, file_name, lang, diarize, expected_speakers
                    )
                    backend_used = "whisper_chunked"
            except Exception as e:
                last_whisper_error = e
                logger.warning(
                    "Whisper falhou após retries — ativando fallback Gemini: %s", e
                )

        # 4. Gemini APENAS como último recurso
        if backend_used is None:
            if not self.gemini_available:
                raise RuntimeError(
                    f"Whisper falhou ({last_whisper_error}) e GEMINI_API_KEY não configurado."
                )
            logger.info(
                "FALLBACK Gemini | file=%s | whisper_error=%s",
                file_name, last_whisper_error,
            )
            result = await self._transcribe_with_gemini(
                audio_path, file_name, lang, diarize, expected_speakers
            )
            result["backend_fallback"] = True
            backend_used = "gemini_fallback"

        # 5. Validação de qualidade
        duration_s = result.get("duration", 0) or audio_size_mb * 60  # estimativa fallback
        result = self._validate_output_quality(result, duration_s)
        result["backend"] = backend_used

        elapsed = time.time() - start
        logger.info(
            "Transcrição concluída | backend=%s | duration=%.1fs | segments=%d | "
            "speakers=%d | integrity=%s",
            backend_used,
            elapsed,
            len(result["segments"]),
            len(result["speakers"]),
            result.get("integrity", "complete"),
        )

        return result

    finally:
        audio_path.unlink(missing_ok=True)  # type: ignore[possibly-undefined]
```

**Step 2: Adicionar `_transcribe_with_whisper_retry`** — wrapper que chama o path existente mas usa `_whisper_with_retry`:

```python
async def _transcribe_with_whisper_retry(
    self,
    audio_path: Path,
    file_name: str,
    lang: str,
    diarize: bool,
    expected_speakers: int | None,
) -> dict[str, Any]:
    """Whisper direto com retry — substitui _transcribe_with_whisper para arquivos pequenos."""
    audio_compat = self._ensure_compatible_format(audio_path)
    try:
        file_size_mb = audio_compat.stat().st_size / (1024 * 1024)
        if file_size_mb > self.max_file_size_mb:
            raise ValueError(
                f"Arquivo ainda grande após extração: {file_size_mb:.1f}MB"
            )

        logger.info(
            "Transcrevendo com Whisper | file=%s | size=%.1fMB | lang=%s",
            file_name, file_size_mb, lang,
        )
        whisper_result = await self._whisper_with_retry(audio_compat, lang)

        speakers_result = None
        if diarize and self.diarization_enabled and self.hf_token:
            try:
                speakers_result = self._diarize_speakers(audio_compat, expected_speakers)
            except Exception as e:
                logger.warning("Diarização falhou (continuando sem speakers): %s", e)

        return self._merge_transcription_and_speakers(whisper_result, speakers_result)
    finally:
        if audio_compat != audio_path:
            audio_compat.unlink(missing_ok=True)
```

**Step 3: Rodar todos os testes**

```bash
cd enrichment-engine && python -m pytest tests/test_transcription.py -v 2>&1 | tail -25
```

**Step 4: Commit**

```bash
git add enrichment-engine/services/transcription_service.py
git commit -m "feat(transcription): extração universal de áudio + fluxo Whisper-First completo"
```

---

## Task 6: Chunks paralelos com progresso granular e gaps reportados

**Files:**
- Modify: `enrichment-engine/services/transcription_service.py` — reescrever `_transcribe_chunked_whisper` → `_transcribe_chunked_parallel`

**Step 1: Implementar `_transcribe_chunked_parallel`** — substituir o método antigo:

```python
async def _transcribe_chunked_parallel(
    self,
    audio_path: Path,
    file_name: str,
    lang: str,
    diarize: bool,
    expected_speakers: int | None,
    progress_callback: "Callable[[int, int], None] | None" = None,
) -> dict[str, Any]:
    """
    Transcrição via Whisper em chunks PARALELOS (máx 3 simultâneos).
    Divide o áudio em pedaços de ~20min, processa em paralelo,
    recombina com timestamps ajustados.
    Chunks que falham após retry inserem placeholder no output.
    """
    from pydub import AudioSegment
    import asyncio

    audio = AudioSegment.from_file(str(audio_path))
    duration_seconds = len(audio) / 1000.0
    chunk_duration_ms = 20 * 60 * 1000  # 20 min

    chunks: list[tuple[float, AudioSegment]] = []
    for start_ms in range(0, len(audio), chunk_duration_ms):
        end_ms = min(start_ms + chunk_duration_ms, len(audio))
        chunks.append((start_ms / 1000.0, audio[start_ms:end_ms]))

    total = len(chunks)
    logger.info(
        "Chunked Whisper PARALELO | file=%s | duration=%.0fs | chunks=%d",
        file_name, duration_seconds, total,
    )

    semaphore = asyncio.Semaphore(3)
    completed_count = 0

    async def _process_chunk(i: int, offset_s: float, chunk: AudioSegment):
        nonlocal completed_count
        chunk_path = Path(tempfile.mktemp(suffix=".mp3"))
        async with semaphore:
            try:
                chunk.export(str(chunk_path), format="mp3", bitrate="32k")
                chunk_size_mb = chunk_path.stat().st_size / (1024 * 1024)
                logger.info(
                    "Chunk %d/%d | offset=%.0fs | size=%.1fMB",
                    i + 1, total, offset_s, chunk_size_mb,
                )
                result = await self._whisper_with_retry(chunk_path, lang)
                for seg in result.get("segments", []):
                    seg["start"] += offset_s
                    seg["end"] += offset_s
                completed_count += 1
                if progress_callback:
                    progress_callback(completed_count, total)
                return (offset_s, result, None)  # (offset, result, error)
            except Exception as e:
                logger.error("Chunk %d/%d falhou: %s", i + 1, total, str(e))
                completed_count += 1
                if progress_callback:
                    progress_callback(completed_count, total)
                return (offset_s, None, e)
            finally:
                chunk_path.unlink(missing_ok=True)

    tasks = [
        _process_chunk(i, offset_s, chunk)
        for i, (offset_s, chunk) in enumerate(chunks)
    ]
    raw_results = await asyncio.gather(*tasks)

    # Reconstituir output ordenado por offset
    raw_results.sort(key=lambda x: x[0])

    all_segments: list[dict] = []
    full_text_parts: list[str] = []
    failed_chunks: list[float] = []
    chunk_duration_s = chunk_duration_ms / 1000.0

    for offset_s, result, error in raw_results:
        if error is not None:
            failed_chunks.append(offset_s)
            end_s = offset_s + chunk_duration_s
            ts = self._format_timestamp(offset_s)
            placeholder_text = f"⚠️ [Segmento não transcrito — falha de API no intervalo {self._format_timestamp(offset_s)}–{self._format_timestamp(end_s)}]"
            all_segments.append({
                "start": offset_s,
                "end": min(end_s, duration_seconds),
                "text": placeholder_text,
                "speaker": "SISTEMA",
            })
            full_text_parts.append(placeholder_text)
        else:
            for seg in result.get("segments", []):
                all_segments.append(seg)
            full_text_parts.append(result.get("text", ""))

    if not any(r for _, r, e in raw_results if r is not None):
        raise RuntimeError(
            f"Nenhum chunk foi transcrito com sucesso para '{file_name}'"
        )

    full_text = " ".join(p for p in full_text_parts if p)

    # Diarização no arquivo completo (se habilitado)
    speakers_result = None
    if diarize and self.diarization_enabled and self.hf_token:
        try:
            speakers_result = self._diarize_speakers(audio_path, expected_speakers)
        except Exception as e:
            logger.warning("Diarização falhou (continuando): %s", e)

    whisper_result = {
        "text": full_text,
        "segments": all_segments,
        "language": lang,
        "duration": duration_seconds,
    }

    merged = self._merge_transcription_and_speakers(whisper_result, speakers_result)
    merged["chunks_total"] = total
    merged["chunks_failed"] = len(failed_chunks)
    merged["integrity"] = "partial" if failed_chunks else "complete"

    return merged
```

**Step 2: Remover `_transcribe_chunked_whisper`** (método antigo — não é mais chamado).

**Step 3: Rodar testes**

```bash
cd enrichment-engine && python -m pytest tests/test_transcription.py -v 2>&1 | tail -20
```

**Step 4: Commit**

```bash
git add enrichment-engine/services/transcription_service.py
git commit -m "feat(transcription): chunks paralelos (semaphore=3), gaps reportados, metadado de integridade"
```

---

## Task 7: Progresso granular no background task

**Files:**
- Modify: `enrichment-engine/routers/transcription.py`

**Step 1: Atualizar `_process_transcription_background`** para usar progresso por chunk.

Localizar a seção de transcrição no background task e atualizar a chamada para passar `progress_callback`:

```python
# ── Etapa 1: Download + Transcrição ──
_update_progress("downloading", 10, "Baixando arquivo do Drive...")

service = get_transcription_service()

# Callback para progresso granular por chunk
def on_chunk_done(completed: int, total: int):
    pct = 25 + int((completed / total) * 45)  # 25% → 70%
    _update_progress(
        "transcribing",
        pct,
        f"Transcrevendo... {completed}/{total} partes concluídas",
    )

_update_progress("transcribing", 25, "Transcrevendo com Whisper...")

# Passar callback apenas se o serviço suportar (chunks paralelos)
result = await service.transcribe(
    file_url=input_data.file_url,
    file_name=input_data.file_name,
    language=input_data.language,
    diarize=input_data.diarize,
    expected_speakers=input_data.expected_speakers,
    auth_header=input_data.auth_header,
    progress_callback=on_chunk_done,  # novo parâmetro
)
```

**Step 2: Adicionar `progress_callback` na assinatura de `transcribe()`:**

```python
async def transcribe(
    self,
    file_url: str | None = None,
    file_bytes: bytes | None = None,
    file_name: str = "audio.mp3",
    language: str | None = None,
    diarize: bool = True,
    expected_speakers: int | None = None,
    auth_header: str | None = None,
    progress_callback: "Callable[[int, int], None] | None" = None,  # novo
) -> dict[str, Any]:
```

E passar para `_transcribe_chunked_parallel`:

```python
result = await self._transcribe_chunked_parallel(
    audio_path, file_name, lang, diarize, expected_speakers,
    progress_callback=progress_callback,  # novo
)
```

**Step 3: Adicionar import**:

```python
from typing import Any, Callable  # adicionar Callable
```

**Step 4: Rodar testes**

```bash
cd enrichment-engine && python -m pytest tests/test_transcription.py -v 2>&1 | tail -15
```

**Step 5: Commit**

```bash
git add enrichment-engine/services/transcription_service.py enrichment-engine/routers/transcription.py
git commit -m "feat(transcription): progresso granular por chunk no background task"
```

---

## Task 8: Detecção de truncamento Gemini + metadado de backend

**Files:**
- Modify: `enrichment-engine/services/transcription_service.py` — método `_transcribe_with_gemini`

**Step 1: Adicionar detecção após `generate_content`:**

```python
# 4b. Verificar se output foi truncado
try:
    finish_reason = response.candidates[0].finish_reason
    if hasattr(finish_reason, 'name') and finish_reason.name == "MAX_TOKENS":
        logger.error(
            "⚠️ Gemini atingiu MAX_TOKENS — transcrição TRUNCADA | file=%s",
            file_name,
        )
        # Parse o que tiver e sinalizar truncamento
        result = self._parse_gemini_transcription(response.text, diarize)
        result["truncated"] = True
        result["truncated_reason"] = "MAX_TOKENS"
        result["transcript_plain"] = (
            result.get("transcript_plain", "")
            + "\n\n⚠️ [TRANSCRIÇÃO INCOMPLETA — limite de tokens atingido]"
        )
        return result
except (IndexError, AttributeError):
    pass  # se não conseguir checar, continuar normalmente

# 5. Parse response normal
result = self._parse_gemini_transcription(response.text, diarize)
return result
```

**Step 2: Rodar testes + verificação manual de sintaxe**

```bash
cd enrichment-engine && python -c "from services.transcription_service import TranscriptionService; print('OK')"
cd enrichment-engine && python -m pytest tests/test_transcription.py -v 2>&1 | tail -15
```

**Step 3: Commit**

```bash
git add enrichment-engine/services/transcription_service.py
git commit -m "feat(transcription): detecção de truncamento Gemini MAX_TOKENS"
```

---

## Task 9: Endpoint `recover-stuck` + Railway Cron

**Files:**
- Modify: `enrichment-engine/routers/transcription.py`
- Modify: `enrichment-engine/railway.toml`

**Step 1: Adicionar endpoint no final do router:**

```python
@router.post("/recover-stuck")
async def recover_stuck_transcriptions():
    """
    Recupera arquivos presos em 'processing' por mais de 20 minutos.
    Chamado pelo Railway Cron a cada 10 minutos.
    """
    from datetime import timedelta
    from services.supabase_service import get_supabase_service

    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=20)).isoformat()

    try:
        supa = get_supabase_service()
        client = supa._get_client()
        result = (
            client.table("drive_files")
            .update({
                "enrichment_status": "failed",
                "enrichment_error": (
                    "Timeout automático: processo não completou em 20 minutos. "
                    "Clique em 'Retranscrever' para tentar novamente."
                ),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            .eq("enrichment_status", "processing")
            .lt("updated_at", cutoff)
            .execute()
        )
        count = len(result.data) if result.data else 0
        logger.info("recover-stuck: %d arquivos resetados", count)
        return {"recovered": count, "cutoff": cutoff}
    except Exception as e:
        logger.error("recover-stuck falhou: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
```

**Step 2: Atualizar `railway.toml`:**

```toml
[deploy]
region = "us-east4-eqdc4a"

[[crons]]
schedule = "*/10 * * * *"
command = "curl -s -X POST http://localhost:8000/api/recover-stuck -H 'X-API-Key: $API_KEY' || true"
```

**Step 3: Verificar sintaxe**

```bash
cd enrichment-engine && python -c "from routers.transcription import router; print('OK')"
```

**Step 4: Commit**

```bash
git add enrichment-engine/routers/transcription.py enrichment-engine/railway.toml
git commit -m "feat(transcription): endpoint recover-stuck + Railway Cron a cada 10min"
```

---

## Task 10: Idempotência no tRPC router

**Files:**
- Modify: `src/lib/trpc/routers/drive.ts` — procedure `transcreverDrive`

**Step 1: Substituir o bloco de recovery atual** (que só roda no trigger) pela idempotência no início da procedure:

```typescript
// 0. Buscar arquivo e checar estado atual (idempotência)
const [file] = await db
  .select({
    id: driveFiles.id,
    name: driveFiles.name,
    mimeType: driveFiles.mimeType,
    fileSize: driveFiles.fileSize,
    driveFileId: driveFiles.driveFileId,
    enrichmentStatus: driveFiles.enrichmentStatus,
    updatedAt: driveFiles.updatedAt,
  })
  .from(driveFiles)
  .where(eq(driveFiles.driveFileId, input.driveFileId))
  .limit(1);

if (!file) {
  throw new Error(`Arquivo não encontrado no Drive: ${input.driveFileId}`);
}

// Checar idempotência antes de qualquer ação
if (file.enrichmentStatus === "processing") {
  const updatedAt = file.updatedAt ? new Date(file.updatedAt) : new Date(0);
  const isStuck = updatedAt < new Date(Date.now() - 15 * 60 * 1000);
  if (!isStuck) {
    return {
      queued: false,
      driveFileId: input.driveFileId,
      message: `Transcrição de "${file.name}" já está em andamento. Aguarde.`,
    };
  }
  // Stuck → resetar e continuar para re-enfileirar
  await db.update(driveFiles)
    .set({
      enrichmentStatus: "failed",
      enrichmentError: "Timeout: processo não completou em 15 minutos.",
      updatedAt: new Date(),
    })
    .where(eq(driveFiles.driveFileId, input.driveFileId));
}

// Remover o bloco antigo de recovery que ficava separado acima
```

**Step 2: Remover o bloco antigo** (o `await db.update(driveFiles).set({ enrichmentStatus: "failed" ...` que estava no início da procedure para reset de stuck) — agora está incorporado na lógica acima.

**Step 3: Build TypeScript para checar erros**

```bash
cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep "drive.ts" | head -10
```

Esperado: sem erros em `drive.ts`.

**Step 4: Commit**

```bash
git add src/lib/trpc/routers/drive.ts
git commit -m "feat(transcription): idempotência no trigger — evita duplicatas, reseta stuck corretamente"
```

---

## Task 11: Verificação final + deploy

**Step 1: Rodar todos os testes Python**

```bash
cd enrichment-engine && python -m pytest tests/ -v 2>&1 | tail -30
```

Esperado: todos passam.

**Step 2: Verificar TypeScript**

```bash
cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep -E "drive.ts|transcription" | head -10
```

Esperado: sem erros nos arquivos modificados.

**Step 3: Deploy do enrichment engine**

```bash
cd enrichment-engine && railway up -d
```

**Step 4: Deploy do Next.js (se drive.ts foi alterado)**

```bash
cd /Users/rodrigorochameire/Projetos/Defender && vercel --prod
```

**Step 5: Teste de fumaça — transcrever um arquivo real**

No browser: ir em `/admin/assistidos/250` → Mídias → clicar "Retranscrever" em qualquer arquivo.
Verificar no Railway logs:

```
Streaming download from URL...
Extraindo áudio comprimido...
Transcrevendo com Whisper | size=Xmb
Transcrição concluída | backend=whisper | integrity=complete
```

**Step 6: Commit final + tag**

```bash
git add -A
git commit -m "feat(transcription): whisper-first pipeline — streaming, retry, chunks paralelos, idempotência, recover-stuck"
```
