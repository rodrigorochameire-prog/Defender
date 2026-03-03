# Transcription — Whisper-First Pipeline Design

**Data:** 2026-03-03
**Status:** Aprovado para implementação
**Escopo:** `enrichment-engine/services/transcription_service.py`, `enrichment-engine/routers/transcription.py`, `src/lib/trpc/routers/drive.ts`

## Objetivo

Tornar a transcrição extremamente segura, confiável e eficiente adotando melhores práticas em três dimensões: segurança, confiabilidade e performance.

## Fluxo Novo (vs. Atual)

```
ANTES:
Download (RAM total) → decide backend por tamanho → Whisper OU chunks sequenciais OU Gemini

DEPOIS:
Download streaming (64KB chunks) →
  Extrair áudio MP3 mono 32kbps (SEMPRE, mesmo de vídeo) →
    ≤ 23MB → Whisper direto (retry 3x backoff exponencial) →
    > 23MB → Chunks paralelos Whisper (semaphore=3, retry por chunk) →
    Whisper falhou tudo → Gemini (último recurso, com detecção de truncamento) →
      Validação de qualidade (palavras × duração) →
        Salvar com metadado de integridade + backend usado
```

## Seção 1 — Download Seguro (Streaming)

**Problema:** `response.content` carrega arquivo inteiro em RAM. 400MB MP4 → 400MB heap.

**Fix:** Streaming com `httpx.AsyncClient.stream()` + `aiter_bytes(65536)`.

```python
async with client.stream("GET", url, headers=headers) as r:
    r.raise_for_status()
    content_length = int(r.headers.get("content-length", 0))
    if content_length > MAX_DOWNLOAD_BYTES:
        raise FileTooLargeError(f"Arquivo {content_length/1e6:.0f}MB excede limite")
    downloaded = 0
    async for chunk in r.aiter_bytes(65536):
        downloaded += len(chunk)
        f.write(chunk)
```

**Ganho:** RAM constante (O(64KB)) independente do tamanho do arquivo.

## Seção 2 — Whisper-First com Extração de Áudio Universal

**Insight:** Para transcrição, apenas o áudio importa. MP4 de 400MB → MP3 mono 32kbps de ~15-20MB. Na maioria dos casos isso cabe em uma única chamada Whisper.

**Mudança:** `_extract_compressed_audio()` é chamada SEMPRE (não apenas para arquivos grandes).

**Excepção:** Se arquivo já é MP3/WAV/FLAC ≤ 10MB, pular extração.

### Retry com Backoff Exponencial

```python
async def _whisper_with_retry(self, path: Path, lang: str) -> dict:
    delays = [0, 5, 15]  # imediato, 5s, 15s
    last_exc = None
    for attempt, delay in enumerate(delays):
        if delay:
            await asyncio.sleep(delay)
        try:
            return self._transcribe_whisper(path, lang)
        except openai.RateLimitError as e:
            last_exc = e
            logger.warning("Whisper RateLimit (attempt %d/3)", attempt + 1)
        except openai.APIStatusError as e:
            if e.status_code >= 500:
                last_exc = e
                logger.warning("Whisper 5xx (attempt %d/3): %s", attempt + 1, e)
            else:
                raise  # 400/422 são bugs de input, não vale retry
    raise last_exc
```

### Chunks Paralelos (asyncio + semaphore)

```python
semaphore = asyncio.Semaphore(3)  # max 3 chamadas simultâneas

async def _transcribe_one_chunk(i, total, offset_s, chunk_path, lang):
    async with semaphore:
        result = await self._whisper_with_retry(chunk_path, lang)
        for seg in result["segments"]:
            seg["start"] += offset_s
            seg["end"] += offset_s
        return (offset_s, result)

results = await asyncio.gather(*tasks, return_exceptions=True)
```

**Ganho de throughput:** 60min de áudio (3 chunks × 20min) cai de 3× para ~1.2× tempo de chunk.

### Chunks com Gap Reportado

Se chunk falha após retries, inserir placeholder explícito:
```
[00:20:00] ⚠️ [Segmento não transcrito — falha de API no intervalo 20:00–40:00]
```

