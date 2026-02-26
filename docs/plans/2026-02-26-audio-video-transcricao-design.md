# Design: Automacao de Audio/Video e Transcricao

> **Data**: 2026-02-26
> **Status**: Aprovado (brainstorming)
> **Escopo**: 3 modulos independentes para transcrever, organizar e vincular gravacoes

---

## Contexto

O defensor tem 3 fluxos de audio/video:
1. **PJe Midias**: baixa audios de audiencias do PJe, coloca no Drive, usa Descript para transcrever com speakers
2. **Plaud atendimentos**: grava atendimentos com Plaud Note, que gera MP3 + transcricao + resumo, exporta ao Drive
3. **Registro Rapido**: quer poder gravar durante atendimentos no dashboard e vincular automaticamente

Infraestrutura existente no codebase:
- Google Speech-to-Text (2 rotas API, nao configurado)
- Plaud webhook handler completo (723 linhas, nao conectado)
- Audio recorder component (browser)
- Transcription viewer com pontos-chave (Gemini)
- DB schema completo para audio em atendimentos

---

## Modulo A: Transcrever Midias do Drive

### Problema
Audios de audiencias do PJe precisam de transcricao com identificacao de speakers (juiz, promotor, defensor, reu).

### Solucao
Whisper (OpenAI) para transcricao + pyannote para diarizacao de speakers, rodando no enrichment engine (Python/FastAPI).

### Arquitetura

```
OMBUDS (Next.js)                  Enrichment Engine (Python)         Google Drive
┌─────────────────┐              ┌──────────────────────┐           ┌──────────────┐
│ Botao "Transcrever"            │ POST /api/transcribe │           │ Pasta Assist.│
│ em arquivo audio │────────────▶│ • Download arquivo   │──────────▶│ • transcr.txt│
│ do Drive         │             │ • Whisper (OpenAI)   │           │ • resumo.pdf │
│                  │◀────────────│ • pyannote (speakers)│           └──────────────┘
│ Status: Concl.   │             │ • Formata output     │
└─────────────────┘              └──────────────────────┘
```

### Endpoint Enrichment Engine

```python
POST /api/transcribe
Input:
  file_url: str         # URL do Drive ou bytes
  language: str         # "pt-BR"
  diarize: bool         # ativar pyannote
  expected_speakers: int # 4 para audiencias
  output_format: str    # "structured"

Output:
  transcript: str       # Texto completo com timestamps + speakers
  speakers: list        # Lista de speakers identificados
  duration: int         # Duracao em segundos
  confidence: float     # Score medio de confianca
```

### Output Formatado

```
[00:00:15] JUIZ: Boa tarde, vamos iniciar a audiencia...
[00:00:42] PROMOTOR: Meritissimo, a acusacao requer...
[00:01:15] DEFENSOR: Com a venia, a defesa sustenta...
[00:02:30] REU: Eu nao estava presente no local...
```

### UI

Na pagina do processo ou assistido, ao listar arquivos do Drive que sao audio/video:

```
🎵 audiencia-22-01-2026.mp4     [Transcrever] [Abrir no Descript]
   Status: Pendente

🎵 depoimento-testemunha.mp3    [Transcrever]
   Status: Transcrevendo... 45%

🎵 audiencia-15-12-2025.mp4     ✓ Transcrito
   [Ver Transcricao] [Baixar TXT]
```

### tRPC Procedures

```typescript
// Iniciar transcricao
solar.transcreverDrive({ driveFileId, processoId?, assistidoId?, diarize: true })

// Verificar status
solar.statusTranscricao({ transcricaoId })

// Listar transcricoes do assistido
solar.transcricoesAssistido({ assistidoId })
```

### Dependencias Python (enrichment engine)

```
openai          # Whisper API
pyannote.audio  # Speaker diarization
torch           # GPU support (pyannote)
```

### Alternativa mantida

Botao "Abrir no Descript" para quem prefere usar Descript manualmente para edicao/refinamento.

---

## Modulo B: Plaud -> Drive (via Zapier)

### Problema
Apos gravar atendimento com Plaud Note, defensor precisa exportar manualmente MP3 + transcricao + resumo ao Drive do assistido.

### Solucao
Zapier conecta Plaud ao webhook OMBUDS (ja existente). OMBUDS salva no DB e faz upload ao Drive automaticamente.

### Arquitetura

```
Plaud Note          Zapier                 OMBUDS Webhook          Google Drive
┌──────────┐       ┌──────────┐           ┌──────────────┐       ┌──────────────┐
│ Grava    │──────▶│ Trigger: │──────────▶│ POST /api/   │──────▶│ Pasta Assist.│
│ Transcreve│      │ "when    │           │ webhooks/plaud│      │ • audio.mp3  │
│ Resume   │       │  done"   │           │              │       │ • transcr.pdf│
└──────────┘       └──────────┘           │ • Salva DB   │       │ • resumo.pdf │
                                          │ • Upload Drive│       └──────────────┘
                                          │ • Vincula    │
                                          └──────────────┘
```

### Webhook existente (ajustes necessarios)

Arquivo: `src/app/api/webhooks/plaud/route.ts`

Ja processa:
- `recording.completed` -> salva MP3
- `transcription.completed` -> salva texto
- `summary.completed` -> salva resumo

