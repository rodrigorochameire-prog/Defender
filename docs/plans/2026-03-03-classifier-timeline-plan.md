# Classificador PDF v2 (Claude Sonnet 4) + Timeline Processual — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the PDF section classifier from Gemini Flash to Claude Sonnet 4 for superior juridical reasoning, then build a ProcessoTimeline component that visualizes classified sections chronologically.

**Architecture:** Hybrid pipeline — TypeScript on-demand classification (Next.js server) + Python batch (enrichment-engine on Railway). Both write to existing `driveDocumentSections` table. UI is a vertical chronological timeline with color-coded cards by semantic group, contradiction alerts, and defense thesis highlights.

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM, `@anthropic-ai/sdk` (already installed v0.78.0), Tailwind CSS, shadcn/ui, Lucide icons.

**Design Doc:** `docs/plans/2026-03-03-classifier-timeline-design.md`

---

## Task 1: Swap Gemini → Claude Sonnet 4 in `pdf-classifier.ts`

**Files:**
- Modify: `src/lib/services/pdf-classifier.ts` (lines 1-35 config, lines 359-400 classifyPageChunk)

**Step 1: Replace imports and client setup**

Replace lines 1-35 of `src/lib/services/pdf-classifier.ts`. Remove Google Generative AI imports and replace with Anthropic SDK:

```typescript
/**
 * PDF Section Classifier — Claude Sonnet 4
 *
 * Recebe texto extraido de um bloco de paginas e identifica
 * pecas processuais com taxonomia refinada para defesa criminal.
 *
 * v2 — Nova taxonomia com relevancia defensiva, dados estruturados
 *       (pessoas, cronologia, teses) e filtro de burocracia.
 * v3 — Migrado de Gemini Flash para Claude Sonnet 4 (melhor
 *       raciocinio juridico em portugues).
 */

import Anthropic from "@anthropic-ai/sdk";

// ==========================================
// CONFIGURACAO
// ==========================================

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Fallback to Gemini if Claude unavailable
const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GEMINI_API_KEY ||
  process.env.GOOGLE_AI_API_KEY;

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!ANTHROPIC_API_KEY) throw new Error("Anthropic API key nao configurada (ANTHROPIC_API_KEY)");
  if (!anthropicClient) anthropicClient = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  return anthropicClient;
}

export function isClassifierConfigured(): boolean {
  return !!(ANTHROPIC_API_KEY || GEMINI_API_KEY);
}
```

**Step 2: Rewrite `classifyPageChunk` to use Claude**

Replace the body of `classifyPageChunk()` (lines 359-446). The CLASSIFICATION_PROMPT (lines 270-350) stays unchanged — it's the same taxonomy v2 prompt, just sent as a system message to Claude instead of a single-turn Gemini prompt:

```typescript
export async function classifyPageChunk(
  pageText: string,
  startPage: number,
  endPage: number
): Promise<ClassificationResult> {
  try {
    // Try Claude Sonnet 4 first
    if (ANTHROPIC_API_KEY) {
      return await classifyWithClaude(pageText, startPage, endPage);
    }
    // Fallback to Gemini if no Anthropic key
    if (GEMINI_API_KEY) {
      return await classifyWithGemini(pageText, startPage, endPage);
    }
    return { success: false, sections: [], error: "Nenhuma API de IA configurada (ANTHROPIC_API_KEY ou GEMINI_API_KEY)" };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(`[pdf-classifier] classifyPageChunk failed:`, msg);

    // If Claude failed, try Gemini fallback
    if (ANTHROPIC_API_KEY && GEMINI_API_KEY) {
      console.log("[pdf-classifier] Falling back to Gemini...");
      try {
        return await classifyWithGemini(pageText, startPage, endPage);
      } catch (fallbackErr) {
        console.error("[pdf-classifier] Gemini fallback also failed:", fallbackErr);
      }
    }

    return { success: false, sections: [], error: msg };
  }
}
```

**Step 3: Implement `classifyWithClaude` function**

Add after `classifyPageChunk`:

