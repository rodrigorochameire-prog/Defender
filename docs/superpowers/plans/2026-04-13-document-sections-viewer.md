# Document Sections Viewer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a UI that lets defensores browse, filter and inspect the 47 types of document sections (depoimentos, laudos, denúncia, pronúncia, alegações, etc.) extracted from PDF case files, organized by relevance tier and groupable by depoente/tipo.

**Architecture:** New tRPC procedures to query `drive_document_sections` joined with `drive_files`, a new `SectionsViewer` component added as a view mode inside the existing `DriveTabEnhanced`, and a `SectionDetailSheet` for inspecting individual sections with their extracted text, metadata (pessoas, cronologia, teses), and PDF page link. Follows existing patterns: shadcn/ui, design tokens, glass cards, Sheet for detail.

**Tech Stack:** Next.js 15 App Router, tRPC, Drizzle ORM, shadcn/ui (Card, Badge, Sheet, ScrollArea, Tabs), Lucide icons, existing design tokens.

**Current data:** 252 sections classified across ~10 processos, 20 distinct types. All `review_status = 'pending'`, 0 with `ficha_data`.

---

## Scope

This plan covers:
- 2 new tRPC queries (sections by assistido, sections by processo)
- 1 new view mode "Peças" in DriveTabEnhanced
- Section list with filtering by relevance tier and tipo
- Section detail sheet with text, metadata, PDF link
- Grouping by depoente for testimony sections

This plan does NOT cover:
- Ficha generation UI (no data yet)
- Cross-analysis/contradictions viewer
- Section review/approval workflow
- PDF inline annotation overlay

---

## File Structure

```
src/
├── lib/trpc/routers/drive.ts                    # MODIFY: add 2 procedures
├── components/drive/
│   ├── DriveTabEnhanced.tsx                     # MODIFY: add "Peças" view mode
│   ├── SectionsViewer.tsx                       # CREATE: main sections list with filters
│   ├── SectionCard.tsx                          # CREATE: individual section card
│   └── SectionDetailSheet.tsx                   # CREATE: section detail side panel
```

---

## Task 1: tRPC Procedures for Document Sections

**Files:**
- Modify: `src/lib/trpc/routers/drive.ts`

This task adds two query procedures: `sectionsByAssistido` and `sectionsByProcesso`. Both join `drive_document_sections` with `drive_files` to get file name and web view link.

- [ ] **Step 1: Add the sectionsByAssistido procedure**

Add after the `filesByAssistido` procedure (around line 1948). Insert this code:

```typescript
  sectionsByAssistido: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ input }) => {
      const sections = await db
        .select({
          id: driveDocumentSections.id,
          tipo: driveDocumentSections.tipo,
          titulo: driveDocumentSections.titulo,
          paginaInicio: driveDocumentSections.paginaInicio,
          paginaFim: driveDocumentSections.paginaFim,
          resumo: driveDocumentSections.resumo,
          textoExtraido: driveDocumentSections.textoExtraido,
          confianca: driveDocumentSections.confianca,
          reviewStatus: driveDocumentSections.reviewStatus,
          fichaData: driveDocumentSections.fichaData,
          metadata: driveDocumentSections.metadata,
          createdAt: driveDocumentSections.createdAt,
          // File info
          fileId: driveFiles.id,
          fileName: driveFiles.name,
          fileWebViewLink: driveFiles.webViewLink,
          fileMimeType: driveFiles.mimeType,
        })
        .from(driveDocumentSections)
        .innerJoin(driveFiles, eq(driveDocumentSections.driveFileId, driveFiles.id))
        .where(eq(driveFiles.assistidoId, input.assistidoId))
        .orderBy(driveDocumentSections.tipo, driveDocumentSections.paginaInicio);

      return sections;
    }),
```

- [ ] **Step 2: Add the sectionsByProcesso procedure**

Add right after `sectionsByAssistido`:

```typescript
  sectionsByProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      const sections = await db
        .select({
          id: driveDocumentSections.id,
          tipo: driveDocumentSections.tipo,
          titulo: driveDocumentSections.titulo,
          paginaInicio: driveDocumentSections.paginaInicio,
          paginaFim: driveDocumentSections.paginaFim,
          resumo: driveDocumentSections.resumo,
          textoExtraido: driveDocumentSections.textoExtraido,
          confianca: driveDocumentSections.confianca,
          reviewStatus: driveDocumentSections.reviewStatus,
          fichaData: driveDocumentSections.fichaData,
          metadata: driveDocumentSections.metadata,
          createdAt: driveDocumentSections.createdAt,
          fileId: driveFiles.id,
          fileName: driveFiles.name,
          fileWebViewLink: driveFiles.webViewLink,
          fileMimeType: driveFiles.mimeType,
        })
        .from(driveDocumentSections)
        .innerJoin(driveFiles, eq(driveDocumentSections.driveFileId, driveFiles.id))
        .where(eq(driveFiles.processoId, input.processoId))
        .orderBy(driveDocumentSections.tipo, driveDocumentSections.paginaInicio);

      return sections;
    }),
```

