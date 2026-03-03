# Plaud + Drive + Markdown Viewer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unificar transcricoes Plaud com o sistema de Drive/enrichment, adicionar viewer de Markdown, e corrigir integracao de pastas Drive com assistidos.

**Architecture:** O `.md` criado pelo Plaud no Drive vira o ponto central. Preencher `enrichment_data` na criacao, expandir Midias para incluir transcricoes Plaud, adicionar MarkdownViewerModal, e unificar analise IA via Claude Sonnet no enrichment engine.

**Tech Stack:** Next.js 15, tRPC, FastAPI (enrichment engine), react-markdown + remark-gfm, Google Drive API, Claude Sonnet (analysis_service.py)

---

## Task 1: Endpoint `/api/analyze-async` no enrichment engine

**Files:**
- Modify: `enrichment-engine/models/schemas.py` (add AnalyzeInput/AnalyzeAsyncInput)
- Create: `enrichment-engine/routers/analysis.py`
- Modify: `enrichment-engine/main.py` (register router)
- Test: `enrichment-engine/tests/test_analysis.py`

**Context:** The enrichment engine already has `analysis_service.py` with `analyze_deposition()` that uses Claude Sonnet. We need a new endpoint that receives a transcript (text already available, no audio download needed) and runs the Sonnet analysis, saving results to `drive_files.enrichment_data.analysis` via Supabase.

**Step 1: Add schemas to `enrichment-engine/models/schemas.py`**

At the end of the file, before the Health section, add:

```python
# === Analysis (standalone — transcript already available) ===

class AnalyzeInput(BaseModel):
    """Input para /api/analyze — analisa transcricao ja disponivel."""
    transcript: str = Field(..., min_length=50, description="Texto da transcricao")
    file_name: str = Field("transcricao", description="Nome do arquivo (para contexto)")
    speakers: list[str] | None = Field(None, description="Lista de speakers identificados")
    assistido_nome: str | None = Field(None, description="Nome do assistido (para contexto)")


class AnalyzeAsyncInput(AnalyzeInput):
    """Input para /api/analyze-async — analisa em background, salva resultado no Supabase."""
    db_record_id: int = Field(..., description="ID do registro na tabela drive_files")
    drive_file_id: str | None = Field(None, description="Google Drive file ID (para referencia)")
```

**Step 2: Create `enrichment-engine/routers/analysis.py`**

```python
"""
POST /api/analyze-async — Analisa transcricao com Claude Sonnet.
Recebe texto ja pronto (sem download/Whisper), salva resultado no drive_files via Supabase.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from models.schemas import AnalyzeAsyncInput
from services.analysis_service import get_analysis_service

logger = logging.getLogger("enrichment-engine.analysis")
router = APIRouter()


async def _process_analysis_background(input_data: AnalyzeAsyncInput):
    """Background task: analisa transcricao e salva resultado no Supabase."""
    db_record_id = input_data.db_record_id

    logger.info(
        "Analysis started | file=%s | db_id=%d | transcript_len=%d",
        input_data.file_name,
        db_record_id,
        len(input_data.transcript),
    )

    def _update_progress(step: str, progress: int, detail: str = ""):
        """Atualiza enrichment_data.progress para polling do frontend."""
        try:
            from services.supabase_service import get_supabase_service
            supa = get_supabase_service()
            client = supa._get_client()
            # Read current enrichment_data, merge progress
            result = client.table("drive_files").select("enrichment_data").eq("id", db_record_id).single().execute()
            current_data = result.data.get("enrichment_data") or {} if result.data else {}
            current_data["progress"] = {"step": step, "percent": progress, "detail": detail}
            client.table("drive_files").update({
                "enrichment_data": current_data,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", db_record_id).execute()
        except Exception:
            pass  # Non-critical

    try:
        analysis_svc = get_analysis_service()
        if not analysis_svc.available:
            logger.warning("Analysis skipped — ANTHROPIC_API_KEY not configured")
            return

        _update_progress("analyzing", 30, "Analisando com Claude Sonnet...")

        analysis = await analysis_svc.analyze_deposition(
            transcript=input_data.transcript,
            file_name=input_data.file_name,
            speakers=input_data.speakers,
            assistido_nome=input_data.assistido_nome,
        )

        if not analysis:
            logger.warning("Analysis returned None for db_id=%d", db_record_id)
            return

        _update_progress("saving", 90, "Salvando resultado...")

        # Save analysis to drive_files.enrichment_data.analysis via Supabase
        from services.supabase_service import get_supabase_service
        supa = get_supabase_service()
        client = supa._get_client()

        # Read current enrichment_data, add analysis
        result = client.table("drive_files").select("enrichment_data").eq("id", db_record_id).single().execute()
        current_data = result.data.get("enrichment_data") or {} if result.data else {}
        current_data["analysis"] = analysis
        current_data["progress"] = {"step": "completed", "percent": 100, "detail": "Analise concluida"}

        client.table("drive_files").update({
            "enrichment_data": current_data,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", db_record_id).execute()

        logger.info(
            "Analysis COMPLETED | db_id=%d | highlights=%d | pontos_fav=%d",
            db_record_id,
            len(analysis.get("highlights", [])),
            len(analysis.get("pontos_favoraveis", [])),
        )

    except Exception as e:
        logger.error("Analysis FAILED | db_id=%d | error=%s", db_record_id, str(e))


@router.post("/analyze-async", status_code=202)
async def analyze_transcript_async(
    input_data: AnalyzeAsyncInput,
    background_tasks: BackgroundTasks,
):
    """
    Analise async de transcricao — retorna 202 Accepted imediatamente.
    Analisa com Claude Sonnet em background.
    Resultado salvo diretamente no drive_files.enrichment_data.analysis via Supabase.
    """
    logger.info(
        "Async analysis queued | file=%s | db_id=%d",
        input_data.file_name,
        input_data.db_record_id,
    )

    # Validate analysis service
    try:
        svc = get_analysis_service()
        if not svc.available:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Analysis service not available (ANTHROPIC_API_KEY not configured)",
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Analysis service not available: {str(e)}",
        )

    background_tasks.add_task(_process_analysis_background, input_data)

    return {
        "status": "accepted",
        "message": f"Analise de '{input_data.file_name}' iniciada em background",
        "db_record_id": input_data.db_record_id,
    }
```