```typescript
async function classifyWithClaude(
  pageText: string,
  startPage: number,
  endPage: number
): Promise<ClassificationResult> {
  const client = getAnthropicClient();

  const userMessage = `## TEXTO DO PROCESSO (paginas ${startPage} a ${endPage})\n\n${pageText}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: CLASSIFICATION_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  // Extract text from response
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { success: false, sections: [], error: "Claude retornou resposta sem texto" };
  }

  let responseText = textBlock.text;

  // Parse JSON response (same logic as before)
  let jsonStr = responseText;
  if (responseText.includes("```json")) {
    jsonStr = responseText.split("```json")[1].split("```")[0].trim();
  } else if (responseText.includes("```")) {
    jsonStr = responseText.split("```")[1].split("```")[0].trim();
  }

  const parsed = JSON.parse(jsonStr);
  const sections: ClassifiedSection[] = (parsed.sections || []).map(
    (s: Record<string, unknown>) => {
      const tipo = SECTION_TIPOS.includes(s.tipo as SectionTipo)
        ? (s.tipo as SectionTipo)
        : mapLegacyTipo(s.tipo as string);

      return {
        tipo,
        titulo: (s.titulo as string) || "Seção sem título",
        paginaInicio: (s.paginaInicio as number) || startPage,
        paginaFim: (s.paginaFim as number) || endPage,
        resumo: (s.resumo as string) || "",
        confianca: (s.confianca as number) || 0,
        relevancia: TIPO_RELEVANCIA[tipo] || "baixo",
        metadata: {
          pessoas: Array.isArray((s.metadata as Record<string, unknown>)?.pessoas)
            ? (s.metadata as Record<string, unknown>).pessoas as PessoaExtraida[]
            : [],
          cronologia: Array.isArray((s.metadata as Record<string, unknown>)?.cronologia)
            ? (s.metadata as Record<string, unknown>).cronologia as EventoCronologia[]
            : [],
          tesesDefensivas: Array.isArray((s.metadata as Record<string, unknown>)?.tesesDefensivas)
            ? (s.metadata as Record<string, unknown>).tesesDefensivas as TeseDefensiva[]
            : [],
          contradicoes: Array.isArray((s.metadata as Record<string, unknown>)?.contradicoes)
            ? (s.metadata as Record<string, unknown>).contradicoes as string[]
            : [],
          pontosCriticos: Array.isArray((s.metadata as Record<string, unknown>)?.pontosCriticos)
            ? (s.metadata as Record<string, unknown>).pontosCriticos as string[]
            : [],
          partesmencionadas: Array.isArray((s.metadata as Record<string, unknown>)?.partesmencionadas)
            ? (s.metadata as Record<string, unknown>).partesmencionadas as string[]
            : [],
          datasExtraidas: Array.isArray((s.metadata as Record<string, unknown>)?.datasExtraidas)
            ? (s.metadata as Record<string, unknown>).datasExtraidas as string[]
            : [],
          artigosLei: Array.isArray((s.metadata as Record<string, unknown>)?.artigosLei)
            ? (s.metadata as Record<string, unknown>).artigosLei as string[]
            : [],
          juiz: typeof (s.metadata as Record<string, unknown>)?.juiz === "string"
            ? (s.metadata as Record<string, unknown>).juiz as string
            : undefined,
          promotor: typeof (s.metadata as Record<string, unknown>)?.promotor === "string"
            ? (s.metadata as Record<string, unknown>).promotor as string
            : undefined,
        },
      } satisfies ClassifiedSection;
    }
  );

  const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

  return {
    success: true,
    sections: deduplicateSections(sections),
    tokensUsed,
  };
}
```

**Step 4: Move old Gemini logic into `classifyWithGemini` fallback**

Extract the old Gemini logic into a separate function. Keep the old imports conditionally loaded:

```typescript
async function classifyWithGemini(
  pageText: string,
  startPage: number,
  endPage: number
): Promise<ClassificationResult> {
  if (!GEMINI_API_KEY) {
    return { success: false, sections: [], error: "Gemini API key nao configurada" };
  }

  // Lazy import to avoid loading Google AI SDK when not needed
  const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = await import("@google/generative-ai");

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    ],
  });

  const prompt = `${CLASSIFICATION_PROMPT}\n\n## TEXTO DO PROCESSO (paginas ${startPage} a ${endPage})\n\n${pageText}`;
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  // ... same JSON parsing logic as classifyWithClaude ...
  let jsonStr = responseText;
  if (responseText.includes("```json")) {
    jsonStr = responseText.split("```json")[1].split("```")[0].trim();
  } else if (responseText.includes("```")) {
    jsonStr = responseText.split("```")[1].split("```")[0].trim();
  }

  const parsed = JSON.parse(jsonStr);
  const sections: ClassifiedSection[] = (parsed.sections || []).map(
    (s: Record<string, unknown>) => {
      const tipo = SECTION_TIPOS.includes(s.tipo as SectionTipo)
        ? (s.tipo as SectionTipo)
        : mapLegacyTipo(s.tipo as string);

      return {
        tipo,
        titulo: (s.titulo as string) || "Seção sem título",
        paginaInicio: (s.paginaInicio as number) || startPage,
        paginaFim: (s.paginaFim as number) || endPage,
        resumo: (s.resumo as string) || "",
        confianca: (s.confianca as number) || 0,
        relevancia: TIPO_RELEVANCIA[tipo] || "baixo",
        metadata: {
          pessoas: Array.isArray((s.metadata as Record<string, unknown>)?.pessoas)
            ? (s.metadata as Record<string, unknown>).pessoas as PessoaExtraida[]
            : [],
          cronologia: Array.isArray((s.metadata as Record<string, unknown>)?.cronologia)
            ? (s.metadata as Record<string, unknown>).cronologia as EventoCronologia[]
            : [],
          tesesDefensivas: Array.isArray((s.metadata as Record<string, unknown>)?.tesesDefensivas)
            ? (s.metadata as Record<string, unknown>).tesesDefensivas as TeseDefensiva[]
            : [],
          contradicoes: Array.isArray((s.metadata as Record<string, unknown>)?.contradicoes)
            ? (s.metadata as Record<string, unknown>).contradicoes as string[]
            : [],
          pontosCriticos: Array.isArray((s.metadata as Record<string, unknown>)?.pontosCriticos)
            ? (s.metadata as Record<string, unknown>).pontosCriticos as string[]
            : [],
          partesmencionadas: Array.isArray((s.metadata as Record<string, unknown>)?.partesmencionadas)
            ? (s.metadata as Record<string, unknown>).partesmencionadas as string[]
            : [],
          datasExtraidas: Array.isArray((s.metadata as Record<string, unknown>)?.datasExtraidas)
            ? (s.metadata as Record<string, unknown>).datasExtraidas as string[]
            : [],
          artigosLei: Array.isArray((s.metadata as Record<string, unknown>)?.artigosLei)
            ? (s.metadata as Record<string, unknown>).artigosLei as string[]
            : [],
          juiz: typeof (s.metadata as Record<string, unknown>)?.juiz === "string"
            ? (s.metadata as Record<string, unknown>).juiz as string
            : undefined,
          promotor: typeof (s.metadata as Record<string, unknown>)?.promotor === "string"
            ? (s.metadata as Record<string, unknown>).promotor as string
            : undefined,
        },
      } satisfies ClassifiedSection;
    }
  );

  return {
    success: true,
    sections: deduplicateSections(sections),
  };
}
```

**Step 5: Update `triggerClassification` log messages**

In `src/lib/trpc/routers/document-sections.ts`, update the log messages in `triggerClassification` (line ~417-425):

Change: `"Classifying ${chunks.length} chunks with Gemini..."` → `"Classifying ${chunks.length} chunks with Claude Sonnet 4..."`
Change: `"Gemini API não configurada (GOOGLE_AI_API_KEY)"` → `"Nenhuma API de IA configurada (ANTHROPIC_API_KEY ou GEMINI_API_KEY)"`

**Step 6: Verify ANTHROPIC_API_KEY is set**

Run: `grep ANTHROPIC_API_KEY .env.local`

If not set, add it. The key should already be available in the Vercel environment.

**Step 7: Build check**

Run: `npm run build`
Expected: Build succeeds with no errors in pdf-classifier.ts

**Step 8: Commit**

```bash
git add src/lib/services/pdf-classifier.ts src/lib/trpc/routers/document-sections.ts
git commit -m "feat(classifier): migrate from Gemini Flash to Claude Sonnet 4

