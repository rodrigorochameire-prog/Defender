# Aba "Processo" — Visão Jurídica do Caso

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar nova aba "Processo" na página do assistido que apresenta uma visão **jurídica** (não de sistema de arquivos) do caso: autos completos (referência + conexos) organizados junto com as peças fatiadas (denúncia, depoimentos agrupados por pessoa, laudos, pronúncia, alegações), permitindo clicar numa peça e ver o PDF fatiado com preview inline.

**Architecture:** Nova aba "processo" adicionada ao enum `Tab` da página do assistido. Componente `ProcessoTab` com layout 2 colunas: (1) seletor de autos no topo + índice semântico de peças à esquerda; (2) preview da peça selecionada à direita com ações (aprovar, rejeitar, fatiar PDF). Reusa `sectionsByProcesso` tRPC, `SectionDetailSheet`, `PdfViewerModal` já existentes. Adiciona um único novo tRPC query (`processo.getGroupedSections`) que agrupa seções semanticamente server-side.

**Tech Stack:** Next.js 15 App Router, tRPC, Drizzle ORM, shadcn/ui (ScrollArea, Badge, Button, Separator), Lucide icons, design tokens existentes (`HEADER_STYLE`, `TYPO`, `GLASS`, `TIER_CONFIG`, `TIPO_LABELS`).

**Data available:**
- 252 seções já classificadas em 5 assistidos (Gabriel Gomes: 108, Adailton: 72, Adenilson: 47)
- Assistido tem `data.processos` com `isReferencia`, `casoId`, `tipoProcesso`, `numeroAutos`
- Cada seção tem `metadata.pessoas[]`, `metadata.fase`, `reviewStatus`, `fichaData`

---

## Scope

**In scope:**
- Nova aba `processo` entre "Audiências" e "Drive"
- Seletor de processos (referência / conexos / IP) quando o assistido tem múltiplos
- Índice de peças agrupadas semanticamente: Acusação, Decisões, Depoimentos (por pessoa, sub-split fase), Laudos, Defesa, Investigação
- Preview inline do PDF da peça selecionada (range de páginas exato)
- Ações: aprovar/rejeitar classificação, fatiar em PDF separado no Drive
- Empty state: CTA para classificar se não há seções
- Botão "Fatiar todas aprovadas" para batch extraction

**Out of scope (features futuras):**
- Comparação lado a lado de depoimentos (delegacia × juízo)
- Export consolidado (todas peças num ZIP)
- Anotações/highlights no PDF
- Reordenação manual das peças
- Edição de classificação (só aprovar/rejeitar)

---

## File Structure

```
src/
├── lib/trpc/routers/
│   └── processo.ts                                    # CREATE: novo router com getGroupedSections
├── components/processo/                               # CREATE: diretório novo
│   ├── ProcessoTab.tsx                                # CREATE: componente principal container
│   ├── ProcessoSelector.tsx                           # CREATE: pills para escolher entre processos
│   ├── PecasIndex.tsx                                 # CREATE: índice esquerdo agrupado
│   ├── PecaGroup.tsx                                  # CREATE: grupo de peças (Acusação, etc)
│   ├── PecaItem.tsx                                   # CREATE: item individual da peça
│   └── PecaPreview.tsx                                # CREATE: coluna direita com preview
└── app/(dashboard)/admin/assistidos/[id]/
    └── page.tsx                                       # MODIFY: adicionar tab "processo"
```

**Design decisions:**
- **Novo diretório** `src/components/processo/` (não em `drive/`) porque é visão jurídica, não filesystem
- **Um componente por responsabilidade** para não criar um monster file
- **Novo router tRPC** (`processo.ts`) — mantém separação clara de domínios

---

## Task 1: Novo router tRPC com getGroupedSections

**Files:**
- Create: `src/lib/trpc/routers/processo.ts`
- Modify: `src/lib/trpc/routers/index.ts` — registrar novo router

**Context:** Precisamos de uma query que agrupa seções de um processo em grupos semânticos (Acusação, Decisões, Depoimentos por pessoa com sub-fase, Laudos, Defesa, Investigação). Isso poderia ser feito no client, mas fazer server-side mantém consistência e facilita testes.

- [ ] **Step 1: Criar o router**

Create `src/lib/trpc/routers/processo.ts`:

