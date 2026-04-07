# Padrão Defender v3 — Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refinar a página de assistido com Padrão Defender v3 (header suave, glass clean nas abas, análise em 8 blocos, Drive redesign) e atualizar tokens para expansão futura.

**Architecture:** Tokens centralizados em design-tokens.ts como source of truth. Componentes consomem tokens. Mudanças visuais nas abas internas são locais ao page.tsx do assistido. Análise usa accordion split em 8 blocos dedicados reutilizando o type AnalysisBlocksData existente. Drive é componente compartilhado — mudanças visuais sem alterar API.

**Tech Stack:** Next.js 15, React, Tailwind CSS, Lucide icons, shadcn/ui (Accordion, Collapsible, Sheet), tRPC, Drizzle ORM

**Spec:** `docs/superpowers/specs/2026-04-02-padrao-defender-v3-redesign.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/config/design-tokens.ts` | Modify | Add v3 tokens (HEADER_STYLE, GLASS, LIST_ITEM, TAB_STYLE_V3) |
| `src/app/(dashboard)/admin/assistidos/[id]/page.tsx` | Modify | Header gradient, tabs import, abas internas glass clean |
| `src/app/(dashboard)/admin/assistidos/[id]/_components/analise-blocks.tsx` | Rewrite | Split 5 blocos → 8 blocos dedicados, add new types |
| `src/app/(dashboard)/admin/assistidos/[id]/_components/analise-tab.tsx` | Modify | Import 8 blocos, update accordion rendering |
| `src/components/drive/DriveTabEnhanced.tsx` | Modify | Glass visual, filters, preview sheet |

---

## Task 1: Design Tokens v3

**Files:**
- Modify: `src/lib/config/design-tokens.ts`

- [ ] **Step 1: Add HEADER_STYLE token**

```typescript
// Add after CARD_STYLE (line ~77)

export const HEADER_STYLE = {
  container: "rounded-xl bg-gradient-to-br from-[#292930] to-[#202025] shadow-lg shadow-black/10 ring-1 ring-white/[0.04]",
  text: "text-white font-serif text-lg font-semibold tracking-tight",
  label: "text-white/30 text-[9px] uppercase tracking-wider",
  value: "text-white/80 font-mono tracking-wide",
  separator: "w-[1.5px] h-3.5 bg-white/15 rounded-full",
  bottomRow: "bg-white/[0.08] rounded-lg px-3.5 py-2.5",
  stat: "text-white/60 font-semibold",
  statLabel: "text-white/30",
} as const;
```

- [ ] **Step 2: Add GLASS token**

```typescript
export const GLASS = {
  card: "bg-zinc-100/60 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/[0.06] rounded-lg",
  hover: "hover:bg-zinc-100 dark:hover:bg-white/[0.07] transition-all duration-200",
  cardHover: "bg-zinc-100/60 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/[0.06] rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.07] transition-all duration-200 cursor-pointer",
} as const;
```

- [ ] **Step 3: Add LIST_ITEM token**

```typescript
export const LIST_ITEM = {
  container: "bg-zinc-100/60 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/[0.06] rounded-lg px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-white/[0.07] cursor-pointer transition-all",
  icon: "w-[13px] h-[13px] text-zinc-500 dark:text-zinc-400 shrink-0",
  title: "text-[11px] font-medium text-foreground/80",
  meta: "text-[9px] text-muted-foreground",
} as const;
```

- [ ] **Step 4: Add TAB_STYLE_V3 token**

```typescript
export const TAB_STYLE_V3 = {
  bar: "flex items-center gap-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1",
  item: "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-white/5",
  active: "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm",
  badge: "text-[9px] min-w-[18px] text-center px-1 py-px rounded-full font-medium",
  badgeActive: "bg-white/20 text-white/70 dark:bg-zinc-700 dark:text-zinc-300",
  badgeInactive: "bg-zinc-200/60 dark:bg-white/10 text-zinc-400 dark:text-zinc-500",
} as const;
```

- [ ] **Step 5: Add glass variant to CARD_STYLE**

```typescript
// Replace existing CARD_STYLE
export const CARD_STYLE = {
  base: "rounded-lg border border-border p-4",
  highlight: "rounded-lg border-l-4 p-4",
  glass: "bg-zinc-100/60 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/[0.06] rounded-lg p-3.5",
} as const;
```