Claude Sonnet 4 provides superior juridical reasoning in Portuguese,
better contradiction detection, and more accurate defense thesis extraction.
Gemini Flash kept as automatic fallback if Claude is unavailable."
```

---

## Task 2: Add `timelineByProcessoId` query to document-sections router

**Files:**
- Modify: `src/lib/trpc/routers/document-sections.ts` (after line ~170, after `listByProcesso`)

**Step 1: Add the timeline-specific query**

This query differs from `listByProcesso` by:
- Filtering out `burocracia` type sections
- Ordering by event date (from metadata) instead of page number
- Including semantic group info

Add after the `listByProcesso` procedure (line ~170):

```typescript
  // Timeline view: chronological sections for a processo
  // Excludes burocracia, orders by event date, includes file info
  timelineByProcessoId: protectedProcedure
    .input(z.object({
      processoId: z.number(),
      minRelevancia: z.enum(["critico", "alto", "medio", "baixo"]).optional(),
      tipos: z.array(sectionTipoEnum).optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(driveFiles.processoId, input.processoId),
        // Exclude burocracia from timeline
        sql`${driveDocumentSections.tipo} != 'burocracia'`,
      ];

      if (input.tipos && input.tipos.length > 0) {
        conditions.push(inArray(driveDocumentSections.tipo, input.tipos));
      }

      if (input.search) {
        conditions.push(
          sql`(${ilike(driveDocumentSections.titulo, `%${input.search}%`)} OR ${ilike(driveDocumentSections.resumo ?? '', `%${input.search}%`)})`
        );
      }

      const results = await db
        .select({
          id: driveDocumentSections.id,
          tipo: driveDocumentSections.tipo,
          titulo: driveDocumentSections.titulo,
          resumo: driveDocumentSections.resumo,
          paginaInicio: driveDocumentSections.paginaInicio,
          paginaFim: driveDocumentSections.paginaFim,
          confianca: driveDocumentSections.confianca,
          reviewStatus: driveDocumentSections.reviewStatus,
          metadata: driveDocumentSections.metadata,
          fichaData: driveDocumentSections.fichaData,
          createdAt: driveDocumentSections.createdAt,
          // File info
          fileId: driveFiles.id,
          fileName: driveFiles.name,
          fileWebViewLink: driveFiles.webViewLink,
        })
        .from(driveDocumentSections)
        .innerJoin(driveFiles, eq(driveDocumentSections.driveFileId, driveFiles.id))
        .where(and(...conditions))
        .orderBy(
          // Order by event date from metadata if available, else by page
          sql`COALESCE(
            (${driveDocumentSections.metadata}->>'eventDate')::text,
            (${driveDocumentSections.fichaData}->>'dataEvento')::text,
            ''
          ) ASC`,
          asc(driveDocumentSections.paginaInicio)
        );

      // Post-process: add relevancia and group from taxonomy
      return results.map((r) => ({
        ...r,
        relevancia: TIPO_RELEVANCIA[r.tipo] ?? "baixo",
        grupo: TIPO_TO_GROUP[r.tipo] ?? "outros",
      }));
    }),