**Adicionar:**
1. Auto-upload ao Google Drive na pasta do assistido vinculado
2. Vinculacao inteligente: ultimo atendimento aberto ou "aguardando gravacao"
3. Notificacao no OMBUDS (toast "Nova gravacao Plaud disponivel")

### Configuracao Zapier (one-time)

```
Trigger: Plaud -> "When transcription is completed"
Action:  Webhook (POST)
URL:     https://ombuds.vercel.app/api/webhooks/plaud
Body:    {
  recording_id: string,
  transcription: string,
  summary: string,
  audio_url: string,
  duration: number
}
```

### Vinculacao com Assistido

Estrategia hibrida:
1. Se ha atendimento "aguardando gravacao" (Modulo C) -> vincula automaticamente
2. Senao -> gravacao fica em "Gravacoes nao vinculadas" (lista ja existe no UI)
3. Defensor vincula manualmente quando conveniente

### Arquivos existentes a modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/app/api/webhooks/plaud/route.ts` | Adicionar auto-upload Drive |
| `src/lib/services/plaud-api.ts` | Adicionar logica de vinculacao auto |
| `src/components/atendimentos/plaud-recordings-list.tsx` | Melhorar UX de vinculacao |

---

## Modulo C: Plaud Desktop + Registro Rapido

### Problema
Ao atender um assistido no dashboard (Registro Rapido), defensor quer poder gravar o atendimento e ter tudo vinculado automaticamente.

### Solucao
Botao "Gravar com Plaud" no Registro Rapido que coloca o sistema em estado "aguardando gravacao". Quando o Plaud completa, vincula automaticamente.

### UI no Registro Rapido

```
┌──────────────────────────────────────────┐
│ Registro Rapido               ATENDIMENTO│
│                                          │
│ ASSISTIDO                                │
│ [Q] Fulano de Tal                        │
│                                          │
│ TIPO                                     │
│ [Atendimento] [Diligencia] [Info]        │
│                                          │
│ GRAVACAO                                 │
│ [🔴 Gravar com Plaud] [🎤 Gravar aqui]  │
│  Status: Aguardando gravacao...          │
│                                          │
│ DESCRICAO                                │
│ [Descreva o atendimento realizado...]    │
└──────────────────────────────────────────┘
```

### Fluxo

1. Defensor seleciona assistido + clica "Gravar com Plaud"
2. OMBUDS cria registro temporario:
   ```typescript
   {
     assistidoId: 123,
     defensorId: 1,
     aguardandoGravacao: true,
     iniciadoEm: new Date(),
     timeout: "2h"  // expira se nenhuma gravacao chegar
   }
   ```
3. Plaud Desktop abre (deep link `plaud://` se disponivel, senao instrucao manual)
4. Defensor grava normalmente no Plaud Desktop
5. Plaud processa transcricao + resumo
6. Zapier detecta -> webhook OMBUDS
7. Webhook encontra registro "aguardando gravacao" para mesmo defensor
8. Vincula automaticamente: MP3 + transcricao + resumo ao assistido
9. Preenche campo de descricao com transcricao (ou link para ver completa)

### Alternativa: "Gravar aqui"

Usa o `AudioRecorderButton` ja existente (browser + Google Speech). Para atendimentos rapidos sem Plaud.

### Dados no DB

Reutiliza campos existentes na tabela `atendimentos`:
- `audioUrl`, `audioDriveFileId`, `audioMimeType`
- `transcricao`, `transcricaoResumo`, `transcricaoStatus`
- `plaudRecordingId`, `plaudDeviceId`
- `pontosChave` (extracaovia Gemini)

---

## Sequencia de Implementacao

```
Fase 1: Enrichment Engine — endpoint /api/transcribe (Whisper + pyannote)
  ↓
Fase 2: tRPC + UI — botao "Transcrever" em arquivos do Drive (Modulo A)
  ↓
Fase 3: Configurar Zapier — conectar Plaud ao webhook OMBUDS
  ↓
Fase 4: Ajustar webhook — auto-upload Drive + vinculacao (Modulo B)
  ↓
Fase 5: Registro Rapido — botao "Gravar com Plaud" + estado (Modulo C)
  ↓
Fase 6: Testes end-to-end + deploy
```

### Estimativa

| Fase | Esforco | Linhas |
|------|---------|--------|
| Fase 1 (enrichment) | Alto | ~300 Python |
| Fase 2 (UI + tRPC) | Medio | ~250 TS |
| Fase 3 (Zapier) | Config | 0 codigo |
| Fase 4 (webhook) | Medio | ~150 TS |
| Fase 5 (Reg. Rapido) | Medio | ~200 TS |
| **Total** | | **~900 linhas** |

---

## Verificacao

1. **Modulo A**: Upload audio teste ao Drive -> clicar Transcrever -> receber transcricao com speakers
2. **Modulo B**: Gravar com Plaud -> Zapier dispara -> MP3 + transcricao aparecem no Drive do assistido
3. **Modulo C**: Registro Rapido -> Gravar com Plaud -> gravacao vincula automaticamente ao assistido
4. **Build**: `npm run build` sem erros
5. **Browser**: Botoes e status visiveis, zero console errors
