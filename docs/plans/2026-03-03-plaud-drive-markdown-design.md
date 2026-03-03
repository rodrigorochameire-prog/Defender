# Plaud + Drive + Markdown Viewer — Design

> **Para Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unificar transcricoes Plaud com o sistema de Drive/enrichment, adicionar viewer de Markdown, e corrigir integracao de pastas Drive com assistidos.

**Contexto dos problemas identificados:**

1. **Audio nunca sobe ao Drive** — Zapier envia apenas texto (titulo, transcricao, summary). Sem `file_url`. Upload silenciosamente ignorado.
2. **Transcricao .md invisivel nas Midias** — Tab filtra apenas `audio/*` e `video/*`. O `.md` aparece so na tab Drive.
3. **345 de 351 assistidos sem pasta Drive** — `ensureDriveFolderForAssistido` e fire-and-forget, falhas silenciosas.
4. **`enrichment_data` nao populado** — O `.md` criado pelo Plaud tem `enrichment_status: "pending"` sem dados.
5. **Analise IA fragmentada** — Plaud usa Gemini Flash (4 categorias basicas), Whisper usa Claude Sonnet (analise rica).

---

## Arquitetura

Abordagem: Unificar tudo via `drive_files` (sistema existente) + metadados Plaud como extras.

O `.md` da transcricao que ja vai ao Drive vira o ponto central. Preencher `enrichment_data` na criacao, expandir Midias, adicionar Markdown viewer, e unificar analise IA via Claude Sonnet no enrichment engine.

**Tech Stack:** Next.js (tRPC), Python (FastAPI enrichment engine), react-markdown, Google Drive API.

---

## 1. Fix Data Flow — `processApprovedRecording`

**Arquivo:** `src/lib/services/plaud-api.ts`

Ao criar o `.md` no Drive, preencher `enrichment_data` e marcar como `completed`:

```typescript
await db.insert(driveFiles).values({
  driveFileId: driveResult.id,
  driveFolderId: driveFolderId,
  name: transcFileName,
  mimeType: "text/markdown",
  fileSize: transcBuffer.length,
  webViewLink: driveResult.webViewLink,
  webContentLink: driveResult.webContentLink,
  syncStatus: "synced",
  lastSyncAt: new Date(),
  assistidoId: assistidoId,
  processoId: processoId,
  enrichmentStatus: "completed",
  documentType: "transcricao_plaud",
  enrichmentData: {
    sub_type: "transcricao_plaud",
    transcript: recording.transcription,
    transcript_plain: recording.transcription,
    speakers: recording.speakers || [],
    summary: recording.summary,
    confidence: 1.0,
    interlocutor: interlocutorData?.interlocutor || null,
    tipo_gravacao: interlocutorData?.tipoGravacao || null,
    plaud_recording_id: recording.id,
    atendimento_id: atendimentoId,
  },
}).onConflictDoNothing();
```

Tambem: chamar `/api/analyze` no enrichment engine (em vez de `extractKeyPointsWithAI` local com Gemini) para analise Sonnet. Fire-and-forget — atualiza `enrichment_data.analysis` quando pronto.

---

## 2. Expandir Tab Midias

**Arquivo:** `src/app/(dashboard)/admin/assistidos/[id]/page.tsx`

Incluir arquivos com `documentType === "transcricao_plaud"` no filtro:

```typescript
const mediaFiles = useMemo(
  () =>
    data?.driveFiles?.filter(
      (f) =>
        f.mimeType?.startsWith("audio/") ||
        f.mimeType?.startsWith("video/") ||
        f.documentType === "transcricao_plaud"
    ) ?? [],
  [data?.driveFiles]
);
```

Card do item Plaud na lista:
- Icone `FileText` (Lucide) em vez de video/audio
- Badge "plaud" (violet)
- Badges existentes "transcrito" / "analisado" funcionam naturalmente
- Botao "Ver transcricao" → abre MarkdownViewerModal
- Resumo IA colapsavel inline (se `enrichmentData.summary` presente)

---

## 3. MarkdownViewerModal

**Novo arquivo:** `src/components/drive/MarkdownViewerModal.tsx`

Similar ao `PdfViewerModal` existente:

```
+------------------------------------------+--------------------+
|  # Transcricao: AIJ Jadson               |  i Metadados       |
|                                          |                    |
|  Speaker 1 00:00:03                      |  Tipo: Audiencia   |
|  Quando eu entrei na casa...             |  Interlocutor: Reu |
|                                          |  Duracao: 42min    |
|  Speaker 2 00:00:16                      |                    |
|  Soco no rosto...                        |  Pontos-chave      |
|                                          |  * Compromisso X   |
|  ...                                     |  * Providencia Y   |
|                                          |                    |
|                                          |  Resumo IA         |
|                                          |  [colapsavel]      |
+------------------------------------------+--------------------+
```

- Busca conteudo `.md` via `/api/drive/proxy?fileId=...`
- Renderiza com `react-markdown` + `remark-gfm`
- Sidebar direita so aparece se `enrichmentData.sub_type === "transcricao_plaud"` (para .md normais, viewer full-width)
- Em mobile: sidebar vira accordion abaixo do texto
- Tambem acessivel pela tab Drive (qualquer `.md` clicavel)