```

**Step 2: Import taxonomy constants at the top of the router file**

Add import at top of `document-sections.ts`:

```typescript
import { TIPO_RELEVANCIA, TIPO_TO_GROUP } from "@/lib/services/pdf-classifier";
```

**Step 3: Build check**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/lib/trpc/routers/document-sections.ts
git commit -m "feat(timeline): add timelineByProcessoId query

Cross-file query joining sections with drive files, excludes burocracia,
orders by event date, adds relevancia and semantic group info."
```

---

## Task 3: Create `ProcessoTimeline` component

**Files:**
- Create: `src/components/processos/ProcessoTimeline.tsx`

**Reference components:**
- `src/components/shared/timeline.tsx` — base Timeline/TimelineItem pattern
- `src/components/casos/enhanced-timeline.tsx` — TimelineEvent interface
- `src/components/intelligence/IntelligenceTimeline.tsx` — severity coloring

**Step 1: Create the component file**

Create `src/components/processos/ProcessoTimeline.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  Users, Microscope, Gavel, ShieldCheck, BookMarked, Shield,
  CalendarDays, FileCheck, HelpCircle, AlertTriangle, Lightbulb,
  Search, Filter, FileText, ChevronDown, ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ==========================================
// CONSTANTS — Semantic group styling
// ==========================================

const GROUP_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  borderColor: string;
  bgColor: string;
  textColor: string;
}> = {
  depoimentos: {
    label: "Depoimentos",
    icon: Users,
    borderColor: "border-l-blue-500",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-400",
  },
  laudos: {
    label: "Laudos",
    icon: Microscope,
    borderColor: "border-l-purple-500",
    bgColor: "bg-purple-500/10",
    textColor: "text-purple-400",
  },
  decisoes: {
    label: "Decisoes",
    icon: Gavel,
    borderColor: "border-l-red-500",
    bgColor: "bg-red-500/10",
    textColor: "text-red-400",
  },
  defesa: {
    label: "Defesa",
    icon: ShieldCheck,
    borderColor: "border-l-emerald-500",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-400",
  },
  mp: {
    label: "MP",
    icon: BookMarked,
    borderColor: "border-l-amber-500",
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-400",
  },
  investigacao: {
    label: "Investigacao",
    icon: Shield,
    borderColor: "border-l-orange-500",
    bgColor: "bg-orange-500/10",
    textColor: "text-orange-400",
  },
  audiencias: {
    label: "Audiencias",
    icon: CalendarDays,
    borderColor: "border-l-indigo-500",
    bgColor: "bg-indigo-500/10",
    textColor: "text-indigo-400",
  },
  documentos: {
    label: "Documentos",
    icon: FileCheck,
    borderColor: "border-l-green-500",
    bgColor: "bg-green-500/10",
    textColor: "text-green-400",
  },
  outros: {
    label: "Outros",
    icon: HelpCircle,
    borderColor: "border-l-zinc-500",
    bgColor: "bg-zinc-500/10",
    textColor: "text-zinc-400",
  },
};

const RELEVANCIA_CONFIG: Record<string, {
  label: string;
  dotColor: string;
  badgeVariant: string;
}> = {
  critico: { label: "Critico", dotColor: "bg-red-500", badgeVariant: "bg-red-500/20 text-red-300 border-red-500/30" },
  alto: { label: "Alto", dotColor: "bg-amber-500", badgeVariant: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  medio: { label: "Medio", dotColor: "bg-blue-500", badgeVariant: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  baixo: { label: "Baixo", dotColor: "bg-zinc-500", badgeVariant: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
};

// ==========================================
// TYPES
// ==========================================

type TimelineSection = {
  id: number;
  tipo: string;
  titulo: string;
  resumo: string | null;
  paginaInicio: number;
  paginaFim: number;
  confianca: number | null;
  reviewStatus: string | null;
  metadata: Record<string, unknown> | null;
  fichaData: Record<string, unknown> | null;
  createdAt: Date | null;
  fileId: number;
  fileName: string;
  fileWebViewLink: string | null;
  relevancia: string;
  grupo: string;
};

// ==========================================
// COMPONENT
// ==========================================

interface ProcessoTimelineProps {
  processoId: number;
  compact?: boolean; // For mini-timeline in Drive folder view
}

export function ProcessoTimeline({ processoId, compact = false }: ProcessoTimelineProps) {
  const [search, setSearch] = useState("");
  const [activeRelevancia, setActiveRelevancia] = useState<Set<string>>(
    new Set(["critico", "alto"])
  );
  const [showFilters, setShowFilters] = useState(false);

  const { data: sections = [], isLoading } = trpc.documentSections.timelineByProcessoId.useQuery(
    { processoId, search: search || undefined },
    { enabled: !!processoId }
  );

  // Filter by relevancia client-side (fast)
  const filtered = useMemo(() => {
    if (activeRelevancia.size === 0) return sections;
    return sections.filter((s: TimelineSection) => activeRelevancia.has(s.relevancia));
  }, [sections, activeRelevancia]);

  // Stats
  const stats = useMemo(() => {
    const totalContradicoes = sections.reduce((acc: number, s: TimelineSection) => {
      const c = (s.metadata as Record<string, unknown>)?.contradicoes;
      return acc + (Array.isArray(c) ? c.length : 0);
    }, 0);
    const totalTeses = sections.reduce((acc: number, s: TimelineSection) => {
      const t = (s.metadata as Record<string, unknown>)?.tesesDefensivas;
      return acc + (Array.isArray(t) ? t.length : 0);
    }, 0);
    return { total: sections.length, contradicoes: totalContradicoes, teses: totalTeses };
  }, [sections]);

  const toggleRelevancia = (r: string) => {
    setActiveRelevancia((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-zinc-800/50 animate-pulse" />
        ))}
      </div>
    );
  }

  // Empty state
  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-zinc-600 mb-3" />
        <p className="text-zinc-400 text-sm">
          Nenhum documento classificado para este processo.
        </p>
        <p className="text-zinc-500 text-xs mt-1">
          Classifique PDFs no Drive para alimentar a timeline.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("space-y-4", compact ? "px-2" : "px-4")}>
        {/* Header + Filters */}
        {!compact && (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar na timeline..."
                className="pl-9 bg-zinc-900 border-zinc-800 text-sm h-9"
              />
            </div>

            {/* Relevancia toggles */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1 text-zinc-400"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-3 w-3" />
                Filtros
                <ChevronDown className={cn("h-3 w-3 transition-transform", showFilters && "rotate-180")} />
              </Button>

              {(["critico", "alto", "medio", "baixo"] as const).map((r) => {
                const config = RELEVANCIA_CONFIG[r];
                const isActive = activeRelevancia.has(r);
                return (
                  <button
                    key={r}
                    onClick={() => toggleRelevancia(r)}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer",
                      isActive ? config.badgeVariant : "bg-zinc-900 text-zinc-600 border-zinc-800"
                    )}
                  >
                    {config.label}
                  </button>
                );
              })}

              {/* Stats */}
              <div className="ml-auto flex items-center gap-3 text-[11px] text-zinc-500">
                <span>{stats.total} secoes</span>
                {stats.contradicoes > 0 && (
                  <span className="text-amber-400">
                    <AlertTriangle className="h-3 w-3 inline mr-0.5" />
                    {stats.contradicoes}
                  </span>
                )}
                {stats.teses > 0 && (
                  <span className="text-emerald-400">
                    <Lightbulb className="h-3 w-3 inline mr-0.5" />
                    {stats.teses}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-zinc-800" />

          <div className="space-y-3">
            {filtered.map((section: TimelineSection) => {
              const group = GROUP_CONFIG[section.grupo] ?? GROUP_CONFIG.outros;
              const Icon = group.icon;
              const relConfig = RELEVANCIA_CONFIG[section.relevancia] ?? RELEVANCIA_CONFIG.baixo;
              const meta = (section.metadata ?? {}) as Record<string, unknown>;
              const contradicoes = Array.isArray(meta.contradicoes) ? meta.contradicoes as string[] : [];
              const teses = Array.isArray(meta.tesesDefensivas) ? meta.tesesDefensivas as Array<{ descricao: string }> : [];
              const pessoas = Array.isArray(meta.pessoas) ? meta.pessoas as Array<{ nome: string; papel: string }> : [];

              return (
                <div key={section.id} className="relative pl-10">
                  {/* Dot on timeline */}
                  <div className={cn(
                    "absolute left-2.5 top-3 h-3 w-3 rounded-full border-2 border-zinc-900 z-10",
                    relConfig.dotColor
                  )} />

                  {/* Card */}
                  <div className={cn(
                    "rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 border-l-2",
                    group.borderColor,
                    section.confianca !== null && section.confianca < 70 && "border-dashed"
                  )}>
                    {/* Header */}
                    <div className="flex items-start gap-2 mb-1.5">
                      <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", group.textColor)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 leading-tight truncate">
                          {section.titulo}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className={cn("text-[10px] px-1 py-0", group.bgColor, group.textColor, "border-0")}>
                            {group.label}
                          </Badge>
                          {section.confianca !== null && section.confianca < 70 && (
                            <span className="text-[10px] text-zinc-500">
                              {section.confianca}% confianca
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Resumo */}
                    {section.resumo && !compact && (
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1.5 ml-6">
                        {section.resumo}
                      </p>
                    )}

                    {/* Pessoas */}
                    {pessoas.length > 0 && !compact && (
                      <div className="flex items-center gap-1 mt-1.5 ml-6 flex-wrap">
                        <Users className="h-3 w-3 text-zinc-600 shrink-0" />
                        {pessoas.slice(0, 3).map((p, i) => (
                          <span key={i} className="text-[10px] text-zinc-400">
                            {p.nome} ({p.papel}){i < Math.min(pessoas.length, 3) - 1 ? "," : ""}
                          </span>
                        ))}
                        {pessoas.length > 3 && (
                          <span className="text-[10px] text-zinc-500">+{pessoas.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Alerts: Contradictions + Theses */}
                    {(contradicoes.length > 0 || teses.length > 0) && !compact && (
                      <div className="space-y-1 mt-2 ml-6">
                        {contradicoes.map((c, i) => (
                          <div key={`c-${i}`} className="flex items-start gap-1.5 text-[11px] text-amber-400 bg-amber-500/5 rounded px-2 py-1">
                            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{c}</span>
                          </div>
                        ))}
                        {teses.map((t, i) => (
                          <div key={`t-${i}`} className="flex items-start gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/5 rounded px-2 py-1">
                            <Lightbulb className="h-3 w-3 shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{t.descricao}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Footer: file info + pages */}
                    <div className="flex items-center gap-2 mt-2 ml-6 text-[10px] text-zinc-500">
                      <FileText className="h-3 w-3" />
                      <span className="truncate max-w-[200px]">{section.fileName}</span>
                      <span>pp. {section.paginaInicio}-{section.paginaFim}</span>
                      {section.fileWebViewLink && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={section.fileWebViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto hover:text-zinc-300 transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p className="text-xs">Abrir no Drive</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer stats */}
        {!compact && filtered.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-[11px] text-zinc-500">
            <span>
              {filtered.length} de {sections.length} secoes
              {filtered.length < sections.length && " (filtradas)"}
            </span>
            <div className="flex gap-2">
              {stats.contradicoes > 0 && (
                <button
                  onClick={() => setSearch("contradicao")}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  Ver {stats.contradicoes} contradicoes
                </button>
              )}
              {stats.teses > 0 && (
                <button
                  onClick={() => setSearch("tese")}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Ver {stats.teses} teses
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
```