**Step 3: Register router in `enrichment-engine/main.py`**

Add import:
```python
from routers.analysis import router as analysis_router
```

Add to routers section:
```python
app.include_router(analysis_router, prefix="/api", tags=["Analysis"])
```

**Step 4: Write test in `enrichment-engine/tests/test_analysis.py`**

```python
"""Tests for /api/analyze-async endpoint."""

import pytest
from unittest.mock import patch, MagicMock


def test_analyze_async_returns_202(client, auth_headers):
    """POST /api/analyze-async returns 202 with valid input."""
    with patch("routers.analysis.get_analysis_service") as mock_svc:
        mock_svc.return_value = MagicMock(available=True)
        resp = client.post(
            "/api/analyze-async",
            json={
                "transcript": "Speaker 1: Eu vi o acusado na cena do crime. " * 5,
                "file_name": "test_transcricao.md",
                "db_record_id": 999,
            },
            headers=auth_headers,
        )
    assert resp.status_code == 202
    data = resp.json()
    assert data["status"] == "accepted"
    assert data["db_record_id"] == 999


def test_analyze_async_rejects_short_transcript(client, auth_headers):
    """POST /api/analyze-async rejects transcript < 50 chars."""
    resp = client.post(
        "/api/analyze-async",
        json={
            "transcript": "curto",
            "file_name": "test.md",
            "db_record_id": 1,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_analyze_async_requires_db_record_id(client, auth_headers):
    """POST /api/analyze-async requires db_record_id."""
    resp = client.post(
        "/api/analyze-async",
        json={
            "transcript": "Speaker 1: Depoimento completo para teste. " * 5,
            "file_name": "test.md",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_analyze_async_503_when_unavailable(client, auth_headers):
    """POST /api/analyze-async returns 503 when Anthropic key missing."""
    with patch("routers.analysis.get_analysis_service") as mock_svc:
        mock_svc.return_value = MagicMock(available=False)
        resp = client.post(
            "/api/analyze-async",
            json={
                "transcript": "Speaker 1: Depoimento completo para teste. " * 5,
                "file_name": "test.md",
                "db_record_id": 1,
            },
            headers=auth_headers,
        )
    assert resp.status_code == 503
```

**Step 5: Run tests**

```bash
cd enrichment-engine && python3.12 -m pytest tests/ -v --tb=short
```

Expected: All tests pass (19 existing + 4 new = 23)

**Step 6: Add `analyzeAsync` to enrichment-client.ts**