- [ ] **Step 3: Verify imports exist**

Check that `driveDocumentSections` is already imported at the top of the file. If not, add it to the import from `@/lib/db/schema/drive`. It should already be there since the schema exports it.

- [ ] **Step 4: Build and verify**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npm run build 2>&1 | tail -20`
Expected: Build succeeds with no type errors on the new procedures.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/routers/drive.ts
git commit -m "feat: add sectionsByAssistido and sectionsByProcesso tRPC queries"
```

---

## Task 2: SectionCard Component

**Files:**
- Create: `src/components/drive/SectionCard.tsx`

A card that displays one document section with its type badge, title, page range, confidence, and summary. Uses the existing section type color config from PdfViewerModal.

- [ ] **Step 1: Create SectionCard.tsx**

```tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink } from "lucide-react";

// Relevance tiers matching pdf-classifier.ts
const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  critico: { label: "Crítico", color: "bg-red-100 text-red-700 border-red-200" },
  alto: { label: "Alto", color: "bg-orange-100 text-orange-700 border-orange-200" },
  medio: { label: "Médio", color: "bg-blue-100 text-blue-700 border-blue-200" },
  baixo: { label: "Baixo", color: "bg-zinc-100 text-zinc-500 border-zinc-200" },
  oculto: { label: "Burocracia", color: "bg-zinc-50 text-zinc-400 border-zinc-100" },
};

const TIPO_TO_TIER: Record<string, string> = {
  denuncia: "critico", sentenca: "critico", depoimento_vitima: "critico",
  depoimento_testemunha: "critico", depoimento_investigado: "critico",
  decisao: "alto", pronuncia: "alto", laudo_pericial: "alto",
  laudo_necroscopico: "alto", laudo_toxicologico: "alto", laudo_balistico: "alto",
  laudo_medico_legal: "alto", laudo_psiquiatrico: "alto", pericia_digital: "alto",
  ata_audiencia: "alto", interrogatorio: "alto", alegacoes_mp: "alto",
  alegacoes_defesa: "alto", resposta_acusacao: "alto", recurso: "alto",
  habeas_corpus: "alto", midia_mensagens: "alto", midia_imagem_video: "alto",
  boletim_ocorrencia: "medio", portaria_ip: "medio", relatorio_policial: "medio",
  auto_prisao: "medio", termo_inquerito: "medio", certidao_relevante: "medio",
  diligencias_422: "medio", alegacoes: "medio", auto_apreensao: "medio",
  mandado: "medio", reconhecimento_formal: "medio", acareacao: "medio",
  registro_telefonico: "medio",
  documento_identidade: "baixo", alvara_soltura: "baixo", guia_execucao: "baixo",
  outros: "baixo", certidao: "baixo",
  burocracia: "oculto",
};

const TIPO_LABELS: Record<string, string> = {
  denuncia: "Denúncia", sentenca: "Sentença", pronuncia: "Pronúncia",
  decisao: "Decisão", depoimento_vitima: "Depoimento Vítima",
  depoimento_testemunha: "Depoimento Testemunha",
  depoimento_investigado: "Depoimento Investigado",
  interrogatorio: "Interrogatório", ata_audiencia: "Ata de Audiência",
  laudo_pericial: "Laudo Pericial", laudo_necroscopico: "Laudo Necroscópico",
  laudo_toxicologico: "Laudo Toxicológico", laudo_balistico: "Laudo Balístico",
  laudo_medico_legal: "Laudo Médico Legal", laudo_psiquiatrico: "Laudo Psiquiátrico",
  pericia_digital: "Perícia Digital", alegacoes_mp: "Alegações MP",
  alegacoes_defesa: "Alegações Defesa", resposta_acusacao: "Resposta à Acusação",
  recurso: "Recurso", habeas_corpus: "Habeas Corpus",
  boletim_ocorrencia: "Boletim de Ocorrência", relatorio_policial: "Relatório Policial",
  auto_prisao: "Auto de Prisão", portaria_ip: "Portaria IP",
  termo_inquerito: "Termo de Inquérito", certidao_relevante: "Certidão Relevante",
  midia_mensagens: "Mensagens", midia_imagem_video: "Mídia",
  registro_telefonico: "Registro Telefônico", diligencias_422: "Diligências 422",
  mandado: "Mandado", reconhecimento_formal: "Reconhecimento",
  acareacao: "Acareação", auto_apreensao: "Auto de Apreensão",
  documento_identidade: "Documento de Identidade",
  alvara_soltura: "Alvará de Soltura", guia_execucao: "Guia de Execução",
  certidao: "Certidão", outros: "Outros", burocracia: "Burocracia",
  alegacoes: "Alegações", inquerito: "Inquérito",
};

export type SectionData = {
  id: number;
  tipo: string;
  titulo: string;
  paginaInicio: number;
  paginaFim: number;
  resumo: string | null;
  confianca: number | null;
  reviewStatus: string | null;
  metadata: any;
  fileName: string;
  fileWebViewLink: string | null;
};

interface SectionCardProps {
  section: SectionData;
  onClick: () => void;
}

export function SectionCard({ section, onClick }: SectionCardProps) {
  const tier = TIPO_TO_TIER[section.tipo] || "baixo";
  const tierConfig = TIER_CONFIG[tier];
  const tipoLabel = TIPO_LABELS[section.tipo] || section.tipo;
  const pageRange = section.paginaInicio === section.paginaFim
    ? `p. ${section.paginaInicio}`
    : `pp. ${section.paginaInicio}-${section.paginaFim}`;

  const pessoas = (section.metadata as any)?.pessoas as Array<{ nome: string; papel: string }> | undefined;
  const fase = (section.metadata as any)?.fase as string | undefined;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50 transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className={`text-[10px] shrink-0 ${tierConfig.color}`}>
            {tipoLabel}
          </Badge>
          {fase && (
            <Badge variant="outline" className="text-[10px] shrink-0 bg-violet-50 text-violet-600 border-violet-200">
              {fase === "inquerito" ? "Inquérito" : fase === "instrucao" ? "Instrução" : "Plenário"}
            </Badge>
          )}
        </div>
        <span className="text-[10px] text-zinc-400 font-mono shrink-0">{pageRange}</span>
      </div>

      <p className="text-sm font-medium text-zinc-800 mt-1.5 line-clamp-1">{section.titulo}</p>

      {section.resumo && (
        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{section.resumo}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5">
          {pessoas && pessoas.length > 0 && (
            <span className="text-[10px] text-zinc-400">
              {pessoas.map(p => p.nome).join(", ")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {section.confianca !== null && (
            <span className={`text-[10px] font-mono ${
              section.confianca >= 90 ? "text-emerald-600" :
              section.confianca >= 70 ? "text-amber-600" : "text-red-500"
            }`}>
              {section.confianca}%
            </span>
          )}
          <FileText className="w-3 h-3 text-zinc-300" />
        </div>
      </div>
    </button>
  );
}

export { TIPO_TO_TIER, TIPO_LABELS, TIER_CONFIG };
```