**Step 2: Build check**

Run: `npm run build`
Expected: Build succeeds. Component compiles cleanly.

**Step 3: Commit**

```bash
git add src/components/processos/ProcessoTimeline.tsx
git commit -m "feat(timeline): create ProcessoTimeline component

Vertical chronological timeline with color-coded cards by semantic group,
relevancia filters, contradiction alerts, defense thesis highlights,
person mentions, and direct links to Drive files."
```

---

## Task 4: Add "Timeline" tab to processo detail page

**Files:**
- Modify: `src/app/(dashboard)/admin/processos/[id]/page.tsx` (lines 16, 83-92, 307-470)

**Step 1: Add import**

At the top of the file, add:

```typescript
import { ProcessoTimeline } from "@/components/processos/ProcessoTimeline";
```

**Step 2: Add "timeline" to Tab type**

Change line 16 from:
```typescript
type Tab = "partes" | "demandas" | "drive" | "audiencias" | "vinculados" | "inteligencia";
```
to:
```typescript
type Tab = "partes" | "demandas" | "drive" | "audiencias" | "timeline" | "vinculados" | "inteligencia";
```

**Step 3: Add tab definition**

In the tabs array (around line 83-92), add after the "audiencias" tab:

```typescript
{ key: "timeline", label: "Timeline" },
```