In `src/lib/services/enrichment-client.ts`, add method to `EnrichmentClient` class:

```typescript
  /**
   * Analise async de transcricao — retorna 202 imediatamente.
   * Resultado salvo em drive_files.enrichment_data.analysis via Supabase.
   */
  async analyzeAsync(input: {
    transcript: string;
    fileName: string;
    speakers?: string[];
    assistidoNome?: string;
    dbRecordId: number;
    driveFileId?: string;
  }): Promise<{ status: string; message: string; db_record_id: number }> {
    const originalTimeout = this.timeout;
    this.timeout = 30_000;
    try {
      return await this.request<{ status: string; message: string; db_record_id: number }>("/api/analyze-async", {
        transcript: input.transcript,
        file_name: input.fileName,
        speakers: input.speakers ?? null,
        assistido_nome: input.assistidoNome ?? null,
        db_record_id: input.dbRecordId,
        drive_file_id: input.driveFileId ?? null,
      });
    } finally {
      this.timeout = originalTimeout;
    }
  }
```

**Step 7: Commit**

```bash
git add enrichment-engine/models/schemas.py enrichment-engine/routers/analysis.py enrichment-engine/main.py enrichment-engine/tests/test_analysis.py src/lib/services/enrichment-client.ts
git commit -m "feat(analysis): endpoint /api/analyze-async — analise Sonnet standalone"
```

---

## Task 2: Fix `processApprovedRecording` — enrichment_data + Sonnet

**Files:**
- Modify: `src/lib/services/plaud-api.ts:783-833` (transcription upload block)
- Modify: `src/lib/services/plaud-api.ts:835-856` (replace Gemini with Sonnet)

**Context:** Currently the `.md` file is created with `enrichment_status: "pending"` and no `enrichment_data`. We need to populate both, and replace the Gemini `extractKeyPointsWithAI` call with the new `/api/analyze-async` endpoint.

**Step 1: Fix the `.md` insert in `processApprovedRecording`**

In `src/lib/services/plaud-api.ts`, find the block around line 814 where `driveFiles` is inserted. Replace the entire insert:

```typescript
          if (driveResult) {
            // Registra no driveFiles com enrichment_data preenchido
            const [driveFile] = await db.insert(driveFiles).values({
              driveFileId: driveResult.id,
              driveFolderId: driveFolderId,
              name: driveResult.name || transcFileName,
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
                interlocutor: (recording.rawPayload as any)?.interlocutor || null,
                tipo_gravacao: (recording.rawPayload as any)?.tipoGravacao || null,
                plaud_recording_id: recording.id,
                atendimento_id: atendimentoId,
              },
            }).onConflictDoNothing().returning();
            console.log(`[Plaud] Transcrição uploaded ao Drive: ${transcFileName}`);

            // Fire-and-forget: analise Sonnet via enrichment engine
            if (driveFile && recording.transcription && recording.transcription.length > 100) {
              enrichmentClient.analyzeAsync({
                transcript: recording.transcription,
                fileName: transcFileName,
                speakers: Array.isArray(recording.speakers)
                  ? (recording.speakers as any[]).map((s: any) => s.name || s.id || String(s))
                  : undefined,
                assistidoNome: assistido.nome,
                dbRecordId: driveFile.id,
                driveFileId: driveResult.id,
              }).catch((err) => {
                console.error(`[Plaud] Analise Sonnet fire-and-forget falhou:`, err);
              });
            }
          }
```

**Step 2: Remove the old Gemini analysis calls**

Remove the `extractKeyPointsWithAI` call (around lines 848-856) and the `enrichmentClient.enrichTranscript` call (around lines 836-846). Replace both blocks with a comment:

```typescript
    // Analise IA agora e feita via enrichmentClient.analyzeAsync() no passo 4b acima.
    // extractKeyPointsWithAI (Gemini) e enrichmentClient.enrichTranscript foram removidos.
```

**Step 3: Make folder creation synchronous**

