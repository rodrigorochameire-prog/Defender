# Fase 4 — ASR Local (Whisper no Mini)

**Data:** 2026-06-11 · **Programa:** [Zero API Paga](./2026-06-11-programa-zero-api-paga-overview.md) · **Status:** Desenho (impl. após Fase 3) · **Risco:** 🔴 infra nova

## Objetivo

Substituir a transcrição de áudio/vídeo **paga** (Gemini áudio) por **Whisper local** no Mac Mini M4 (Metal), eliminando o último uso de IA paga no pipeline de transcrição. Diarização permanece local (pyannote).

## Stack proposta

- **ASR:** `whisper.cpp` (large-v3, Metal) — leve, sem Python pesado; ou `faster-whisper` (CTranslate2) se precisar de mais controle/segmentação. **Recomendado whisper.cpp** pela simplicidade e performance no M4.
- **Diarização:** `pyannote.audio` (já em uso no engine) rodando **local no Mini** (precisa HF token, gratuito).
- **Pré-processo:** `ffmpeg`/`pydub` para extrair áudio de vídeo e normalizar (16kHz mono).

## Arquitetura

```
[Inngest/engine] --enqueue(source=transcribe, ref=driveFileId)--> fila no Mini
[Mini: serviço de transcrição]
     baixa arquivo (Drive) -> ffmpeg -> whisper.cpp -> (pyannote diariza) -> JSON {transcript, speakers, duration}
     --> grava em drive_files.enrichmentData (mesmo shape de hoje)
```

- **Onde roda no Mini:** serviço **separado do daemon** (FastAPI ou worker dedicado) — transcrição é CPU/Metal-bound e longa; não deve ocupar slot do `claude -p`. Pode reusar o lock/fila via uma tabela própria (`transcription_tasks`) ou estender `claude_code_tasks` com `kind`.
- **Disparo:** mesma lógica da Fase 3 (app/Inngest orquestra; engine sai do caminho de ASR).

## Pré-requisitos no Mini (setup único)

- `brew install ffmpeg whisper-cpp` (ou build); baixar modelo `ggml-large-v3`.
- HF token para pyannote; aceitar termos do modelo de diarização.
- LaunchAgent do serviço de transcrição (RunAtLoad+KeepAlive), análogo ao daemon.

## Validação

- Transcrever um áudio/vídeo conhecido; comparar com a transcrição Gemini anterior (qualidade, diarização, duração).
- Medir tempo no M4 (ex.: 1h de áudio em X min) para dimensionar fila.

## Riscos

| Risco | Mitigação |
|---|---|
| Qualidade Whisper < Gemini em PT-BR | large-v3 + prompt/idioma fixo `pt`; avaliar amostras reais |
| Transcrição longa trava o Mini | serviço separado do daemon; fila própria; 1 por vez |
| Setup de pyannote/HF | documentar; opcional desligar diarização se travar |
| Vídeo grande | extrair só áudio; limites de tamanho |