**Step 4: Add tab content rendering**

In the tab content switch/render section (around line 307-470), add a new case for "timeline":

```tsx
{activeTab === "timeline" && (
  <div className="py-4">
    <ProcessoTimeline processoId={data.id} />
  </div>
)}
```

**Step 5: Build check**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/app/(dashboard)/admin/processos/[id]/page.tsx
git commit -m "feat(processo): add Timeline tab to processo detail page

New tab shows ProcessoTimeline component, displaying classified
document sections in chronological order with filters and alerts."
```

---

## Task 5: Add mini-timeline to DriveTabEnhanced

**Files:**
- Modify: `src/components/drive/DriveTabEnhanced.tsx` (add "Processo" view mode)

**Step 1: Add import**

At the top of `DriveTabEnhanced.tsx`, add:

```typescript
import { ProcessoTimeline } from "@/components/processos/ProcessoTimeline";
```

**Step 2: Add "Processo" view mode**

In the view modes array (around line 57-61), the current views are: "Arvore", "Timeline" (documental), "Status".

Add a 4th view "Processo" that only shows when the folder has a `processoId`:

After the existing view mode buttons (around line 61), add a conditional button:

```tsx
{processoId && (
  <button
    onClick={() => setView("processo")}
    className={cn(
      "px-3 py-1 text-xs rounded-md transition-colors",
      view === "processo"
        ? "bg-zinc-800 text-white"
        : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
    )}
  >
    Processo
  </button>
)}
```

**Step 3: Add processo view rendering**

In the view rendering section, add:

```tsx
{view === "processo" && processoId && (
  <ProcessoTimeline processoId={processoId} compact />
)}
```

Note: The `processoId` should be derivable from the current folder's linked processo. Check the DriveTabEnhanced props and context to find how `processoId` is passed.

**Step 4: Build check**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/components/drive/DriveTabEnhanced.tsx
git commit -m "feat(drive): add Processo timeline view in DriveTabEnhanced

When a Drive folder is linked to a processo, shows a compact
ProcessoTimeline as a 4th view mode alongside Arvore/Timeline/Status."
```