Metadado salvo: `chunks_failed`, `chunks_total`, `integrity: "partial" | "complete"`.

### Progresso Granular por Chunk

```python
completed = 0
# Por chunk concluído:
completed += 1
pct = 25 + int((completed / total_chunks) * 50)  # 25–75%
_update_progress("transcribing", pct, f"Transcrevendo... {completed}/{total_chunks} partes")
```

## Seção 3 — Idempotência e Recuperação de Falhas

### Idempotência no tRPC Router

```typescript
const existing = await db.select({ status, updatedAt }).from(driveFiles)
  .where(eq(driveFiles.driveFileId, input.driveFileId)).limit(1);

if (existing?.status === "processing" && !isStuck) {
  return { queued: false, message: "Transcrição já está em andamento." };
}
if (existing?.status === "completed") {
  return { queued: false, message: "Já transcrito. Use 'Retranscrever' para forçar." };
}
```

### Recuperação Proativa (Railway Cron)

Novo endpoint `POST /api/recover-stuck` — chamado a cada 10 minutos:

```python
@router.post("/recover-stuck")
async def recover_stuck_files():
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=20)
    client.table("drive_files").update({
        "enrichment_status": "failed",
        "enrichment_error": "Timeout automático: processo não completou em 20 minutos.",
    }).eq("enrichment_status", "processing").lt("updated_at", cutoff.isoformat()).execute()
```

`railway.toml`:
```toml
[[crons]]
schedule = "*/10 * * * *"
command = "curl -s -X POST http://localhost:8000/api/recover-stuck -H 'X-API-Key: $API_KEY'"
```

### Salvar Transcrição Mesmo se Análise Falhar

Já funciona hoje, mas formalizar: separar try/except da análise do try/except da transcrição.

## Seção 4 — Gemini como Último Recurso + Validação de Qualidade

### Condição de Fallback Correta

```python
# Tentar Whisper primeiro (direto ou chunks)
if self.whisper_available:
    try:
        result = await self._whisper_pipeline(audio_path, ...)
        backend_used = "whisper"
    except Exception as e:
        last_whisper_error = e
        logger.warning("Whisper falhou — ativando fallback Gemini: %s", e)

# Gemini APENAS se Whisper indisponível ou falhou
if backend_used is None:
    if not self.gemini_available:
        raise RuntimeError(f"Whisper falhou ({last_whisper_error}) e Gemini não configurado.")
    result = await self._transcribe_with_gemini(audio_path, ...)
    result["backend_fallback"] = True
    backend_used = "gemini_fallback"
```

### Detecção de Truncamento Gemini

```python
if response.candidates[0].finish_reason.name == "MAX_TOKENS":
    result["truncated"] = True
    result["transcript_plain"] += "\n\n⚠️ [TRANSCRIÇÃO INCOMPLETA — limite de tokens atingido]"
```

### Validação de Qualidade por Proporção

```python
def _validate_output_quality(self, result: dict, duration_s: float) -> dict:
    words = len(result.get("transcript_plain", "").split())
    duration_min = duration_s / 60
    expected_min = duration_min * 80   # fala pausada/jurídica
    expected_max = duration_min * 200  # fala rápida

    if words < expected_min * 0.3:
        result["quality_warning"] = "output_too_short"  # possível falha silenciosa
    elif words > expected_max * 2:
        result["transcript_plain"] = self._clean_repetition_aggressive(text)
        result["quality_warning"] = "output_too_long_cleaned"

    return result
```

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `enrichment-engine/services/transcription_service.py` | Download streaming, extração universal, retry, chunks paralelos, validação qualidade, fallback Gemini condicional |
| `enrichment-engine/routers/transcription.py` | Idempotência, endpoint recover-stuck, progresso granular |
| `enrichment-engine/railway.toml` | Cron job recover-stuck |
| `src/lib/trpc/routers/drive.ts` | Idempotência no trigger, mensagem melhorada |

## Não Muda

- Schema do output (`TranscribeOutput`) — compatibilidade total com frontend
- Diarização pyannote — mantida no path Whisper
- Análise Sonnet — mantida no background task
- Polling do frontend — mantido como está