```typescript
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@/lib/db";
import { driveDocumentSections, driveFiles } from "@/lib/db/schema";
import { processos } from "@/lib/db/schema/core";
import { eq, and } from "drizzle-orm";

// Semantic grouping: which section tipos belong to which group
const GROUP_MAPPING: Record<string, string[]> = {
  acusacao: ["denuncia", "alegacoes_mp"],
  decisoes: ["sentenca", "pronuncia", "decisao"],
  depoimentos: [
    "depoimento_vitima",
    "depoimento_testemunha",
    "depoimento_investigado",
    "interrogatorio",
    "ata_audiencia",
    "acareacao",
  ],
  laudos: [
    "laudo_pericial",
    "laudo_necroscopico",
    "laudo_toxicologico",
    "laudo_balistico",
    "laudo_medico_legal",
    "laudo_psiquiatrico",
    "pericia_digital",
  ],
  defesa: ["resposta_acusacao", "alegacoes_defesa", "recurso", "habeas_corpus"],
  investigacao: [
    "boletim_ocorrencia",
    "portaria_ip",
    "relatorio_policial",
    "auto_prisao",
    "termo_inquerito",
    "auto_apreensao",
    "mandado",
    "reconhecimento_formal",
    "diligencias_422",
  ],
};

const GROUP_ORDER = ["acusacao", "decisoes", "depoimentos", "laudos", "defesa", "investigacao", "outros"];

function tipoToGroup(tipo: string): string {
  for (const [group, tipos] of Object.entries(GROUP_MAPPING)) {
    if (tipos.includes(tipo)) return group;
  }
  return "outros";
}

export const processoRouter = router({
  /**
   * Retorna todas as peças classificadas de um processo, agrupadas semanticamente.
   * Depoimentos são sub-agrupados por pessoa + fase (inquerito/instrucao/plenario).
   */
  getGroupedSections: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      const rows = await db
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
          fileDriveId: driveFiles.driveFileId,
          fileMimeType: driveFiles.mimeType,
        })
        .from(driveDocumentSections)
        .innerJoin(driveFiles, eq(driveDocumentSections.driveFileId, driveFiles.id))
        .where(eq(driveFiles.processoId, input.processoId))
        .orderBy(driveDocumentSections.paginaInicio);

      // Agrupa por grupo semântico
      const groups: Record<string, typeof rows> = {};
      for (const s of rows) {
        const g = tipoToGroup(s.tipo);
        if (!groups[g]) groups[g] = [];
        groups[g].push(s);
      }

      // Para "depoimentos", sub-agrupa por pessoa
      const depoimentos = groups.depoimentos || [];
      const depoimentosByPessoa: Record<string, typeof rows> = {};
      for (const d of depoimentos) {
        const pessoas = (d.metadata as any)?.pessoas as Array<{ nome: string }> | undefined;
        const nome = pessoas?.[0]?.nome || "Não identificado";
        if (!depoimentosByPessoa[nome]) depoimentosByPessoa[nome] = [];
        depoimentosByPessoa[nome].push(d);
      }

      // Ordena grupos
      const orderedGroups = GROUP_ORDER
        .filter((g) => g !== "depoimentos" && groups[g])
        .map((g) => ({ key: g, sections: groups[g] }));

      return {
        groups: orderedGroups,
        depoimentos: Object.entries(depoimentosByPessoa).map(([pessoa, sections]) => ({
          pessoa,
          sections,
        })),
        total: rows.length,
      };
    }),

  /**
   * Retorna info do processo (para header da aba).
   */
  getInfo: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      const [proc] = await db
        .select({
          id: processos.id,
          numeroAutos: processos.numeroAutos,
          vara: processos.vara,
          assunto: processos.assunto,
          fase: processos.fase,
          situacao: processos.situacao,
          tipoProcesso: processos.tipoProcesso,
          isReferencia: processos.isReferencia,
          casoId: processos.casoId,
          driveFolderId: processos.driveFolderId,
          linkDrive: processos.linkDrive,
        })
        .from(processos)
        .where(eq(processos.id, input.processoId))
        .limit(1);

      return proc ?? null;
    }),
});
```

- [ ] **Step 2: Registrar no router raiz**

Modify `src/lib/trpc/routers/index.ts` — adicionar import e registro. Use grep para encontrar a seção:

```bash
grep -n "documentSections: documentSectionsRouter" src/lib/trpc/routers/index.ts
```

Depois adicionar logo após:
```typescript
import { processoRouter } from "./processo";
```
(no topo com outros imports)

E na seção de registro do router principal, adicionar:
```typescript
processo: processoRouter,
```

- [ ] **Step 3: Build check**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep "processo.ts\|routers/index.ts" | head -5`

Expected: nenhum erro.

- [ ] **Step 4: Commit**

```bash
git add src/lib/trpc/routers/processo.ts src/lib/trpc/routers/index.ts
git commit -m "feat(processo): add getGroupedSections and getInfo tRPC procedures"
```

---

## Task 2: PecaItem — item individual clicável na lista de peças

**Files:**
- Create: `src/components/processo/PecaItem.tsx`

**Context:** Componente para um item individual na lista de peças. Mostra: cor de tier (dot), título da peça, range de páginas, badge pequeno se tem status especial (pending/rejected). Click invoca callback.

- [ ] **Step 1: Criar o componente**

```tsx
"use client";

import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const TIER_DOT: Record<string, string> = {
  critico: "bg-red-500",
  alto: "bg-orange-500",
  medio: "bg-blue-500",
  baixo: "bg-zinc-400",
};