---

## Task 6: Sync Python taxonomy with TypeScript v2

**Files:**
- Modify: `enrichment-engine/prompts/document_classifier.py`
- Modify: `enrichment-engine/models/schemas.py`

**Step 1: Update Python document classifier prompt**

Replace `CLASSIFIER_SCHEMA` in `enrichment-engine/prompts/document_classifier.py` with the full v2 taxonomy:

```python
CLASSIFIER_SCHEMA = """{
  "document_type": "denuncia | sentenca | depoimento_vitima | depoimento_testemunha | depoimento_investigado | decisao | pronuncia | laudo_pericial | laudo_necroscopico | laudo_local | ata_audiencia | interrogatorio | alegacoes_mp | alegacoes_defesa | resposta_acusacao | recurso | habeas_corpus | boletim_ocorrencia | portaria_ip | relatorio_policial | auto_prisao | termo_inquerito | certidao_relevante | diligencias_422 | alegacoes | documento_identidade | outros | burocracia",
  "sub_type": "string ou null",
  "area": "JURI | VD | EP | CRIMINAL | CIVEL | INFANCIA | null",
  "confidence": 0.0,
  "relevancia": "critico | alto | medio | baixo | oculto"
}"""
```

**Step 2: Add taxonomy constants to Python schemas**