- [ ] **Step 6: Verify build**

Run: `cd /Users/rodrigorochameire/projetos/Defender && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors in design-tokens.ts

- [ ] **Step 7: Commit**

```bash
git add src/lib/config/design-tokens.ts
git commit -m "feat: add Padrão Defender v3 design tokens (HEADER_STYLE, GLASS, LIST_ITEM, TAB_STYLE_V3)"
```

---

## Task 2: Header Refinado

**Files:**
- Modify: `src/app/(dashboard)/admin/assistidos/[id]/page.tsx:326-488`

- [ ] **Step 1: Update header gradient**

In the header container div (~line 326), change:
```tsx
// OLD
<div className="mx-4 lg:mx-6 mt-3 px-5 pt-4 pb-3 rounded-xl bg-gradient-to-br from-[#222228] to-[#18181b] shadow-lg shadow-black/10 ring-1 ring-white/[0.04]">
// NEW
<div className={cn("mx-4 lg:mx-6 mt-3 px-5 pt-4 pb-3", HEADER_STYLE.container)}>
```

Add import at top of file:
```tsx
import { HEADER_STYLE, LIST_ITEM } from "@/lib/config/design-tokens";
```

- [ ] **Step 2: Update preso dot border color**

Change the preso dot (~line 355):
```tsx
// OLD
<div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-[#222228]" />
// NEW
<div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-[#292930]" />
```

- [ ] **Step 3: Update separator opacity**

Change all vertical separators in the header from `bg-white/20` to `bg-white/15` (~lines 372, 416, 435).

- [ ] **Step 4: Update bottom row stats background**

In the fallback stats bar (~line 480):
```tsx
// OLD
<div className="flex items-center gap-3 flex-wrap mt-3 px-3.5 py-2.5 rounded-lg bg-white/[0.12]">
// NEW
<div className={cn("flex items-center gap-3 flex-wrap mt-3", HEADER_STYLE.bottomRow)}>
```

- [ ] **Step 5: Verify visually**

Run: `cd /Users/rodrigorochameire/projetos/Defender && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/admin/assistidos/\[id\]/page.tsx
git commit -m "feat: refine header to Padrão Defender v3 gradient (#292930)"
```

---

## Task 3: Abas Internas — Glass Clean

**Files:**
- Modify: `src/app/(dashboard)/admin/assistidos/[id]/page.tsx:575-804`

- [ ] **Step 1: Refactor Demandas tab — remove accent bar, add inline icon**

Replace the demandas map block (~line 588-643). Change from accent bar layout to glass clean with inline icon:

```tsx
data.demandas.map((d) => {
  const isUrgente = d.status === "URGENTE" || d.status === "2_ATENDER";
  const isConcluido = d.status === "CONCLUIDO" || d.status === "7_PROTOCOLADO";
  const prazoVencido = d.prazo && new Date(d.prazo) < new Date();
  const statusLabel = d.status?.replace(/^\d+_/, "") ?? "—";
  const statusColor = d.status === "URGENTE"
    ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
    : d.status === "2_ATENDER"
    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
    : d.status === "4_MONITORAR"
    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
    : isConcluido
    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
    : "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400";

  return (
    <button
      key={d.id}
      type="button"
      onClick={() => {
        setSelectedDemandaId(d.id);
        setSelectedProcessoId(null);
        setItemSheetType("demanda");
        setItemSheetOpen(true);
      }}
      className="w-full text-left"
    >
      <div className={LIST_ITEM.container}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <ClipboardList className={LIST_ITEM.icon} />
            <span className={cn(LIST_ITEM.title, "truncate")}>{d.ato ?? d.tipoAto ?? "Demanda"}</span>
          </div>
          <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0", statusColor)}>
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-0.5 pl-[19px]">
          {d.prazo && (
            <span className={cn(LIST_ITEM.meta, "font-mono tabular-nums", prazoVencido && "text-rose-500 dark:text-rose-400")}>
              {format(new Date(d.prazo), "dd/MM/yy", { locale: ptBR })}
            </span>
          )}
          {d.prazo && d.defensorNome && <span className={LIST_ITEM.meta}> · </span>}
          {d.defensorNome && (
            <span className={cn(LIST_ITEM.meta, "truncate")}>{d.defensorNome}</span>
          )}
        </div>
      </div>
    </button>
  );
})
```

- [ ] **Step 2: Update "Nova Demanda" button — remove emerald hover**

```tsx
// OLD
<Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-emerald-600">
// NEW
<Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-foreground">
```

- [ ] **Step 3: Refactor Audiências tab — glass clean**

Replace the audiencias block (~line 657-694):

```tsx
{tab === "audiencias" && (
  <div className="space-y-2">
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Audiências</h2>
      <Link href={`/admin/agenda?assistidoId=${data.id}`}>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-foreground">
          <Plus className="h-3.5 w-3.5" />
          Agendar
        </Button>
      </Link>
    </div>
    {data.audiencias.length === 0 ? (
      <p className="text-sm text-muted-foreground text-center py-8">Nenhuma audiência registrada</p>
    ) : (
      data.audiencias.map((a) => {
        const isPast = a.dataAudiencia && new Date(a.dataAudiencia) < new Date();
        const statusLabel = a.status === "REALIZADA" ? "Realizada" : a.status === "ADIADA" ? "Adiada" : isPast ? "Realizada" : "Agendada";
        const statusColor = a.status === "REALIZADA" || isPast
          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
          : a.status === "ADIADA"
          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
          : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400";

        return (
          <div key={a.id} className={LIST_ITEM.container}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Calendar className={LIST_ITEM.icon} />
                <span className={cn(LIST_ITEM.title, "truncate")}>{a.tipo ?? "Audiência"}</span>
              </div>
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0", statusColor)}>
                {statusLabel}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5 pl-[19px]">
              {a.dataAudiencia && (
                <span className={cn(LIST_ITEM.meta, "font-mono tabular-nums")}>
                  {format(new Date(a.dataAudiencia), "dd/MM/yy 'às' HH'h'mm", { locale: ptBR })}
                </span>
              )}
              {a.dataAudiencia && a.local && <span className={LIST_ITEM.meta}> · </span>}
              {a.local && <span className={cn(LIST_ITEM.meta, "truncate")}>{a.local}</span>}
            </div>
          </div>
        );
      })
    )}
  </div>
)}
```

- [ ] **Step 4: Refactor Ofícios tab — glass clean**

Replace the oficios block (~line 721-803):

```tsx
{tab === "oficios" && (
  <div className="space-y-2">
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs text-muted-foreground">
        {oficiosData?.total ?? 0} ofício(s)
      </p>
      <Button
        size="sm"
        className="h-7 text-xs bg-zinc-800 hover:bg-zinc-700 text-white"
        onClick={() => router.push(`/admin/oficios/novo?assistidoId=${id}`)}
      >
        <Plus className="w-3 h-3 mr-1" />
        Novo Ofício
      </Button>
    </div>

    {!oficiosData?.items?.length ? (
      <div className="text-center py-12">
        <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Nenhum ofício vinculado</p>
        <p className="text-xs text-muted-foreground/50 mt-1">
          Crie um novo ofício para este assistido
        </p>
      </div>
    ) : (
      oficiosData.items.map((oficio) => {
        const meta = (oficio.metadata as Record<string, string> | null) || {};
        const statusKey = meta.status || "rascunho";
        const statusLabel = statusKey === "rascunho" ? "Rascunho" :
          statusKey === "revisao" ? "Em Revisão" :
          statusKey === "enviado" ? "Enviado" :
          statusKey === "arquivado" ? "Arquivado" : statusKey;
        const statusColor = statusKey === "rascunho" ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" :
          statusKey === "revisao" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
          statusKey === "enviado" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
          "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400";

        return (
          <Link key={oficio.id} href={`/admin/oficios/${oficio.id}`} className="block">
            <div className={LIST_ITEM.container}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText className={LIST_ITEM.icon} />
                  <span className={cn(LIST_ITEM.title, "truncate")}>{oficio.titulo}</span>
                  {oficio.geradoPorIA && <Sparkles className="w-3 h-3 text-violet-400 shrink-0" />}
                </div>
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0", statusColor)}>
                  {statusLabel}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5 pl-[19px]">
                {oficio.processoNumero && (
                  <span className={cn(LIST_ITEM.meta, "font-mono")}>{oficio.processoNumero}</span>
                )}
                {oficio.processoNumero && meta.tipoOficio && <span className={LIST_ITEM.meta}> · </span>}
                {meta.tipoOficio && <span className={LIST_ITEM.meta}>{meta.tipoOficio}</span>}
                {(oficio.processoNumero || meta.tipoOficio) && <span className={LIST_ITEM.meta}> · </span>}
                <span className={LIST_ITEM.meta}>
                  {new Date(oficio.updatedAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>
          </Link>
        );
      })
    )}
  </div>
)}
```

- [ ] **Step 5: Verify build**

Run: `cd /Users/rodrigorochameire/projetos/Defender && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/admin/assistidos/\[id\]/page.tsx
git commit -m "feat: apply glass clean pattern to Demandas, Audiencias, Oficios tabs"
```

---

## Task 4: Aba Análise — Expandir para 8 Blocos

**Files:**
- Modify: `src/app/(dashboard)/admin/assistidos/[id]/_components/analise-blocks.tsx` (rewrite)
- Modify: `src/app/(dashboard)/admin/assistidos/[id]/_components/analise-tab.tsx`

This is the largest task. The existing `AnalysisBlocksData` type already has rich fields (depoentes with versaoDelegacia/versaoJuizo, contradicoes, perguntasSugeridas, orientacaoAoAssistido). The change is splitting the 5 UI blocks into 8 dedicated ones.

- [ ] **Step 1: Add new types to AnalysisBlocksData**

At the end of the `AnalysisBlocksData` interface in `analise-blocks.tsx` (~line 252), add optional rich fields:

```typescript
export interface AnalysisBlocksData {
  caso: CasoData;
  pessoas: PessoasData;
  provas: ProvasData;
  estrategia: EstrategiaData;
  operacional: PreparacaoData;

  // v3 rich fields (optional — populated by newer Claude Code analyses)
  painelDepoentes?: {
    nome: string;
    papel: string;
    delegacia?: { presente: boolean; data?: string };
    juizo?: { presente: boolean; data?: string };
    plenario?: string;
    statusIntimacao: "intimado" | "em_curso" | "frustrada" | "sem_diligencia" | "dispensado";
  }[];
  depoimentosComparados?: {
    ponto: string;
    delegacia: string;
    juizo: string;
    convergencia: boolean;
  }[];
  alertasOperacionais?: {
    tipo: "risco" | "atencao" | "info" | "positivo";
    texto: string;
  }[];
  checklistTatico?: string[];
}
```

- [ ] **Step 2: Create 8 dedicated block components**

Rewrite the block exports in `analise-blocks.tsx`. Replace the 5 existing blocks (BlocoCaso, BlocoPessoas, BlocoProvas, BlocoEstrategia, BlocoPreparacao) with 8 new ones. Each block follows the same accordion pattern:

```tsx
import {
  FileText, Users, GitCompareArrows, MessageCircleQuestion,
  Shield, UserCheck, Clock, MapPin, CheckCircle2, XCircle,
  AlertTriangle, ChevronRight, ChevronDown,
} from "lucide-react";

// Shared accordion trigger style
function BlockTrigger({ icon: Icon, title, count }: { icon: React.ElementType; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="w-7 h-7 rounded-md bg-zinc-800 dark:bg-zinc-700 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-white" />
      </div>
      <span className="text-[13px] font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-200">
        {title}
      </span>
      {count !== undefined && count > 0 && (
        <span className="text-[9px] bg-zinc-200/80 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-full px-1.5 py-0.5 font-medium">
          {count}
        </span>
      )}
    </div>
  );
}

// Empty state for blocks without data
function BlockEmpty({ label }: { label: string }) {
  return (
    <p className="text-xs text-muted-foreground py-4 text-center">
      Analise este caso para gerar {label}.
    </p>
  );
}
```

Then implement each of the 8 blocks as AccordionItem components. Each exports a named component:
- `BlocoResumo` — uses `caso.resumoFato`, `caso.narrativaDefensiva`, `alertasOperacionais`, `checklistTatico`
- `BlocoPainelDepoentes` — uses `painelDepoentes` (v3) or falls back to `pessoas.depoentes` (v2)
- `BlocoDepoimentosComparados` — uses `depoimentosComparados` (v3) or derives from `pessoas.depoentes[].versaoDelegacia/versaoJuizo`
- `BlocoPerguntasEstrategicas` — uses `pessoas.depoentes[].perguntasSugeridas`, grouped by person
- `BlocoTeses` — uses `estrategia.tesePrincipal`, `tesesSubsidiarias`, `nulidades`, `matrizGuerra`
- `BlocoOrientacao` — uses `operacional.orientacaoAoAssistido`, `operacional.pontosCriticos`
- `BlocoCronologia` — uses `caso.cronologia`
- `BlocoMapa` — placeholder, renders existing map component or empty state

Each component receives `data: AnalysisBlocksData` as prop and renders its relevant section with glass styling inside the AccordionContent.

- [ ] **Step 3: Update analise-tab.tsx to render 8 blocks**

In `analise-tab.tsx`, update the imports and accordion rendering (~line 637):

```tsx
import {
  BlocoResumo,
  BlocoPainelDepoentes,
  BlocoDepoimentosComparados,
  BlocoPerguntasEstrategicas,
  BlocoTeses,
  BlocoOrientacao,
  BlocoCronologia,
  BlocoMapa,
  type AnalysisBlocksData,
} from "./analise-blocks";

// In the render:
return (
  <div className="space-y-1">
    <Accordion type="multiple" defaultValue={["resumo"]}>
      <BlocoResumo data={analysis} />
      <BlocoPainelDepoentes data={analysis} />
      <BlocoDepoimentosComparados data={analysis} />
      <BlocoPerguntasEstrategicas data={analysis} />
      <BlocoTeses data={analysis} />
      <BlocoOrientacao data={analysis} />
      <BlocoCronologia data={analysis} />
      <BlocoMapa data={analysis} />
    </Accordion>
    {metadata && (
      <p className="text-[9px] text-muted-foreground text-right mt-2 font-mono">
        Analisado em {new Date(metadata.analisadoEm).toLocaleDateString("pt-BR")} · {metadata.modeloUtilizado}
      </p>
    )}
  </div>
);
```

- [ ] **Step 4: Update mock data**

Update `MOCK_ANALYSIS` in `analise-tab.tsx` to include sample data for the new v3 fields (painelDepoentes, depoimentosComparados, alertasOperacionais, checklistTatico) so they render in dev mode.

- [ ] **Step 5: Verify build**

Run: `cd /Users/rodrigorochameire/projetos/Defender && npm run build 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/admin/assistidos/\[id\]/_components/analise-blocks.tsx
git add src/app/\(dashboard\)/admin/assistidos/\[id\]/_components/analise-tab.tsx
git commit -m "feat: expand analysis to 8 dedicated blocks (depoentes, comparativa, perguntas, orientação)"
```

---

## Task 5: Drive — Visual Glass + Filtros + Preview

**Files:**
- Modify: `src/components/drive/DriveTabEnhanced.tsx`

This task modifies a shared component. Changes are visual + additive (filters, preview sheet). No API changes.

- [ ] **Step 1: Add filter state and filter pills UI**

At the top of the component, add filter state:

```tsx
const [typeFilter, setTypeFilter] = useState<string>("all");
const [statusFilter, setStatusFilter] = useState<string>("all");
```

Add filter pills below the view mode selector, using the pill style from tokens:

```tsx
import { LIST_ITEM, GLASS } from "@/lib/config/design-tokens";

// Type filter pills
const TYPE_FILTERS = [
  { key: "all", label: "Todos" },
  { key: "autos", label: "Autos" },
  { key: "laudo", label: "Laudos" },
  { key: "certidao", label: "Certidões" },
  { key: "audio", label: "Áudios" },
  { key: "video", label: "Vídeos" },
];

const STATUS_FILTERS = [
  { key: "all", label: "Todos" },
  { key: "completed", label: "Extraído" },
  { key: "pending", label: "Pendente" },
  { key: "failed", label: "Falhou" },
];
```

Render as small pills (`text-[10px]`, same pill pattern as TAB_STYLE_V3 but smaller).

- [ ] **Step 2: Apply filter logic to file list**

Add `useMemo` to filter the files array:

```tsx
const filteredFiles = useMemo(() => {
  return files.filter((f) => {
    if (typeFilter !== "all") {
      const isTypeMatch = typeFilter === "audio" ? f.mimeType?.startsWith("audio/")
        : typeFilter === "video" ? f.mimeType?.startsWith("video/")
        : (f.documentType === typeFilter || f.categoria === typeFilter);
      if (!isTypeMatch) return false;
    }
    if (statusFilter !== "all") {
      if ((f.enrichmentStatus ?? "pending") !== statusFilter) return false;
    }
    return true;
  });
}, [files, typeFilter, statusFilter]);
```

Use `filteredFiles` instead of `files` in all rendering.

- [ ] **Step 3: Apply glass visual to file items**

Replace the existing file item styling with `LIST_ITEM.container`. Use Lucide icons inline:
- `FileText` for documents
- `Music` for audio
- `Video` for video
- `FolderOpen` for folders
- `File` for generic

Enrichment status badges keep their existing colors from `drive-constants.ts`.

Remove any `hover:border-emerald` patterns.

- [ ] **Step 4: Add preview Sheet**

Add state for preview:

```tsx
const [previewFile, setPreviewFile] = useState<DriveFileData | null>(null);
```

Add a Sheet component at the bottom:

```tsx
<Sheet open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
  <SheetContent className="w-[400px] sm:w-[540px]">
    <SheetTitle className="text-sm font-semibold">{previewFile?.name}</SheetTitle>
    {/* File metadata */}
    <div className="space-y-3 mt-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{previewFile?.mimeType}</span>
        {previewFile?.lastModifiedTime && (
          <span>· {format(new Date(previewFile.lastModifiedTime), "dd/MM/yy", { locale: ptBR })}</span>
        )}
      </div>
      {/* Enrichment content if available */}
      {previewFile?.enrichmentData && (
        <div className={cn(GLASS.card, "p-3")}>
          <p className="text-[9px] uppercase tracking-wider font-semibold text-zinc-500 mb-2">Conteúdo Extraído</p>
          <div className="text-xs text-foreground/80 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
            {typeof previewFile.enrichmentData === "object"
              ? JSON.stringify(previewFile.enrichmentData, null, 2)
              : String(previewFile.enrichmentData)}
          </div>
        </div>
      )}
      {/* Actions */}
      <div className="flex gap-2">
        {previewFile?.webViewLink && (
          <a href={previewFile.webViewLink} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ExternalLink className="w-3 h-3" />
              Abrir no Drive
            </Button>
          </a>
        )}
      </div>
    </div>
  </SheetContent>
</Sheet>
```

Wire `onClick` on file items to `setPreviewFile(file)`.

- [ ] **Step 5: Folder hierarchy visual**

For folder items, use slightly different glass styling:
```tsx
// Folder
<div className="bg-zinc-200/40 dark:bg-white/[0.06] border border-zinc-200/60 dark:border-white/[0.04] rounded-lg px-3 py-2">
```

Files inside folders get `pl-6` indentation.

- [ ] **Step 6: Verify build**

Run: `cd /Users/rodrigorochameire/projetos/Defender && npm run build 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add src/components/drive/DriveTabEnhanced.tsx
git commit -m "feat: Drive glass redesign with type/status filters and preview sheet"
```

---

## Task 6: Final Verification

- [ ] **Step 1: Full build check**

Run: `cd /Users/rodrigorochameire/projetos/Defender && npm run build`
Expected: Build succeeds, no type errors

- [ ] **Step 2: Visual check — start dev server and open page**

Run: `cd /Users/rodrigorochameire/projetos/Defender && npm run dev`
Navigate to an assistido page and verify:
- Header uses softer gradient (#292930)
- Tabs are pill style
- Demandas/Audiências/Ofícios use glass clean items with inline Lucide icons
- Analysis shows 8 accordion blocks
- Drive has filter pills and glass items

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: visual adjustments after review"
```