const TIPO_TO_TIER_LOCAL: Record<string, string> = {
  denuncia: "critico", sentenca: "critico", depoimento_vitima: "critico",
  depoimento_testemunha: "critico", depoimento_investigado: "critico",
  decisao: "alto", pronuncia: "alto", laudo_pericial: "alto",
  laudo_necroscopico: "alto", laudo_toxicologico: "alto", laudo_balistico: "alto",
  laudo_medico_legal: "alto", laudo_psiquiatrico: "alto", pericia_digital: "alto",
  ata_audiencia: "alto", interrogatorio: "alto", alegacoes_mp: "alto",
  alegacoes_defesa: "alto", resposta_acusacao: "alto", recurso: "alto",
  habeas_corpus: "alto",
};

export interface PecaItemData {
  id: number;
  tipo: string;
  titulo: string;
  paginaInicio: number;
  paginaFim: number;
  confianca: number | null;
  reviewStatus: string | null;
}

interface PecaItemProps {
  peca: PecaItemData;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
}

export function PecaItem({ peca, active, onClick, compact }: PecaItemProps) {
  const tier = TIPO_TO_TIER_LOCAL[peca.tipo] || "baixo";
  const pageRange = peca.paginaInicio === peca.paginaFim
    ? `p. ${peca.paginaInicio}`
    : `pp. ${peca.paginaInicio}-${peca.paginaFim}`;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors",
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", active ? "bg-white" : TIER_DOT[tier])} />
      <span className={cn("text-sm truncate flex-1", compact && "text-xs")}>
        {peca.titulo}
      </span>
      {peca.reviewStatus === "approved" && (
        <CheckCircle2 className={cn("w-3 h-3 shrink-0", active ? "text-emerald-200" : "text-emerald-500")} />
      )}
      {peca.reviewStatus === "rejected" && (
        <XCircle className={cn("w-3 h-3 shrink-0", active ? "text-red-200" : "text-red-400")} />
      )}
      <span className={cn(
        "text-[10px] font-mono shrink-0 ml-auto",
        active ? "text-white/50" : "text-zinc-400",
      )}>
        {pageRange}
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Build check**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep "PecaItem" | head -3`

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/processo/PecaItem.tsx
git commit -m "feat(processo): add PecaItem component"
```

---

## Task 3: PecaGroup — grupo semântico de peças

**Files:**
- Create: `src/components/processo/PecaGroup.tsx`

**Context:** Agrupa peças por categoria (Acusação, Decisões, etc.) com label uppercase e lista de PecaItem. Também suporta sub-agrupamento para depoimentos (por pessoa).

- [ ] **Step 1: Criar o componente**

```tsx
"use client";

import { PecaItem, type PecaItemData } from "./PecaItem";

const GROUP_LABELS: Record<string, string> = {
  acusacao: "Acusação",
  decisoes: "Decisões Judiciais",
  laudos: "Laudos Periciais",
  defesa: "Defesa",
  investigacao: "Investigação",
  outros: "Outros",
};

interface PecaGroupProps {
  groupKey: string;
  sections: PecaItemData[];
  activeId: number | null;
  onSelect: (id: number) => void;
}

export function PecaGroup({ groupKey, sections, activeId, onSelect }: PecaGroupProps) {
  if (sections.length === 0) return null;
  const label = GROUP_LABELS[groupKey] || groupKey;

  return (
    <div className="mb-3">
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-3 mb-1">
        {label}
      </h4>
      <div className="space-y-0.5">
        {sections.map((s) => (
          <PecaItem
            key={s.id}
            peca={s}
            active={activeId === s.id}
            onClick={() => onSelect(s.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface DepoimentoGroupProps {
  depoimentos: { pessoa: string; sections: PecaItemData[] }[];
  activeId: number | null;
  onSelect: (id: number) => void;
}

const FASE_LABELS: Record<string, string> = {
  inquerito: "Delegacia",
  instrucao: "Juízo",
  plenario: "Plenário",
};

export function DepoimentoGroup({ depoimentos, activeId, onSelect }: DepoimentoGroupProps) {
  if (depoimentos.length === 0) return null;

  return (
    <div className="mb-3">
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-3 mb-1">
        Depoimentos
      </h4>
      <div className="space-y-2">
        {depoimentos.map((dp) => (
          <div key={dp.pessoa}>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 px-3 py-1 uppercase tracking-wide">
              {dp.pessoa}
            </div>
            <div className="space-y-0.5">
              {dp.sections.map((s) => {
                const fase = (s as any).metadata?.fase as string | undefined;
                const displayTitulo = fase
                  ? `${FASE_LABELS[fase] || fase}${s.titulo ? ` — ${s.titulo}` : ""}`
                  : s.titulo;
                return (
                  <PecaItem
                    key={s.id}
                    peca={{ ...s, titulo: displayTitulo }}
                    active={activeId === s.id}
                    onClick={() => onSelect(s.id)}
                    compact
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep "PecaGroup" | head -3`

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/processo/PecaGroup.tsx
git commit -m "feat(processo): add PecaGroup and DepoimentoGroup components"
```

---

## Task 4: PecasIndex — coluna esquerda completa

**Files:**
- Create: `src/components/processo/PecasIndex.tsx`

**Context:** Container da coluna esquerda: título "Peças" com contador, barra de busca, e lista de `PecaGroup` + `DepoimentoGroup`. Recebe os dados de `processo.getGroupedSections` via props.

- [ ] **Step 1: Criar o componente**

```tsx
"use client";

import { useState, useMemo } from "react";
import { Search, List } from "lucide-react";
import { PecaGroup, DepoimentoGroup } from "./PecaGroup";
import type { PecaItemData } from "./PecaItem";

interface PecasIndexProps {
  groups: { key: string; sections: PecaItemData[] }[];
  depoimentos: { pessoa: string; sections: PecaItemData[] }[];
  activeId: number | null;
  onSelect: (id: number) => void;
  total: number;
}

export function PecasIndex({ groups, depoimentos, activeId, onSelect, total }: PecasIndexProps) {
  const [search, setSearch] = useState("");

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        sections: g.sections.filter(
          (s) => s.titulo.toLowerCase().includes(q) || s.tipo.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.sections.length > 0);
  }, [groups, search]);

  const filteredDepoimentos = useMemo(() => {
    if (!search.trim()) return depoimentos;
    const q = search.toLowerCase();
    return depoimentos
      .map((dp) => ({
        ...dp,
        sections: dp.sections.filter(
          (s) => s.titulo.toLowerCase().includes(q) || dp.pessoa.toLowerCase().includes(q),
        ),
      }))
      .filter((dp) => dp.sections.length > 0);
  }, [depoimentos, search]);

  const visibleCount =
    filteredGroups.reduce((acc, g) => acc + g.sections.length, 0) +
    filteredDepoimentos.reduce((acc, dp) => acc + dp.sections.length, 0);

  if (total === 0) {
    return (
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50/40 dark:bg-zinc-900/40 p-8 text-center">
        <List className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
        <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">Nenhuma peça classificada</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
          Use o botão "Classificar" no PDF dos autos para extrair as peças
        </p>
      </div>
    );
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
          Peças
        </span>
        <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
          {visibleCount}
          {search && total !== visibleCount ? ` / ${total}` : ""}
        </span>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar peças..."
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
          />
        </div>
      </div>

      {/* Lista com scroll */}
      <div className="flex-1 overflow-y-auto py-2">
        {filteredGroups
          .filter((g) => ["acusacao", "decisoes"].includes(g.key))
          .map((g) => (
            <PecaGroup
              key={g.key}
              groupKey={g.key}
              sections={g.sections}
              activeId={activeId}
              onSelect={onSelect}
            />
          ))}

        <DepoimentoGroup
          depoimentos={filteredDepoimentos}
          activeId={activeId}
          onSelect={onSelect}
        />

        {filteredGroups
          .filter((g) => !["acusacao", "decisoes"].includes(g.key))
          .map((g) => (
            <PecaGroup
              key={g.key}
              groupKey={g.key}
              sections={g.sections}
              activeId={activeId}
              onSelect={onSelect}
            />
          ))}

        {visibleCount === 0 && search && (
          <div className="px-3 py-6 text-center text-xs text-zinc-500">
            Nenhuma peça encontrada para "{search}"
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep "PecasIndex" | head -3`

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/processo/PecasIndex.tsx
git commit -m "feat(processo): add PecasIndex with search and semantic grouping"
```

---

## Task 5: PecaPreview — coluna direita com preview da peça

**Files:**
- Create: `src/components/processo/PecaPreview.tsx`

**Context:** Mostra detalhes da peça selecionada: tipo + tier badge + páginas + confiança no cabeçalho, badges de pessoas envolvidas, resumo IA, ações (aprovar, rejeitar, fatiar PDF, abrir no Drive, visualizar inline). Reusa `PdfViewerModal` para preview inline.

- [ ] **Step 1: Criar o componente**

```tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  CheckCircle,
  XCircle,
  Scissors,
  Eye,
  Loader2,
  FileText,
  User,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { TIPO_LABELS, TIPO_TO_TIER, TIER_CONFIG } from "@/components/drive/SectionCard";

const PdfViewerModal = dynamic(
  () => import("@/components/drive/PdfViewerModal").then((m) => m.PdfViewerModal),
  { ssr: false },
);

interface PecaPreviewProps {
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
    fileId: number;
    fileName: string;
    fileWebViewLink: string | null;
    fileDriveId: string | null;
  } | null;
  onUpdated?: () => void;
}

export function PecaPreview({ section, onUpdated }: PecaPreviewProps) {
  const [showPdf, setShowPdf] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractedLink, setExtractedLink] = useState<string | null>(null);

  const approveMutation = trpc.documentSections.approveSection.useMutation({
    onSuccess: () => onUpdated?.(),
  });
  const rejectMutation = trpc.documentSections.rejectSection.useMutation({
    onSuccess: () => onUpdated?.(),
  });
  const extractMutation = trpc.documentSections.extractSectionToPdf.useMutation({
    onSuccess: (data) => {
      setExtractError(null);
      setExtractedLink(data.webViewLink || null);
      onUpdated?.();
    },
    onError: (err) => setExtractError(err.message),
  });

  if (!section) {
    return (
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50/40 dark:bg-zinc-900/40 p-12 text-center flex-1 flex flex-col items-center justify-center">
        <FileText className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-3" />
        <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">Selecione uma peça</p>
        <p className="text-xs text-zinc-500 mt-1">Clique num item da lista à esquerda para ver detalhes</p>
      </div>
    );
  }

  const tier = TIPO_TO_TIER[section.tipo] || "baixo";
  const tierConfig = TIER_CONFIG[tier];
  const tipoLabel = TIPO_LABELS[section.tipo] || section.tipo;
  const meta = section.metadata as any;
  const pessoas = meta?.pessoas as Array<{ nome: string; papel: string; descricao?: string }> | undefined;
  const cronologia = meta?.cronologia as Array<{ data: string; descricao: string }> | undefined;
  const teses = meta?.tesesDefensivas as Array<{ tipo: string; descricao: string; confianca?: number }> | undefined;
  const contradicoes = meta?.contradicoes as string[] | undefined;
  const fase = meta?.fase as string | undefined;

  const pageRange = section.paginaInicio === section.paginaFim
    ? `Página ${section.paginaInicio}`
    : `Páginas ${section.paginaInicio}–${section.paginaFim}`;

  const pageCount = section.paginaFim - section.paginaInicio + 1;

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 overflow-hidden flex flex-col flex-1">
      {/* Header */}
      <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={tierConfig.color}>{tipoLabel}</Badge>
              {fase && (
                <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800/50">
                  {fase === "inquerito" ? "Delegacia" : fase === "instrucao" ? "Juízo" : "Plenário"}
                </Badge>
              )}
              {section.confianca !== null && (
                <Badge
                  variant="outline"
                  className={
                    section.confianca >= 90
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : section.confianca >= 70
                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300"
                      : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300"
                  }
                >
                  {section.confianca}% confiança
                </Badge>
              )}
              {section.reviewStatus === "approved" && (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Aprovada</Badge>
              )}
              {section.reviewStatus === "rejected" && (
                <Badge className="bg-red-100 text-red-800 border-red-200">Rejeitada</Badge>
              )}
            </div>

            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-2">
              {section.titulo}
            </h2>

            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
              <FileText className="w-3.5 h-3.5" />
              <span className="truncate">{section.fileName}</span>
              <span>•</span>
              <span className="font-mono">{pageRange}</span>
              <span>•</span>
              <span>{pageCount} {pageCount === 1 ? "página" : "páginas"}</span>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-2 mt-4">
          {section.fileId && section.fileName.endsWith(".pdf") && section.fileDriveId && (
            <Button
              size="sm"
              onClick={() => setShowPdf(true)}
              className="bg-violet-600 hover:bg-violet-700"
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              Visualizar
            </Button>
          )}

          <Button
            size="sm"
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => extractMutation.mutate({ sectionId: section.id })}
            disabled={extractMutation.isPending}
          >
            {extractMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Scissors className="w-3.5 h-3.5 mr-1.5" />
            )}
            Fatiar PDF
          </Button>

          {section.reviewStatus !== "approved" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => approveMutation.mutate({ id: section.id })}
              disabled={approveMutation.isPending}
              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            >
              {approveMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              )}
              Aprovar
            </Button>
          )}

          {section.reviewStatus !== "rejected" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => rejectMutation.mutate({ id: section.id })}
              disabled={rejectMutation.isPending}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {rejectMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
              )}
              Rejeitar
            </Button>
          )}

          {section.fileWebViewLink && (
            <Button size="sm" variant="outline" asChild>
              <a href={section.fileWebViewLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Drive
              </a>
            </Button>
          )}

          {extractedLink && (
            <Button size="sm" variant="outline" asChild className="text-emerald-700 border-emerald-200">
              <a href={extractedLink} target="_blank" rel="noopener noreferrer">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                Abrir fatiado
              </a>
            </Button>
          )}
        </div>

        {extractError && (
          <p className="text-xs text-red-600 bg-red-50 p-2 rounded-md mt-3 border border-red-200">
            Erro ao fatiar: {extractError}
          </p>
        )}
      </div>

      {/* Conteúdo com scroll */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Resumo */}
        {section.resumo && (
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              Resumo IA
            </h3>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {section.resumo}
            </p>
          </div>
        )}

        {/* Pessoas */}
        {pessoas && pessoas.length > 0 && (
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
              <User className="w-3 h-3" />
              Pessoas ({pessoas.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {pessoas.map((p, i) => (
                <Badge key={i} variant="outline" className="bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700">
                  <span className="text-zinc-500 text-[10px] uppercase tracking-wide mr-1">{p.papel}</span>
                  {p.nome}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Cronologia */}
        {cronologia && cronologia.length > 0 && (
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              Cronologia
            </h3>
            <div className="space-y-1.5 border-l-2 border-zinc-200 dark:border-zinc-700 pl-3">
              {cronologia.map((c, i) => (
                <div key={i} className="text-sm">
                  <span className="font-mono text-xs text-zinc-500">{c.data}</span>
                  <p className="text-zinc-700 dark:text-zinc-300">{c.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Teses Defensivas */}
        {teses && teses.length > 0 && (
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              Teses Defensivas ({teses.length})
            </h3>
            <div className="space-y-2">
              {teses.map((t, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-md bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">
                      {t.tipo}
                    </Badge>
                    {t.confianca !== undefined && (
                      <span className="text-[10px] font-mono text-emerald-600">{t.confianca}%</span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{t.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contradições */}
        {contradicoes && contradicoes.length > 0 && (
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" />
              Contradições
            </h3>
            <div className="space-y-1.5">
              {contradicoes.map((c, i) => (
                <p
                  key={i}
                  className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-md border border-amber-100 dark:border-amber-900/40"
                >
                  {c}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Texto Extraído */}
        {section.textoExtraido && (
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              Trecho Original
            </h3>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-md border border-zinc-200 dark:border-zinc-800 max-h-80 overflow-y-auto font-mono leading-relaxed">
              {section.textoExtraido}
            </div>
          </div>
        )}
      </div>

      {/* PDF Viewer modal */}
      {showPdf && section.fileId && section.fileDriveId && (
        <PdfViewerModal
          isOpen={showPdf}
          onClose={() => setShowPdf(false)}
          fileId={section.fileId}
          fileName={section.fileName}
          pdfUrl={`/api/drive/proxy?fileId=${section.fileDriveId}`}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build check**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep "PecaPreview" | head -3`

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/processo/PecaPreview.tsx
git commit -m "feat(processo): add PecaPreview with metadata, actions, and inline PDF viewer"
```

---

## Task 6: ProcessoSelector — seletor de processos (referência + conexos)

**Files:**
- Create: `src/components/processo/ProcessoSelector.tsx`

**Context:** Quando o assistido tem múltiplos processos, mostra pills no topo para alternar. Badge "Referência" para o principal. Número dos autos em fonte mono.

- [ ] **Step 1: Criar o componente**

```tsx
"use client";

import { cn } from "@/lib/utils";

interface ProcessoBasicData {
  id: number;
  numeroAutos: string | null;
  tipoProcesso: string | null;
  isReferencia: boolean | null;
}

interface ProcessoSelectorProps {
  processos: ProcessoBasicData[];
  selectedId: number;
  onSelect: (id: number) => void;
}

export function ProcessoSelector({ processos, selectedId, onSelect }: ProcessoSelectorProps) {
  if (processos.length <= 1) return null;

  // Ordena: referência primeiro, depois por tipo, depois por número
  const sorted = [...processos].sort((a, b) => {
    if (a.isReferencia && !b.isReferencia) return -1;
    if (!a.isReferencia && b.isReferencia) return 1;
    return (a.tipoProcesso ?? "").localeCompare(b.tipoProcesso ?? "");
  });

  return (
    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 flex-wrap">
      {sorted.map((p) => {
        const active = p.id === selectedId;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
              active
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200",
            )}
          >
            {p.isReferencia && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            )}
            <span>{p.tipoProcesso || "Processo"}</span>
            {p.numeroAutos && (
              <span
                className={cn(
                  "font-mono text-[10px]",
                  active ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-400 dark:text-zinc-500",
                )}
              >
                {p.numeroAutos}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Build check**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep "ProcessoSelector" | head -3`

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/processo/ProcessoSelector.tsx
git commit -m "feat(processo): add ProcessoSelector for multiple processos"
```

---

## Task 7: ProcessoTab — container principal

**Files:**
- Create: `src/components/processo/ProcessoTab.tsx`

**Context:** Container principal da aba. Gerencia state de qual processo está selecionado e qual peça está ativa. Invoca `processo.getGroupedSections` e passa os dados para `PecasIndex` e `PecaPreview`. Layout 2 colunas: 320px (index) + flex-1 (preview).

- [ ] **Step 1: Criar o componente**

```tsx
"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Scissors, Loader2 } from "lucide-react";
import { ProcessoSelector } from "./ProcessoSelector";
import { PecasIndex } from "./PecasIndex";
import { PecaPreview } from "./PecaPreview";

interface ProcessoBasicData {
  id: number;
  numeroAutos: string | null;
  tipoProcesso: string | null;
  isReferencia: boolean | null;
}

interface ProcessoTabProps {
  processos: ProcessoBasicData[];
}

export function ProcessoTab({ processos }: ProcessoTabProps) {
  // Processo inicial: referência se existir, senão primeiro
  const initialProcessoId = useMemo(() => {
    const ref = processos.find((p) => p.isReferencia);
    return ref?.id ?? processos[0]?.id ?? 0;
  }, [processos]);

  const [selectedProcessoId, setSelectedProcessoId] = useState<number>(initialProcessoId);
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.processo.getGroupedSections.useQuery(
    { processoId: selectedProcessoId },
    { enabled: selectedProcessoId > 0 },
  );

  const extractApprovedMutation = trpc.documentSections.extractApprovedToDrive.useMutation({
    onSuccess: () => {
      utils.processo.getGroupedSections.invalidate({ processoId: selectedProcessoId });
    },
  });

  // Encontra a seção ativa em todos os grupos
  const activeSection = useMemo(() => {
    if (!data || !activeSectionId) return null;
    for (const g of data.groups) {
      const found = g.sections.find((s) => s.id === activeSectionId);
      if (found) return found;
    }
    for (const dp of data.depoimentos) {
      const found = dp.sections.find((s) => s.id === activeSectionId);
      if (found) return found;
    }
    return null;
  }, [data, activeSectionId]);

  // Seleciona primeira peça quando carrega
  const firstSectionId = useMemo(() => {
    if (!data) return null;
    if (data.groups[0]?.sections[0]) return data.groups[0].sections[0].id;
    if (data.depoimentos[0]?.sections[0]) return data.depoimentos[0].sections[0].id;
    return null;
  }, [data]);

  // Se não há nenhuma seção ativa mas tem dados, seleciona a primeira
  if (data && !activeSectionId && firstSectionId) {
    setActiveSectionId(firstSectionId);
  }

  // Encontra o file principal (qualquer seção usa o mesmo fileId)
  const processoFileDriveId = useMemo(() => {
    if (!data) return null;
    for (const g of data.groups) {
      if (g.sections[0]) return (g.sections[0] as any).fileDriveId;
    }
    for (const dp of data.depoimentos) {
      if (dp.sections[0]) return (dp.sections[0] as any).fileDriveId;
    }
    return null;
  }, [data]);

  const approvedCount = useMemo(() => {
    if (!data) return 0;
    let n = 0;
    for (const g of data.groups) n += g.sections.filter((s) => s.reviewStatus === "approved").length;
    for (const dp of data.depoimentos) n += dp.sections.filter((s) => s.reviewStatus === "approved").length;
    return n;
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-[320px_1fr] gap-4 p-4">
        <Skeleton className="h-[500px]" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto text-center py-16">
          <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
            <Scissors className="w-6 h-6 text-zinc-400" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Nenhuma peça classificada
          </h3>
          <p className="text-sm text-zinc-500 mb-4">
            Para ver as peças organizadas (denúncia, depoimentos, laudos, etc.),
            classifique os autos usando o botão "Classificar" na aba Drive.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 h-full flex flex-col min-h-0">
      {/* Topo: seletor + ações em lote */}
      <div className="flex items-center gap-3 flex-wrap">
        <ProcessoSelector
          processos={processos}
          selectedId={selectedProcessoId}
          onSelect={(id) => {
            setSelectedProcessoId(id);
            setActiveSectionId(null);
          }}
        />
        <div className="flex-1" />
        {approvedCount > 0 && processoFileDriveId && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              // Usa o fileId da primeira seção (todas do mesmo processo apontam pro mesmo arquivo)
              const fileId = (data.groups[0]?.sections[0] as any)?.fileId || (data.depoimentos[0]?.sections[0] as any)?.fileId;
              if (fileId) extractApprovedMutation.mutate({ driveFileId: fileId });
            }}
            disabled={extractApprovedMutation.isPending}
            className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
          >
            {extractApprovedMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Scissors className="w-3.5 h-3.5 mr-1.5" />
            )}
            Fatiar {approvedCount} aprovada{approvedCount !== 1 ? "s" : ""}
          </Button>
        )}
      </div>

      {/* Grid 2 colunas */}
      <div className="grid grid-cols-[320px_1fr] gap-4 flex-1 min-h-0">
        <PecasIndex
          groups={data.groups as any}
          depoimentos={data.depoimentos as any}
          activeId={activeSectionId}
          onSelect={setActiveSectionId}
          total={data.total}
        />
        <PecaPreview
          section={activeSection as any}
          onUpdated={() => {
            utils.processo.getGroupedSections.invalidate({ processoId: selectedProcessoId });
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep "ProcessoTab" | head -3`

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/processo/ProcessoTab.tsx
git commit -m "feat(processo): add main ProcessoTab container"
```

---

## Task 8: Adicionar aba "Processo" na página do assistido

**Files:**
- Modify: `src/app/(dashboard)/admin/assistidos/[id]/page.tsx`

**Context:** Integrar a nova aba no fluxo existente da página do assistido.

- [ ] **Step 1: Adicionar ao enum Tab**

Find the Tab type declaration (around line 46) and modify:

```bash
grep -n "type Tab = " src/app/\(dashboard\)/admin/assistidos/\[id\]/page.tsx
```

Change `type Tab = ...` to add `"processo"`:

```typescript
type Tab = "demandas" | "drive" | "audiencias" | "atendimentos" | "midias" | "timeline" | "oficios" | "analise" | "investigacao" | "radar" | "processo";
```

- [ ] **Step 2: Adicionar o import**

No topo do arquivo, adicionar:

```typescript
import { ProcessoTab } from "@/components/processo/ProcessoTab";
import { Scale } from "lucide-react"; // Se ainda não importado — verifique antes com grep
```

Verify Scale import:
```bash
grep "Scale" src/app/\(dashboard\)/admin/assistidos/\[id\]/page.tsx | head -3
```

Se já importado, não duplicar.

- [ ] **Step 3: Adicionar ao tabs array**

Encontrar o tabs array (around linha 313-330). Adicionar entre "audiencias" e "atendimentos":

```typescript
{ key: "audiencias", label: "Audiências", icon: Calendar, count: data.audiencias.length },
{ key: "processo", label: "Processo", icon: Scale, count: undefined },
{ key: "atendimentos", label: "Atendimentos", icon: ContactRound },
```

- [ ] **Step 4: Adicionar renderização condicional**

Encontrar onde outros tabs são renderizados (`{tab === "drive" && ...}`), e adicionar:

```tsx
{tab === "processo" && (
  <div className="flex-1 min-h-0">
    <ProcessoTab
      processos={data.processos.map((p) => ({
        id: p.id,
        numeroAutos: p.numeroAutos,
        tipoProcesso: p.tipoProcesso,
        isReferencia: p.isReferencia,
      }))}
    />
  </div>
)}
```

- [ ] **Step 5: Build check**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && rm -rf .next && npm run build 2>&1 | tail -20`

Expected: Build succeeds.

- [ ] **Step 6: Manual test**

Run the dev server in the background: `npm run dev`

Navigate to `http://localhost:3000/admin/assistidos/250` (Gabriel Gomes - 108 seções).

Verify:
- Nova aba "Processo" aparece entre "Audiências" e "Atendimentos"
- Clicar na aba carrega o conteúdo
- Se há múltiplos processos, seletor aparece no topo
- Índice esquerdo mostra grupos (Acusação, Decisões, Depoimentos, etc.)
- Clicar em uma peça mostra preview à direita
- Botão "Visualizar" abre PDF modal
- Botão "Fatiar PDF" extrai e mostra link

- [ ] **Step 7: Commit**

```bash
git add "src/app/(dashboard)/admin/assistidos/[id]/page.tsx"
git commit -m "feat(processo): integrate ProcessoTab into assistido page"
```

---

## Task 9: Deploy e verificação

**Files:** nenhum

- [ ] **Step 1: Deploy para produção**

```bash
vercel deploy --prod
```

- [ ] **Step 2: Smoke test em produção**

Abrir em browser:
- https://ombuds.vercel.app/admin/assistidos/250 (Gabriel Gomes)
- Clicar "Processo"
- Verificar: seletor, índice, preview, ações

- [ ] **Step 3: Verificação final de saúde**

Run: 

```bash
node -e "
require('dotenv').config({path:'.env.local'});
const {Pool} = require('pg');
const p = new Pool({connectionString: process.env.DATABASE_URL});
(async () => {
  const r = await p.query(\"SELECT count(*) as t FROM drive_document_sections WHERE review_status = 'approved'\");
  console.log('Seções aprovadas:', r.rows[0].t);
  await p.end();
})();
"
```

Expected: número > 0 após usuário testar aprovação.

---

## Self-Review

**1. Spec coverage:**
- ✓ Task 1: tRPC com agrupamento semântico
- ✓ Task 2-7: Components
- ✓ Task 8: Integração
- ✓ Tarefa de deploy

**2. Placeholder scan:** sem TBD/TODO. Todo código completo.

**3. Type consistency:** `PecaItemData` consistente em PecaItem, PecaGroup, PecasIndex. Props `section` no PecaPreview bate com output do tRPC.

**4. Dependencies between tasks:**
```
Task 1 (tRPC) ← Task 7 (uses query)
Task 2 (PecaItem) ← Task 3 (uses PecaItem)
Task 3 (PecaGroup) ← Task 4 (PecasIndex uses PecaGroup)
Task 5 (PecaPreview) ← Task 7 (uses PecaPreview)
Task 6 (ProcessoSelector) ← Task 7 (uses selector)
Task 7 (ProcessoTab) ← Task 8 (integrates)
Task 8 ← Task 9 (deploy)
```

Tasks 1, 2, 5, 6 can be done in parallel (independent).
Task 3 depends on 2.
Task 4 depends on 3.
Task 7 depends on 1, 4, 5, 6.
Task 8 depends on 7.

---

## Execution Order Summary

```
[Parallelizable: 1, 2, 5, 6]
          ↓
[3 depends on 2]
          ↓
[4 depends on 3]
          ↓
[7 depends on 1, 4, 5, 6]
          ↓
[8 depends on 7]
          ↓
[9: deploy]
```