In `enrichment-engine/models/schemas.py`, add:

```python
# Taxonomy v2 — mirrored from TypeScript pdf-classifier.ts
SECTION_TIPOS = [
    # CRITICO
    "denuncia", "sentenca", "depoimento_vitima", "depoimento_testemunha", "depoimento_investigado",
    # ALTO
    "decisao", "pronuncia", "laudo_pericial", "laudo_necroscopico", "laudo_local",
    "ata_audiencia", "interrogatorio", "alegacoes_mp", "alegacoes_defesa",
    "resposta_acusacao", "recurso", "habeas_corpus",
    # MEDIO
    "boletim_ocorrencia", "portaria_ip", "relatorio_policial", "auto_prisao",
    "termo_inquerito", "certidao_relevante", "diligencias_422", "alegacoes",
    # BAIXO
    "documento_identidade", "outros",
    # OCULTO
    "burocracia",
]

TIPO_RELEVANCIA = {
    "denuncia": "critico", "sentenca": "critico",
    "depoimento_vitima": "critico", "depoimento_testemunha": "critico",
    "depoimento_investigado": "critico",
    "decisao": "alto", "pronuncia": "alto",
    "laudo_pericial": "alto", "laudo_necroscopico": "alto", "laudo_local": "alto",
    "ata_audiencia": "alto", "interrogatorio": "alto",
    "alegacoes_mp": "alto", "alegacoes_defesa": "alto",
    "resposta_acusacao": "alto", "recurso": "alto", "habeas_corpus": "alto",
    "boletim_ocorrencia": "medio", "portaria_ip": "medio",
    "relatorio_policial": "medio", "auto_prisao": "medio",
    "termo_inquerito": "medio", "certidao_relevante": "medio",
    "diligencias_422": "medio", "alegacoes": "medio",
    "documento_identidade": "baixo", "outros": "baixo",
    "burocracia": "oculto",
}
```

**Step 3: Commit**

```bash
git add enrichment-engine/prompts/document_classifier.py enrichment-engine/models/schemas.py
git commit -m "feat(enrichment): sync Python taxonomy with TypeScript v2

27 document types with 5 relevance levels, mirrored from pdf-classifier.ts.
Python enrichment engine now uses the same classification schema."
```

---

## Task 7: Deploy and verify

**Step 1: Full build**

Run: `npm run build`
Expected: Clean build, no errors

**Step 2: Test locally**

Run: `npm run dev`
Navigate to a processo with classified documents and check:
- [ ] Timeline tab appears
- [ ] Sections render with correct colors
- [ ] Filters work
- [ ] Empty state shows for processos without classified docs

**Step 3: Deploy Next.js**

Run: `vercel --prod`
Expected: Deploy succeeds

**Step 4: Deploy enrichment-engine**

Run: `cd enrichment-engine && railway up -d`
Expected: Deploy succeeds

**Step 5: Update Jira**

Mark SCRUM-16 and SCRUM-21 as "Done"

**Step 6: Final commit**

```bash
git add -A
git commit -m "chore: final adjustments for classifier v2 + timeline"
```