---

## 4. Viewer .md na Tab Drive

**Arquivos:** `DriveTabEnhanced.tsx`, `DriveDetailPanel.tsx`

Hoje clicar em `.md` abre link do Google Drive. Mudanca:
- Detectar `mimeType === "text/markdown"` ou extensao `.md`
- Abrir MarkdownViewerModal em vez de link externo
- Funciona para qualquer `.md` no Drive (nao so Plaud)

---

## 5. Endpoint `/api/analyze` no Enrichment Engine

**Novos arquivos:** `enrichment-engine/routers/analysis.py`, `enrichment-engine/models/schemas.py` (add AnalyzeInput)

```python
class AnalyzeInput(BaseModel):
    transcript: str
    file_name: str = "transcricao"
    speakers: list[str] | None = None
    db_record_id: int  # drive_files.id
    drive_file_id: str | None = None

class AnalyzeAsyncInput(AnalyzeInput):
    """Versao async — retorna 202, processa em background."""
    pass

@router.post("/analyze-async", status_code=202)
async def analyze_transcript_async(input_data: AnalyzeAsyncInput, background_tasks: BackgroundTasks):
    """Recebe transcricao ja pronta, analisa com Sonnet em background."""
    background_tasks.add_task(_process_analysis_background, input_data)
    return {"status": "accepted", "db_record_id": input_data.db_record_id}
```

Background task:
1. Chama `analysis_service.analyze_deposition(transcript, file_name, speakers)`
2. Salva resultado em `drive_files.enrichment_data.analysis` via Supabase
3. Atualiza progresso no `enrichment_data.progress`

Reutiliza `analysis_service.py` intacta — mesma analise que o Whisper path.

---

## 6. Pipeline Pos-Aprovacao Atualizado

**Arquivo:** `src/lib/services/plaud-api.ts`

Fluxo novo de `processApprovedRecording`:

```
1. Buscar assistido
2. Garantir pasta Drive (SINCRONO, nao fire-and-forget)
3. Buscar recording
4. Upload .md ao Drive com enrichment_data preenchido
5. Chamar POST /api/analyze-async no enrichment engine (fire-and-forget)
6. REMOVIDO: extractKeyPointsWithAI (Gemini)
7. REMOVIDO: enrichmentClient.enrichTranscript()
```

Elimina dependencia do Gemini para analise de transcricoes Plaud.

---

## 7. Backfill Pastas Drive

**Arquivo:** `src/lib/trpc/routers/drive.ts`

Nova mutation `backfillAssistidoFolders`:

```typescript
backfillAssistidoFolders: protectedProcedure
  .mutation(async () => {
    // 1. Buscar assistidos com drive_folder_id IS NULL e atribuicao NOT NULL
    // 2. Para cada um, createOrFindAssistidoFolder(atribuicao, nome)
    // 3. Atualizar assistidos.driveFolderId
    // 4. Processar em lotes de 10 (rate limit Google Drive)
    // 5. Retornar { created, failed, errors }
  })
```

Chamado uma vez via script ou UI admin. Na pagina do assistido, se nao tem pasta Drive, mostrar botao "Criar pasta no Drive" em vez de tab Drive vazia.

---

## 8. Backfill Dados Existentes

Script one-off para corrigir os dados ja existentes:

1. **4 `.md` files** no `drive_files` com `enrichment_status: "pending"`:
   - Buscar `plaud_recordings` correspondente por titulo/assistido_id
   - Preencher `enrichment_data` com transcricao + speakers + summary
   - Marcar `enrichment_status: "completed"`, `document_type: "transcricao_plaud"`
   - Disparar `/api/analyze-async` para cada um

2. **6 atendimentos** com `duracao: null`:
   - Copiar `plaud_recordings.duration` para `atendimentos.duracao`

3. **345 assistidos** sem pasta Drive:
   - Executar `backfillAssistidoFolders` mutation

---

## Resumo de Mudancas

| # | O que | Arquivos | Tipo |
|---|-------|----------|------|
| 1 | Fix enrichment_data no processApprovedRecording | `plaud-api.ts` | Modify |
| 2 | Expandir filtro Midias + card Plaud | `assistidos/[id]/page.tsx` | Modify |
| 3 | MarkdownViewerModal | `components/drive/MarkdownViewerModal.tsx` | Create |
| 4 | Viewer .md na tab Drive | `DriveTabEnhanced.tsx`, `DriveDetailPanel.tsx` | Modify |
| 5 | Endpoint /api/analyze-async | `routers/analysis.py`, `models/schemas.py` | Create + Modify |
| 6 | Pipeline pos-aprovacao usa Sonnet | `plaud-api.ts` | Modify |
| 7 | Backfill pastas Drive | `drive.ts` | Modify |
| 8 | Backfill dados existentes | script one-off | Create |

**Eliminados:** `extractKeyPointsWithAI` (Gemini), campo `atendimentos.pontosChave` como fonte primaria.

**Futuro (quando Plaud API disponivel):** Download de audio + upload ao Drive como `audio/m4a`.