In `processApprovedRecording`, the folder creation at line 745-770 is already synchronous (it's awaited). Good — no change needed. But ensure that if folder creation fails, we still save the recording data without Drive upload (currently correct behavior).

**Step 4: Commit**

```bash
git add src/lib/services/plaud-api.ts
git commit -m "feat(plaud): enrichment_data preenchido no .md, analise via Sonnet"
```

---

## Task 3: Install react-markdown + MarkdownViewerModal

**Files:**
- Create: `src/components/drive/MarkdownViewerModal.tsx`

**Context:** We need a modal to render `.md` files from Drive, similar to `PdfViewerModal`. It fetches content via the Drive proxy and renders with react-markdown. When `enrichmentData.sub_type === "transcricao_plaud"`, shows a sidebar with Plaud metadata.

**Step 1: Install dependencies**

```bash
npm install react-markdown remark-gfm
```

**Step 2: Create `src/components/drive/MarkdownViewerModal.tsx`**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  X,
  FileText,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Mic,
  Users,
  Clock,
  MessageSquare,
  ClipboardList,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

// ─── Types ──────────────────────────────────────────────────────────

interface PlaudMetadata {
  sub_type?: string;
  transcript?: string;
  transcript_plain?: string;
  speakers?: Array<{ id?: string; name?: string }> | string[];
  summary?: string;
  interlocutor?: { tipo?: string; observacao?: string };
  tipo_gravacao?: string;
  plaud_recording_id?: number;
  atendimento_id?: number;
  analysis?: {
    resumo_defesa?: string;
    pontos_favoraveis?: Array<{ ponto: string; relevancia?: string }>;
    pontos_desfavoraveis?: Array<{ ponto: string; relevancia?: string }>;
    contradicoes?: Array<{ fato_1: string; fato_2: string; analise: string }>;
    highlights?: Array<{ texto: string; tipo: string; motivo?: string }>;
    providencias?: string[];
  };
  progress?: { step?: string; percent?: number; detail?: string };
}

interface MarkdownViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileId?: string; // driveFileId for proxy fetch
  content?: string; // pre-loaded content (skip fetch)
  enrichmentData?: PlaudMetadata;
  webViewLink?: string;
}

// ─── Component ──────────────────────────────────────────────────────