- [ ] **Step 2: Build and verify**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npm run build 2>&1 | tail -10`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/drive/SectionCard.tsx
git commit -m "feat: add SectionCard component for document section display"
```

---

## Task 3: SectionDetailSheet Component

**Files:**
- Create: `src/components/drive/SectionDetailSheet.tsx`

A right-side Sheet (matching existing FileDetailSheet pattern) that shows full section detail: extracted text, metadata (pessoas, cronologia, teses defensivas), and a link to open the PDF at the specific page.

- [ ] **Step 1: Create SectionDetailSheet.tsx**

```tsx
"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, FileText, User, Calendar, Shield, AlertTriangle } from "lucide-react";
import { TIPO_LABELS, TIPO_TO_TIER, TIER_CONFIG } from "./SectionCard";

interface SectionDetailSheetProps {
  section: {
    id: number;
    tipo: string;
    titulo: string;
    paginaInicio: number;
    paginaFim: number;
    resumo: string | null;
    textoExtraido: string | null;
    confianca: number | null;
    reviewStatus: string | null;
    fichaData: any;
    metadata: any;
    fileName: string;
    fileWebViewLink: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SectionDetailSheet({ section, open, onOpenChange }: SectionDetailSheetProps) {
  if (!section) return null;

  const tier = TIPO_TO_TIER[section.tipo] || "baixo";
  const tierConfig = TIER_CONFIG[tier];
  const tipoLabel = TIPO_LABELS[section.tipo] || section.tipo;
  const meta = section.metadata as any;
  const pessoas = meta?.pessoas as Array<{ nome: string; papel: string; descricao?: string }> | undefined;
  const cronologia = meta?.cronologia as Array<{ data: string; descricao: string }> | undefined;
  const teses = meta?.tesesDefensivas as Array<{ tipo: string; descricao: string; confianca: number }> | undefined;
  const contradicoes = meta?.contradicoes as string[] | undefined;
  const pontosCriticos = meta?.pontosCriticos as string[] | undefined;
  const fase = meta?.fase as string | undefined;

  const pageRange = section.paginaInicio === section.paginaFim
    ? `Página ${section.paginaInicio}`
    : `Páginas ${section.paginaInicio}-${section.paginaFim}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0">
        <div className="p-4 border-b border-zinc-200 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={tierConfig.color}>{tipoLabel}</Badge>
            {fase && (
              <Badge variant="outline" className="bg-violet-50 text-violet-600 border-violet-200">
                {fase === "inquerito" ? "Inquérito" : fase === "instrucao" ? "Instrução" : "Plenário"}
              </Badge>
            )}
            {section.confianca !== null && (
              <Badge variant="outline" className={
                section.confianca >= 90 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                section.confianca >= 70 ? "bg-amber-50 text-amber-700 border-amber-200" :
                "bg-red-50 text-red-700 border-red-200"
              }>
                {section.confianca}% confiança
              </Badge>
            )}
          </div>
          <SheetTitle className="text-base">{section.titulo}</SheetTitle>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <FileText className="w-3.5 h-3.5" />
            <span className="truncate">{section.fileName}</span>
            <span className="font-mono">{pageRange}</span>
          </div>
          {section.fileWebViewLink && (
            <Button variant="outline" size="sm" asChild className="mt-1">
              <a href={section.fileWebViewLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Abrir PDF
              </a>
            </Button>
          )}
        </div>

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="p-4 space-y-4">
            {/* Resumo */}
            {section.resumo && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Resumo</h4>
                <p className="text-sm text-zinc-700">{section.resumo}</p>
              </div>
            )}

            {/* Pessoas */}
            {pessoas && pessoas.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <User className="w-3 h-3" /> Pessoas ({pessoas.length})
                </h4>
                <div className="space-y-1.5">
                  {pessoas.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-[10px]">{p.papel}</Badge>
                      <span className="font-medium text-zinc-800">{p.nome}</span>
                      {p.descricao && <span className="text-zinc-500 text-xs">— {p.descricao}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cronologia */}
            {cronologia && cronologia.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Cronologia ({cronologia.length})
                </h4>
                <div className="space-y-1.5 border-l-2 border-zinc-200 pl-3">
                  {cronologia.map((c, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-mono text-xs text-zinc-400">{c.data}</span>
                      <p className="text-zinc-700">{c.descricao}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teses Defensivas */}
            {teses && teses.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Teses Defensivas ({teses.length})
                </h4>
                <div className="space-y-2">
                  {teses.map((t, i) => (
                    <div key={i} className="p-2 rounded bg-emerald-50/50 border border-emerald-100">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">{t.tipo}</Badge>
                        <span className="text-[10px] font-mono text-emerald-600">{t.confianca}%</span>
                      </div>
                      <p className="text-sm text-zinc-700 mt-1">{t.descricao}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contradições */}
            {contradicoes && contradicoes.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Contradições ({contradicoes.length})
                </h4>
                <div className="space-y-1">
                  {contradicoes.map((c, i) => (
                    <p key={i} className="text-sm text-amber-700 bg-amber-50/50 p-2 rounded border border-amber-100">{c}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Pontos Críticos */}
            {pontosCriticos && pontosCriticos.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Pontos Críticos</h4>
                <ul className="space-y-1 list-disc list-inside">
                  {pontosCriticos.map((p, i) => (
                    <li key={i} className="text-sm text-zinc-700">{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Texto Extraído */}
            {section.textoExtraido && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Texto Extraído</h4>
                <div className="text-xs text-zinc-600 whitespace-pre-wrap bg-zinc-50 p-3 rounded border border-zinc-200 max-h-96 overflow-y-auto font-mono leading-relaxed">
                  {section.textoExtraido}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Build and verify**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npm run build 2>&1 | tail -10`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/drive/SectionDetailSheet.tsx
git commit -m "feat: add SectionDetailSheet for detailed section inspection"
```

---

## Task 4: SectionsViewer Component

**Files:**
- Create: `src/components/drive/SectionsViewer.tsx`

The main component that shows all sections for an assistido, with:
- Filter pills by relevance tier (Crítico, Alto, Médio, Baixo)
- Filter by tipo
- Toggle to group by depoente (for testimony sections)
- Section count summary
- Uses SectionCard for each item

- [ ] **Step 1: Create SectionsViewer.tsx**

```tsx
"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, List, Filter } from "lucide-react";
import { SectionCard, SectionData, TIPO_TO_TIER, TIPO_LABELS, TIER_CONFIG } from "./SectionCard";
import { SectionDetailSheet } from "./SectionDetailSheet";

interface SectionsViewerProps {
  assistidoId: number;
  processoId?: number;
}

const TIER_ORDER = ["critico", "alto", "medio", "baixo"];

// Group semantic labels for depoente grouping
const DEPOIMENTO_TIPOS = [
  "depoimento_vitima", "depoimento_testemunha", "depoimento_investigado",
  "interrogatorio", "ata_audiencia", "acareacao",
];

export function SectionsViewer({ assistidoId, processoId }: SectionsViewerProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null);
  const [groupByDepoente, setGroupByDepoente] = useState(false);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: sections, isLoading } = processoId
    ? trpc.drive.sectionsByProcesso.useQuery({ processoId })
    : trpc.drive.sectionsByAssistido.useQuery({ assistidoId });

  // Filter out burocracia by default
  const filtered = useMemo(() => {
    if (!sections) return [];
    return sections.filter(s => {
      const tier = TIPO_TO_TIER[s.tipo] || "baixo";
      if (tier === "oculto") return false; // hide burocracia
      if (selectedTier && tier !== selectedTier) return false;
      if (selectedTipo && s.tipo !== selectedTipo) return false;
      return true;
    });
  }, [sections, selectedTier, selectedTipo]);

  // Tier counts for pills
  const tierCounts = useMemo(() => {
    if (!sections) return {};
    const counts: Record<string, number> = {};
    for (const s of sections) {
      const tier = TIPO_TO_TIER[s.tipo] || "baixo";
      if (tier === "oculto") continue;
      counts[tier] = (counts[tier] || 0) + 1;
    }
    return counts;
  }, [sections]);

  // Tipo counts for sub-filter
  const tipoCounts = useMemo(() => {
    if (!filtered) return {};
    const counts: Record<string, number> = {};
    for (const s of filtered) {
      counts[s.tipo] = (counts[s.tipo] || 0) + 1;
    }
    return counts;
  }, [filtered]);

  // Grouped by depoente
  const groupedByDepoente = useMemo(() => {
    if (!groupByDepoente || !filtered) return null;
    const depoimentos = filtered.filter(s => DEPOIMENTO_TIPOS.includes(s.tipo));
    const outros = filtered.filter(s => !DEPOIMENTO_TIPOS.includes(s.tipo));

    const groups: Record<string, typeof filtered> = {};
    for (const s of depoimentos) {
      const pessoas = (s.metadata as any)?.pessoas as Array<{ nome: string; papel: string }> | undefined;
      const key = pessoas?.[0]?.nome || "Não identificado";
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }

    return { groups, outros };
  }, [filtered, groupByDepoente]);

  const handleOpenSection = (section: any) => {
    setSelectedSection(section);
    setSheetOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!sections || sections.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-400">
        <List className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhuma seção classificada</p>
        <p className="text-xs mt-1">Use "Smart Extract" em um PDF para classificar as peças</p>
      </div>
    );
  }

  const totalRelevant = Object.values(tierCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-3">
      {/* Header with counts */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-700">
            {totalRelevant} peças classificadas
          </span>
        </div>
        <Button
          variant={groupByDepoente ? "default" : "outline"}
          size="sm"
          onClick={() => setGroupByDepoente(!groupByDepoente)}
          className="text-xs h-7"
        >
          <Users className="w-3 h-3 mr-1" />
          Por depoente
        </Button>
      </div>

      {/* Tier filter pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => { setSelectedTier(null); setSelectedTipo(null); }}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            !selectedTier ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          Todas ({totalRelevant})
        </button>
        {TIER_ORDER.map(tier => {
          const count = tierCounts[tier] || 0;
          if (count === 0) return null;
          const config = TIER_CONFIG[tier];
          return (
            <button
              key={tier}
              onClick={() => { setSelectedTier(selectedTier === tier ? null : tier); setSelectedTipo(null); }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedTier === tier ? "ring-2 ring-zinc-400 " + config.color : config.color + " opacity-80 hover:opacity-100"
              }`}
            >
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Tipo sub-filter (when a tier is selected) */}
      {selectedTier && Object.keys(tipoCounts).length > 1 && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(tipoCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([tipo, count]) => (
              <button
                key={tipo}
                onClick={() => setSelectedTipo(selectedTipo === tipo ? null : tipo)}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  selectedTipo === tipo
                    ? "bg-zinc-700 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {TIPO_LABELS[tipo] || tipo} ({count})
              </button>
            ))}
        </div>
      )}

      {/* Section list */}
      {groupByDepoente && groupedByDepoente ? (
        <div className="space-y-4">
          {Object.entries(groupedByDepoente.groups)
            .sort(([, a], [, b]) => b.length - a.length)
            .map(([nome, secs]) => (
              <div key={nome}>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="w-3 h-3" />
                  {nome} ({secs.length})
                </h4>
                <div className="space-y-1.5 ml-1">
                  {secs.map(s => (
                    <SectionCard key={s.id} section={s} onClick={() => handleOpenSection(s)} />
                  ))}
                </div>
              </div>
            ))}
          {groupedByDepoente.outros.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Outras peças ({groupedByDepoente.outros.length})
              </h4>
              <div className="space-y-1.5 ml-1">
                {groupedByDepoente.outros.map(s => (
                  <SectionCard key={s.id} section={s} onClick={() => handleOpenSection(s)} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(s => (
            <SectionCard key={s.id} section={s} onClick={() => handleOpenSection(s)} />
          ))}
        </div>
      )}

      {/* Detail sheet */}
      <SectionDetailSheet
        section={selectedSection}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
```

- [ ] **Step 2: Build and verify**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npm run build 2>&1 | tail -10`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/drive/SectionsViewer.tsx
git commit -m "feat: add SectionsViewer with tier filters and depoente grouping"
```

---

## Task 5: Integrate into DriveTabEnhanced

**Files:**
- Modify: `src/components/drive/DriveTabEnhanced.tsx`

Add "Peças" as a new view mode in the existing `VIEW_MODES` array and render `SectionsViewer` when that mode is active.

- [ ] **Step 1: Add import**

At the top of `DriveTabEnhanced.tsx`, add the import:

```typescript
import { SectionsViewer } from "./SectionsViewer";
```

Also add `BookOpen` to the Lucide icons import.

- [ ] **Step 2: Add "Peças" to VIEW_MODES**

Find the `VIEW_MODES` array (around line 108-112) and add the new entry:

```typescript
const VIEW_MODES: { key: ViewMode; label: string; icon: React.ElementType }[] = [
  { key: "tree", label: "Arvore", icon: FolderTree },
  { key: "timeline", label: "Timeline", icon: Clock },
  { key: "status", label: "Status", icon: BarChart3 },
  { key: "pecas", label: "Peças", icon: BookOpen },
];
```

Also update the `ViewMode` type to include `"pecas"`:

```typescript
type ViewMode = "tree" | "timeline" | "status" | "processo" | "pecas";
```

- [ ] **Step 3: Render SectionsViewer in the view switch**

Find where views are rendered conditionally (around lines 805-821) and add the "pecas" case:

```tsx
{viewMode === "pecas" && (
  <SectionsViewer
    assistidoId={assistidoId!}
    processoId={processoId}
  />
)}
```

- [ ] **Step 4: Build and verify**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npm run build 2>&1 | tail -10`
Expected: No errors.

- [ ] **Step 5: Test in browser**

Run: `npm run dev`
Navigate to an assistido that has classified sections (check DB for one with sections).
Click on "Drive" tab, then click the "Peças" view mode button.
Expected: See section cards grouped by type, filter pills working, clicking a card opens the detail sheet.

- [ ] **Step 6: Commit**

```bash
git add src/components/drive/DriveTabEnhanced.tsx
git commit -m "feat: integrate SectionsViewer as 'Peças' view in DriveTabEnhanced"
```

---

## Execution Order & Dependencies

```
Task 1 (tRPC queries) ──→ Task 4 (SectionsViewer) ──→ Task 5 (integration)
Task 2 (SectionCard)  ──→ Task 4
Task 3 (DetailSheet)  ──→ Task 4
```

**Parallelizable:** Tasks 1, 2, 3 are independent. Task 4 depends on 1+2+3. Task 5 depends on 4.