export function MarkdownViewerModal({
  isOpen,
  onClose,
  fileName,
  fileId,
  content: preloadedContent,
  enrichmentData,
  webViewLink,
}: MarkdownViewerModalProps) {
  const [content, setContent] = useState<string | null>(preloadedContent || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPlaud = enrichmentData?.sub_type === "transcricao_plaud";
  const analysis = enrichmentData?.analysis;

  // Fetch content from Drive proxy
  useEffect(() => {
    if (!isOpen || preloadedContent || !fileId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/drive/proxy?fileId=${fileId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        setContent(text);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen, fileId, preloadedContent]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      if (!preloadedContent) setContent(null);
      setError(null);
    }
  }, [isOpen, preloadedContent]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={cn(
          "relative flex bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden",
          "w-[95vw] h-[90vh] max-w-7xl",
        )}
      >
        {/* ── Main Content ── */}
        <div className={cn("flex-1 flex flex-col min-w-0", isPlaud && "border-r border-zinc-200 dark:border-zinc-700")}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-5 h-5 text-violet-500 shrink-0" />
              <h2 className="text-sm font-semibold truncate">{fileName}</h2>
              {isPlaud && <Badge variant="secondary" className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-[10px]">plaud</Badge>}
            </div>
            <div className="flex items-center gap-1">
              {webViewLink && (
                <Button variant="ghost" size="sm" asChild>
                  <a href={webViewLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-red-500">
                <AlertCircle className="w-8 h-8" />
                <p className="text-sm">Erro ao carregar: {error}</p>
              </div>
            )}
            {content && !loading && (
              <article className="prose prose-zinc dark:prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </article>
            )}
          </div>
        </div>

        {/* ── Sidebar (Plaud metadata) ── */}
        {isPlaud && (
          <div className="w-80 shrink-0 flex flex-col overflow-y-auto bg-zinc-50 dark:bg-zinc-800/30">
            <div className="p-4 space-y-4">
              {/* Metadata chips */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Metadados</h3>
                <div className="flex flex-wrap gap-1.5">
                  {enrichmentData?.tipo_gravacao && (
                    <Badge variant="outline" className="text-[10px]">
                      <Mic className="w-3 h-3 mr-1" />
                      {enrichmentData.tipo_gravacao}
                    </Badge>
                  )}
                  {enrichmentData?.interlocutor?.tipo && (
                    <Badge variant="outline" className="text-[10px]">
                      <Users className="w-3 h-3 mr-1" />
                      {enrichmentData.interlocutor.tipo}
                    </Badge>
                  )}
                  {enrichmentData?.atendimento_id && (
                    <Badge variant="outline" className="text-[10px]">
                      <ClipboardList className="w-3 h-3 mr-1" />
                      Atendimento #{enrichmentData.atendimento_id}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Resumo IA */}
              {(analysis?.resumo_defesa || enrichmentData?.summary) && (
                <SidebarSection title="Resumo IA" icon={<Sparkles className="w-3.5 h-3.5" />} defaultOpen>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {analysis?.resumo_defesa || enrichmentData?.summary}
                  </p>
                </SidebarSection>
              )}

              {/* Pontos favoraveis */}
              {analysis?.pontos_favoraveis && analysis.pontos_favoraveis.length > 0 && (
                <SidebarSection title={`Pontos Favoraveis (${analysis.pontos_favoraveis.length})`} icon={<BookOpen className="w-3.5 h-3.5 text-emerald-500" />}>
                  <ul className="space-y-1">
                    {analysis.pontos_favoraveis.map((p, i) => (
                      <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex gap-1.5">
                        <span className="text-emerald-500 shrink-0">+</span>
                        {p.ponto}
                      </li>
                    ))}
                  </ul>
                </SidebarSection>
              )}

              {/* Pontos desfavoraveis */}
              {analysis?.pontos_desfavoraveis && analysis.pontos_desfavoraveis.length > 0 && (
                <SidebarSection title={`Pontos Desfavoraveis (${analysis.pontos_desfavoraveis.length})`} icon={<AlertCircle className="w-3.5 h-3.5 text-red-500" />}>
                  <ul className="space-y-1">
                    {analysis.pontos_desfavoraveis.map((p, i) => (
                      <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex gap-1.5">
                        <span className="text-red-500 shrink-0">-</span>
                        {p.ponto}
                      </li>
                    ))}
                  </ul>
                </SidebarSection>
              )}

              {/* Contradicoes */}
              {analysis?.contradicoes && analysis.contradicoes.length > 0 && (
                <SidebarSection title={`Contradicoes (${analysis.contradicoes.length})`} icon={<MessageSquare className="w-3.5 h-3.5 text-amber-500" />}>
                  <ul className="space-y-2">
                    {analysis.contradicoes.map((c, i) => (
                      <li key={i} className="text-xs space-y-0.5">
                        <p className="text-zinc-600 dark:text-zinc-400">1: {c.fato_1}</p>
                        <p className="text-zinc-600 dark:text-zinc-400">2: {c.fato_2}</p>
                        <p className="text-amber-600 dark:text-amber-400 italic">{c.analise}</p>
                      </li>
                    ))}
                  </ul>
                </SidebarSection>
              )}

              {/* Providencias */}
              {analysis?.providencias && analysis.providencias.length > 0 && (
                <SidebarSection title={`Providencias (${analysis.providencias.length})`} icon={<ClipboardList className="w-3.5 h-3.5 text-blue-500" />}>
                  <ul className="space-y-1">
                    {analysis.providencias.map((p, i) => (
                      <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex gap-1.5">
                        <span className="text-blue-500 shrink-0">{i + 1}.</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </SidebarSection>
              )}

              {/* Analysis in progress */}
              {enrichmentData?.progress && enrichmentData.progress.step !== "completed" && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  <div>
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                      {enrichmentData.progress.detail || "Analisando..."}
                    </p>
                    {enrichmentData.progress.percent && (
                      <div className="w-full h-1 bg-amber-200 rounded mt-1">
                        <div className="h-1 bg-amber-500 rounded" style={{ width: `${enrichmentData.progress.percent}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar Section ────────────────────────────────────────────────

function SidebarSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-left hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-md px-2 py-1.5 transition-colors">
        {icon}
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex-1">{title}</span>
        {open ? <ChevronUp className="w-3 h-3 text-zinc-400" /> : <ChevronDown className="w-3 h-3 text-zinc-400" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 pt-1 pb-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
```

**Step 3: Commit**

```bash
npm run build 2>&1 | tail -5  # verify it compiles
git add src/components/drive/MarkdownViewerModal.tsx package.json package-lock.json
git commit -m "feat(drive): MarkdownViewerModal — viewer de .md com sidebar Plaud"
```

---

## Task 4: Wire MarkdownViewerModal into DriveDetailPanel

**Files:**
- Modify: `src/components/drive/DriveDetailPanel.tsx`

**Context:** The DriveDetailPanel already opens PdfViewerModal for PDFs. We need to add similar handling for `.md` files: detect `text/markdown` or `.md` extension, show a "Visualizar" button, and open MarkdownViewerModal.

**Step 1: Add import and state**

At the top of `DriveDetailPanel.tsx`, add import:

```typescript
import { MarkdownViewerModal } from "./MarkdownViewerModal";
```

In the main `DriveDetailPanel` component (or the relevant sub-component that renders the file detail), add state:

```typescript
const [showMarkdownViewer, setShowMarkdownViewer] = useState(false);
```

Add detection:

```typescript
const isMarkdown = mimeType === "text/markdown" || file.name?.endsWith(".md");
```

**Step 2: Add viewer button and modal**

Near where `isPdf && pdfUrl` triggers the PdfViewerModal, add the markdown equivalent:

```tsx
{isMarkdown && (
  <Button
    variant="outline"
    size="sm"
    onClick={() => setShowMarkdownViewer(true)}
    className="gap-1.5"
  >
    <FileText className="w-4 h-4" />
    Visualizar
  </Button>
)}
```

And render the modal:

```tsx
{isMarkdown && (
  <MarkdownViewerModal
    isOpen={showMarkdownViewer}
    onClose={() => setShowMarkdownViewer(false)}
    fileName={file.name}
    fileId={file.driveFileId}
    enrichmentData={file.enrichmentData as any}
    webViewLink={file.webViewLink || undefined}
  />
)}
```

**Step 3: Commit**

```bash
git add src/components/drive/DriveDetailPanel.tsx
git commit -m "feat(drive): wire MarkdownViewerModal into DriveDetailPanel"
```

---

## Task 5: Expand Midias tab to include Plaud transcriptions

**Files:**
- Modify: `src/app/(dashboard)/admin/assistidos/[id]/page.tsx`

**Context:** The Midias tab currently filters `audio/*` and `video/*` only. We need to also include files with `documentType === "transcricao_plaud"`. The card rendering for Plaud items needs a different icon and "Ver transcricao" button that opens MarkdownViewerModal.

**Step 1: Expand the filter**

Find the `mediaFiles` useMemo (around line 138). Change to:

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

**Step 2: Add MarkdownViewerModal import and state**

At the top of the file, add:

```typescript
import { MarkdownViewerModal } from "@/components/drive/MarkdownViewerModal";
```

Add state for the markdown viewer:

```typescript
const [markdownViewerFile, setMarkdownViewerFile] = useState<typeof mediaFiles[number] | null>(null);
```

**Step 3: Update card rendering in Midias tab**

In the Midias tab section, where media file cards are rendered, add detection for Plaud items and adjust the card:

For Plaud files (`f.documentType === "transcricao_plaud"`):
- Icon: `FileText` instead of video/audio icon
- Badge: `plaud` (violet)
- Button: "Ver transcricao" → `setMarkdownViewerFile(f)`
- Show summary preview if `enrichmentData?.summary` exists

**Step 4: Render the MarkdownViewerModal**

At the end of the component JSX (near where TranscriptViewer is rendered):

```tsx
{markdownViewerFile && (
  <MarkdownViewerModal
    isOpen={!!markdownViewerFile}
    onClose={() => setMarkdownViewerFile(null)}
    fileName={markdownViewerFile.name}
    fileId={markdownViewerFile.driveFileId}
    enrichmentData={markdownViewerFile.enrichmentData as any}
    webViewLink={markdownViewerFile.webViewLink || undefined}
  />
)}
```

**Step 5: Commit**

```bash
git add src/app/\\(dashboard\\)/admin/assistidos/\\[id\\]/page.tsx
git commit -m "feat(midias): expand tab to include Plaud transcriptions + MarkdownViewer"
```

---

## Task 6: Add `documentType` to assistido `getById` query

**Files:**
- Modify: `src/lib/trpc/routers/assistidos.ts`

**Context:** The assistido `getById` query fetches `driveFiles` but doesn't include `documentType` in the select. The Midias filter needs this field.

**Step 1: Add `documentType` to the driveFiles select**

In the `getById` procedure, find the driveFiles select (around line 338-358). Add `documentType`:

```typescript
.select({
  id: driveFiles.id,
  driveFileId: driveFiles.driveFileId,
  name: driveFiles.name,
  mimeType: driveFiles.mimeType,
  webViewLink: driveFiles.webViewLink,
  lastModifiedTime: driveFiles.lastModifiedTime,
  isFolder: driveFiles.isFolder,
  parentFileId: driveFiles.parentFileId,
  driveFolderId: driveFiles.driveFolderId,
  enrichmentStatus: driveFiles.enrichmentStatus,
  enrichmentData: driveFiles.enrichmentData,
  documentType: driveFiles.documentType,  // ← ADD THIS
  categoria: driveFiles.categoria,
})
```

**Step 2: Commit**

```bash
git add src/lib/trpc/routers/assistidos.ts
git commit -m "feat(assistidos): include documentType in driveFiles query"
```

---

## Task 7: Backfill pastas Drive

**Files:**
- Modify: `src/lib/trpc/routers/drive.ts`

**Context:** 345 of 351 assistidos have no `drive_folder_id`. We need a mutation to create folders in batch.

**Step 1: Add the mutation**

In `drive.ts`, add a new procedure:

```typescript
  backfillAssistidoFolders: protectedProcedure
    .mutation(async () => {
      const {
        createOrFindAssistidoFolder,
        mapAtribuicaoToFolderKey,
        isGoogleDriveConfigured,
      } = await import("@/lib/services/google-drive");

      if (!isGoogleDriveConfigured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Google Drive not configured" });
      }

      // Fetch all assistidos without drive folder
      const missing = await db
        .select({
          id: assistidos.id,
          nome: assistidos.nome,
          atribuicao: assistidos.atribuicaoPrimaria,
        })
        .from(assistidos)
        .where(isNull(assistidos.driveFolderId))
        .orderBy(assistidos.id);

      let created = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process in batches of 10
      for (let i = 0; i < missing.length; i += 10) {
        const batch = missing.slice(i, i + 10);
        for (const a of batch) {
          try {
            if (!a.atribuicao) {
              errors.push(`${a.id} ${a.nome}: sem atribuicao`);
              failed++;
              continue;
            }
            const folderKey = mapAtribuicaoToFolderKey(a.atribuicao);
            if (!folderKey) {
              errors.push(`${a.id} ${a.nome}: atribuicao ${a.atribuicao} sem mapping`);
              failed++;
              continue;
            }
            const folder = await createOrFindAssistidoFolder(folderKey, a.nome);
            if (folder) {
              await db.update(assistidos).set({
                driveFolderId: folder.id,
                updatedAt: new Date(),
              }).where(eq(assistidos.id, a.id));
              created++;
            } else {
              errors.push(`${a.id} ${a.nome}: createOrFindAssistidoFolder retornou null`);
              failed++;
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            errors.push(`${a.id} ${a.nome}: ${msg}`);
            failed++;
          }
        }
        // Small delay between batches to respect rate limits
        if (i + 10 < missing.length) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      return { total: missing.length, created, failed, errors: errors.slice(0, 20) };
    }),
```

Ensure the necessary imports are at the top of `drive.ts`:
- `isNull` from `drizzle-orm`
- `assistidos` from schema

**Step 2: Commit**

```bash
git add src/lib/trpc/routers/drive.ts
git commit -m "feat(drive): backfillAssistidoFolders mutation"
```

---

## Task 8: Backfill existing Plaud data

**Files:**
- Create: `scripts/backfill-plaud-enrichment.ts`

**Context:** 4 existing `.md` files in drive_files have `enrichment_status: "pending"`. We need to populate their `enrichment_data` from `plaud_recordings` and trigger Sonnet analysis.

**Step 1: Create backfill script**

```typescript
/**
 * Backfill: popula enrichment_data nos .md files criados pelo Plaud
 * que ainda estao com enrichment_status = "pending".
 *
 * Uso: npx tsx scripts/backfill-plaud-enrichment.ts
 */
import { db } from "@/lib/db";
import { driveFiles, plaudRecordings, atendimentos } from "@/lib/db/schema";
import { eq, and, like, isNull } from "drizzle-orm";
import { enrichmentClient } from "@/lib/services/enrichment-client";

async function main() {
  console.log("=== Backfill Plaud enrichment_data ===\n");

  // Find .md files that look like Plaud transcriptions
  const mdFiles = await db
    .select()
    .from(driveFiles)
    .where(
      and(
        eq(driveFiles.mimeType, "text/markdown"),
        like(driveFiles.name, "transcricao_%"),
        eq(driveFiles.enrichmentStatus, "pending"),
      )
    );

  console.log(`Found ${mdFiles.length} pending Plaud .md files\n`);

  for (const file of mdFiles) {
    console.log(`Processing: ${file.name} (id=${file.id})`);

    // Find matching plaud_recording by assistidoId
    if (!file.assistidoId) {
      console.log("  SKIP: no assistidoId");
      continue;
    }

    const [recording] = await db
      .select()
      .from(plaudRecordings)
      .where(eq(plaudRecordings.assistidoId, file.assistidoId))
      .orderBy(plaudRecordings.id)
      .limit(1);

    if (!recording) {
      console.log("  SKIP: no matching plaud_recording");
      continue;
    }

    // Build enrichment_data
    const enrichmentData = {
      sub_type: "transcricao_plaud",
      transcript: recording.transcription,
      transcript_plain: recording.transcription,
      speakers: recording.speakers || [],
      summary: recording.summary,
      confidence: 1.0,
      interlocutor: (recording.rawPayload as any)?.interlocutor || null,
      tipo_gravacao: (recording.rawPayload as any)?.tipoGravacao || null,
      plaud_recording_id: recording.id,
      atendimento_id: recording.atendimentoId,
    };

    await db.update(driveFiles).set({
      enrichmentStatus: "completed",
      documentType: "transcricao_plaud",
      enrichmentData,
      updatedAt: new Date(),
    }).where(eq(driveFiles.id, file.id));

    console.log(`  Updated: enrichment_data + status=completed + documentType=transcricao_plaud`);

    // Fire-and-forget: trigger Sonnet analysis
    if (recording.transcription && recording.transcription.length > 100) {
      try {
        await enrichmentClient.analyzeAsync({
          transcript: recording.transcription,
          fileName: file.name,
          dbRecordId: file.id,
          driveFileId: file.driveFileId,
        });
        console.log(`  Queued Sonnet analysis`);
      } catch (e) {
        console.log(`  Analysis queue failed (non-critical): ${e}`);
      }
    }
  }

  // Also fix atendimentos.duracao where null
  const atds = await db
    .select({
      atd_id: atendimentos.id,
      duracao: atendimentos.duracao,
      rec_id: plaudRecordings.id,
      rec_duracao: plaudRecordings.duration,
    })
    .from(atendimentos)
    .innerJoin(plaudRecordings, eq(plaudRecordings.atendimentoId, atendimentos.id))
    .where(isNull(atendimentos.duracao));

  console.log(`\nFixing ${atds.length} atendimentos with null duracao`);
  for (const a of atds) {
    if (a.rec_duracao) {
      await db.update(atendimentos).set({
        duracao: a.rec_duracao,
        updatedAt: new Date(),
      }).where(eq(atendimentos.id, a.atd_id));
      console.log(`  Atendimento ${a.atd_id}: duracao = ${a.rec_duracao}s`);
    }
  }

  console.log("\nDone!");
  process.exit(0);
}

main().catch((e) => {
  console.error("Backfill failed:", e);
  process.exit(1);
});
```

**Step 2: Commit**

```bash
git add scripts/backfill-plaud-enrichment.ts
git commit -m "feat(scripts): backfill Plaud enrichment_data + atendimentos.duracao"
```

---

## Task 9: Verify + Deploy

**Step 1: Run Python tests**

```bash
cd enrichment-engine && python3.12 -m pytest tests/ -v --tb=short
```

Expected: 23 passed

**Step 2: Build Next.js**

```bash
npm run build
```

Expected: Compiled successfully

**Step 3: Deploy enrichment engine to Railway**

```bash
cd enrichment-engine && railway up -d
```

**Step 4: Deploy Next.js to Vercel**

```bash
vercel --prod
```

**Step 5: Run backfill scripts**

```bash
# Backfill Drive folders (via tRPC — call from browser or script)
# Backfill Plaud enrichment data
npx tsx scripts/backfill-plaud-enrichment.ts
```

**Step 6: Verify in browser**

1. Navigate to `/admin/assistidos/250` (Gabriel Gomes de Jesus)
2. Click "Midias" tab — should now show the Plaud transcription .md file
3. Click "Ver transcricao" — MarkdownViewerModal opens with rendered markdown
4. Check Drive tab — .md files show "Visualizar" button
5. Verify sidebar shows metadata (tipo gravacao, etc.)

**Step 7: Final commit**

```bash
git add -A
git commit -m "chore: verify all Plaud + Drive + Markdown changes"
```
