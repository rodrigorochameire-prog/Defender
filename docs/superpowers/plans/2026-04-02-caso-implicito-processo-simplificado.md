# Caso Implícito + Processo Simplificado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform "caso" from a dormant page into an implicit entity auto-created when processes are linked, simplify the Processo page from 9 to 4 tabs, and show case context in both Assistido and Processo headers.

**Architecture:** Schema migration adds `ativo` to `assistidos_processos`, drops `casos.processoReferenciaId` and `assistidos.casoId`. New utility functions classify `tipoProcesso` and compute contextual focus order. Processo page drops redundant tabs. Assistido header shows case grouping with sibling processes. Casos page routes and sidebar link are removed.

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM, PostgreSQL (Supabase), Tailwind CSS, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-02-caso-implicito-processo-simplificado-design.md`

---

## File Structure

### New files
- `src/lib/utils/processo-classification.ts` — `classifyTipoProcesso(classeProcessual)` function
- `src/lib/utils/processo-focus.ts` — `getProcessosFocados(processos, atribuicao)` function
- `src/components/processo/caso-bar.tsx` — Glass bar showing case + sibling processes (reusable in both pages)
- `drizzle/migrations/XXXX_caso_implicito.sql` — Schema migration

### Modified files
- `src/lib/db/schema/enums.ts:268-276` — Add enum values to `papelProcessoEnum`
- `src/lib/db/schema/core.ts:103` — Remove `casoId` from assistidos
- `src/lib/db/schema/core.ts:393-411` — Add `ativo` column to `assistidos_processos`
- `src/lib/db/schema/casos.ts:41` — Remove `processoReferenciaId` from casos
- `src/lib/trpc/routers/processos.ts:124-265` — Enrich `getById` with case data and `ativo` field
- `src/lib/trpc/routers/assistidos.ts:306+` — Enrich `getById` with case grouping
- `src/components/processo/processo-header.tsx` — Add CasoBar, remove stats glass bar
- `src/components/processo/processo-tabs.tsx` — Remove Demandas/Agenda/Documentos/Vinculados tabs
- `src/app/(dashboard)/admin/processos/[id]/page.tsx` — Remove 4 tab contents, remove context bar
- `src/app/(dashboard)/admin/assistidos/[id]/page.tsx:458-503` — Replace glass bar with CasoBar
- `src/components/layouts/admin-sidebar.tsx:80` — Remove Casos nav link

### Deleted files
- `src/app/(dashboard)/admin/casos/page.tsx`
- `src/app/(dashboard)/admin/casos/novo/page.tsx`
- `src/app/(dashboard)/admin/casos/[id]/page.tsx`
- `src/app/(dashboard)/admin/casos/loading.tsx`

---

## Task 1: Schema Migration

**Files:**
- Modify: `src/lib/db/schema/enums.ts:268-276`
- Modify: `src/lib/db/schema/core.ts:393-411`
- Modify: `src/lib/db/schema/core.ts:103`
- Modify: `src/lib/db/schema/casos.ts:41`
- Create: SQL migration (via `npm run db:generate`)

- [ ] **Step 1: Add new enum values to papelProcessoEnum**

In `src/lib/db/schema/enums.ts`, replace lines 268-276:

```typescript
export const papelProcessoEnum = pgEnum("papel_processo", [
  "REU",
  "CORREU",
  "VITIMA",
  "TESTEMUNHA",
  "DENUNCIANTE",
  "QUERELANTE",
  "ASSISTENTE",
  "REQUERIDO",
  "EXECUTADO",
  "REEDUCANDO",
]);
```

- [ ] **Step 2: Add `ativo` column to assistidosProcessos**

In `src/lib/db/schema/core.ts`, add `ativo` field to the `assistidosProcessos` table (after `observacoes` on line 403):

```typescript
export const assistidosProcessos = pgTable("assistidos_processos", {
  id: serial("id").primaryKey(),
  assistidoId: integer("assistido_id")
    .notNull()
    .references(() => assistidos.id, { onDelete: "cascade" }),
  processoId: integer("processo_id")
    .notNull()
    .references(() => processos.id, { onDelete: "cascade" }),
  papel: papelProcessoEnum("papel").default("REU").notNull(),
  isPrincipal: boolean("is_principal").default(true),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("assistidos_processos_assistido_id_idx").on(table.assistidoId),
  index("assistidos_processos_processo_id_idx").on(table.processoId),
  index("assistidos_processos_papel_idx").on(table.papel),
  uniqueIndex("assistidos_processos_unique_idx").on(table.assistidoId, table.processoId, table.papel),
]);
```

- [ ] **Step 3: Remove `casoId` from assistidos table**

In `src/lib/db/schema/core.ts`, remove line 103 (`casoId: integer("caso_id"),`).

Also remove the index at line ~147: `index("assistidos_caso_id_idx").on(table.casoId),`

Search for any references to `assistidos.casoId` in tRPC routers and remove them.

- [ ] **Step 4: Remove `processoReferenciaId` from casos table**

In `src/lib/db/schema/casos.ts`, remove line 41 (`processoReferenciaId: integer("processo_referencia_id").references(() => processos.id),`).

Search for any references to `casos.processoReferenciaId` in tRPC routers and remove them.

- [ ] **Step 5: Generate and apply migration**

Run:
```bash
cd /Users/rodrigorochameire/Projetos/Defender
npm run db:generate
npm run db:push
```

Expected: Migration generated and applied without errors.

- [ ] **Step 6: Verify build**

Run:
```bash
npx tsc --noEmit 2>&1 | grep -v "defensor-scope.test.ts"
```

Expected: No new errors (the existing test error is pre-existing).

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/schema/ drizzle/
git commit -m "feat: schema migration — ativo in assistidos_processos, new papéis, drop stale fields"
```

---

## Task 2: classifyTipoProcesso utility

**Files:**
- Create: `src/lib/utils/processo-classification.ts`

- [ ] **Step 1: Create the classification function**

Create `src/lib/utils/processo-classification.ts`:

```typescript
/**
 * Maps classe processual (from PJe/DataJud) to tipoProcesso short code.
 */

const EXACT_MAP: Record<string, string> = {
  "Ação Penal": "AP",
  "Ação Penal - Procedimento Ordinário": "AP",
  "Ação Penal - Procedimento do Júri": "AP",
  "Ação Penal - Procedimento Sumário": "AP",
  "Ação Penal - Procedimento Sumaríssimo": "AP",
  "Inquérito Policial": "IP",
  "Auto de Prisão em Flagrante": "APF",
  "Medidas Protetivas de Urgência": "MPU",
  "Medida Protetiva de Urgência": "MPU",
  "Medida Cautelar": "CAUTELAR",
  "Medida Cautelar Inominada": "CAUTELAR",
  "Prisão Preventiva": "PPP",
  "Produção Antecipada de Provas": "PAP",
  "Execução Penal": "EP",
  "Execução da Pena": "EP",
  "Execução de ANPP": "EANPP",
  "Acordo de Não Persecução Penal": "EANPP",
  "Habeas Corpus": "HC",
  "Recurso em Sentido Estrito": "RESE",
  "Apelação Criminal": "APELACAO",
  "Agravo em Execução Penal": "AGRAVO",
};

const PARTIAL_MAP: [RegExp, string][] = [
  [/med.*protet/i, "MPU"],
  [/inqu[eé]rito/i, "IP"],
  [/flagrante/i, "APF"],
  [/execu[çc][aã]o.*penal/i, "EP"],
  [/execu[çc][aã]o.*pena/i, "EP"],
  [/execu[çc][aã]o.*anpp/i, "EANPP"],
  [/habeas/i, "HC"],
  [/cautelar/i, "CAUTELAR"],
  [/protetiva/i, "MPU"],
  [/produ[çc][aã]o.*antecipada/i, "PAP"],
  [/pris[aã]o.*preventiva/i, "PPP"],
  [/a[çc][aã]o penal/i, "AP"],
  [/apela[çc][aã]o/i, "APELACAO"],
  [/agravo/i, "AGRAVO"],
  [/recurso.*sentido.*estrito/i, "RESE"],
];

export function classifyTipoProcesso(classeProcessual: string | null | undefined): string {
  if (!classeProcessual) return "AP";

  const trimmed = classeProcessual.trim();

  // Exact match
  if (EXACT_MAP[trimmed]) return EXACT_MAP[trimmed];

  // Partial match
  for (const [regex, tipo] of PARTIAL_MAP) {
    if (regex.test(trimmed)) return tipo;
  }

  return "AP"; // default
}

/** Labels for display */
export const TIPO_PROCESSO_LABEL: Record<string, string> = {
  AP: "Ação Penal",
  IP: "Inquérito Policial",
  APF: "Auto Prisão Flagrante",
  MPU: "Medida Protetiva",
  EP: "Execução Penal",
  EANPP: "Execução ANPP",
  PPP: "Prisão Preventiva",
  HC: "Habeas Corpus",
  CAUTELAR: "Cautelar",
  PAP: "Prod. Antecipada Provas",
  RESE: "Recurso Sent. Estrito",
  APELACAO: "Apelação",
  AGRAVO: "Agravo",
};

/** Is this tipo a reference process (AP or EP)? */
export function isReferenceTipo(tipo: string): boolean {
  return tipo === "AP" || tipo === "EP";
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils/processo-classification.ts
git commit -m "feat: classifyTipoProcesso — maps classe processual to tipo code"
```

---

## Task 3: getProcessosFocados utility

**Files:**
- Create: `src/lib/utils/processo-focus.ts`

- [ ] **Step 1: Create the focus ordering function**

Create `src/lib/utils/processo-focus.ts`:

```typescript
/**
 * Orders processes within a case by contextual relevance.
 * Used in both Assistido and Processo headers.
 */

const TIPO_RANK: Record<string, Record<string, number>> = {
  JURI_CAMACARI: { AP: 1, IP: 2, APF: 3, PPP: 4, CAUTELAR: 5, HC: 6 },
  VVD_CAMACARI: { AP: 1, MPU: 2, IP: 3, APF: 4, PAP: 5, CAUTELAR: 6 },
  EXECUCAO_PENAL: { EP: 1, EANPP: 2, AP: 3, AGRAVO: 4, HC: 5 },
  SUBSTITUICAO: { AP: 1, MPU: 2, IP: 3, APF: 4, CAUTELAR: 5, PAP: 6, HC: 7 },
};

const DEFAULT_RANK: Record<string, number> = { AP: 1, IP: 2, MPU: 3, EP: 4 };

interface ProcessoParaFoco {
  id: number;
  tipoProcesso: string | null;
  isReferencia: boolean | null;
  /** Is the current assistido active in this process? null = not a party */
  ativo?: boolean | null;
  /** Next hearing date, if any */
  proximaAudiencia?: string | null;
}

export function getProcessosFocados(
  processos: ProcessoParaFoco[],
  atribuicao: string,
): ProcessoParaFoco[] {
  const rankMap = TIPO_RANK[atribuicao] ?? DEFAULT_RANK;

  return [...processos].sort((a, b) => {
    // 1. Process with nearest future hearing wins
    const audA = a.proximaAudiencia ? new Date(a.proximaAudiencia).getTime() : Infinity;
    const audB = b.proximaAudiencia ? new Date(b.proximaAudiencia).getTime() : Infinity;
    if (audA !== audB) return audA - audB;

    // 2. Active > inactive for this assistido
    const ativoA = a.ativo !== false ? 0 : 1;
    const ativoB = b.ativo !== false ? 0 : 1;
    if (ativoA !== ativoB) return ativoA - ativoB;

    // 3. Reference > non-reference
    const refA = a.isReferencia ? 0 : 1;
    const refB = b.isReferencia ? 0 : 1;
    if (refA !== refB) return refA - refB;

    // 4. Tipo hierarchy for the area
    const tipoA = rankMap[a.tipoProcesso ?? "AP"] ?? 99;
    const tipoB = rankMap[b.tipoProcesso ?? "AP"] ?? 99;
    return tipoA - tipoB;
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils/processo-focus.ts
git commit -m "feat: getProcessosFocados — contextual process ordering by area"
```

---

## Task 4: Enrich processos.getById with case context

**Files:**
- Modify: `src/lib/trpc/routers/processos.ts:154-171` (assistidos query)
- Modify: `src/lib/trpc/routers/processos.ts:239-265` (processosVinculados + return)

- [ ] **Step 1: Add `ativo` to assistidos query**

In `src/lib/trpc/routers/processos.ts`, update the assistidos select (lines 156-161) to include `ativo` and `observacoes`:

```typescript
          // Partes (assistidos vinculados via assistidosProcessos)
          db
            .select({
              id: assistidos.id,
              nome: assistidos.nome,
              cpf: assistidos.cpf,
              papel: assistidosProcessos.papel,
              isPrincipal: assistidosProcessos.isPrincipal,
              ativo: assistidosProcessos.ativo,
              observacoes: assistidosProcessos.observacoes,
              statusPrisional: assistidos.statusPrisional,
            })
            .from(assistidosProcessos)
            .innerJoin(assistidos, eq(assistidosProcessos.assistidoId, assistidos.id))
            .where(
              and(
                eq(assistidosProcessos.processoId, input.id),
                isNull(assistidos.deletedAt),
              ),
            ),
```

- [ ] **Step 2: Enrich processosVinculados with tipo, isReferencia, and case title**

Replace the processosVinculados query (lines 239-255) with:

```typescript
      // Case info + sibling processes
      let casoInfo: { id: number; titulo: string } | null = null;
      let processosVinculados: {
        id: number;
        numeroAutos: string | null;
        tipoProcesso: string | null;
        isReferencia: boolean | null;
        classeProcessual: string | null;
        assistidosNomes: string[];
      }[] = [];

      if (base.casoId) {
        // Get caso info
        const casoRows = await db
          .select({ id: casos.id, titulo: casos.titulo })
          .from(casos)
          .where(eq(casos.id, base.casoId))
          .limit(1);
        casoInfo = casoRows[0] ?? null;

        // Get sibling processes
        const siblings = await db
          .select({
            id: processos.id,
            numeroAutos: processos.numeroAutos,
            tipoProcesso: processos.tipoProcesso,
            isReferencia: processos.isReferencia,
            classeProcessual: processos.classeProcessual,
          })
          .from(processos)
          .where(
            and(
              eq(processos.casoId, base.casoId),
              ne(processos.id, input.id),
              isNull(processos.deletedAt),
            ),
          );

        // Get assistido names per sibling
        const siblingIds = siblings.map((s) => s.id);
        const siblingAssistidos = siblingIds.length > 0
          ? await db
              .select({
                processoId: assistidosProcessos.processoId,
                nome: assistidos.nome,
              })
              .from(assistidosProcessos)
              .innerJoin(assistidos, eq(assistidosProcessos.assistidoId, assistidos.id))
              .where(
                and(
                  inArray(assistidosProcessos.processoId, siblingIds),
                  eq(assistidosProcessos.ativo, true),
                  isNull(assistidos.deletedAt),
                ),
              )
          : [];

        processosVinculados = siblings.map((s) => ({
          ...s,
          assistidosNomes: siblingAssistidos
            .filter((sa) => sa.processoId === s.id)
            .map((sa) => sa.nome),
        }));
      }

      return {
        ...base,
        assistidos: assistidosRows,
        audiencias: audienciasRows,
        demandas: demandasRows,
        driveFiles: driveFilesRows,
        casoInfo,
        processosVinculados,
      };
```

Note: You'll need to import `casos` from the schema and `ne`, `inArray` from drizzle-orm at the top of the file. Check existing imports first.

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit 2>&1 | grep "processos.ts"
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/trpc/routers/processos.ts
git commit -m "feat: processos.getById returns case info + enriched siblings"
```

---

## Task 5: CasoBar component

**Files:**
- Create: `src/components/processo/caso-bar.tsx`

- [ ] **Step 1: Create the CasoBar component**

Create `src/components/processo/caso-bar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { TIPO_PROCESSO_LABEL } from "@/lib/utils/processo-classification";

interface ProcessoChip {
  id: number;
  numeroAutos: string | null;
  tipoProcesso: string | null;
  isReferencia: boolean | null;
  /** Is the current assistido active in this process? null = not a party / viewing from processo page */
  ativo?: boolean | null;
  /** Names of assistidos in this process (for siblings) */
  assistidosNomes?: string[];
}

interface CasoBarProps {
  casoTitulo: string;
  currentProcessoId: number;
  processos: ProcessoChip[];
  /** Stats to show at the right side */
  stats?: { demandas?: number; audiencias?: number; arquivos?: number };
}

export function CasoBar({ casoTitulo, currentProcessoId, processos, stats }: CasoBarProps) {
  if (processos.length === 0) return null;

  // Separate current process out — only show siblings as chips
  const siblings = processos.filter((p) => p.id !== currentProcessoId);

  if (siblings.length === 0) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap mt-3 px-3.5 py-2.5 rounded-lg bg-white/[0.12]">
      {/* Case title */}
      <span className="text-[10px] text-white/30 uppercase tracking-wider shrink-0">
        {casoTitulo}
      </span>

      <span className="w-px h-3 bg-white/10" />

      {/* Sibling process chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {siblings.map((p) => {
          const tipoLabel = TIPO_PROCESSO_LABEL[p.tipoProcesso ?? "AP"] ?? p.tipoProcesso ?? "AP";
          const isInactive = p.ativo === false;
          const shortAutos = p.numeroAutos
            ? p.numeroAutos.replace(/^0+/, "").slice(0, 15)
            : "s/n";

          return (
            <Link
              key={p.id}
              href={`/admin/processos/${p.id}`}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors",
                isInactive
                  ? "bg-white/5 text-white/25 hover:text-white/50"
                  : "bg-white/10 text-white/60 hover:text-white hover:bg-white/20",
              )}
              title={`${tipoLabel} ${p.numeroAutos ?? ""}${p.assistidosNomes?.length ? ` (${p.assistidosNomes.join(", ")})` : ""}`}
            >
              <span className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                isInactive ? "bg-white/20" : p.isReferencia ? "bg-emerald-400" : "bg-white/40",
              )} />
              <span>{p.tipoProcesso ?? "AP"}</span>
              <span className="text-white/30 font-mono">{shortAutos}</span>
            </Link>
          );
        })}
      </div>

      {/* Stats */}
      {stats && (
        <>
          <span className="w-px h-3 bg-white/10 ml-auto" />
          <div className="flex items-center gap-3 text-[11px] text-white/30">
            {stats.demandas !== undefined && (
              <span><span className="font-semibold text-white/60">{stats.demandas}</span> dem</span>
            )}
            {stats.audiencias !== undefined && (
              <span><span className="font-semibold text-white/60">{stats.audiencias}</span> aud</span>
            )}
            {stats.arquivos !== undefined && (
              <span><span className="font-semibold text-white/60">{stats.arquivos}</span> arq</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/processo/caso-bar.tsx
git commit -m "feat: CasoBar component — glass bar with sibling process chips"
```

---

## Task 6: Simplify Processo page — remove redundant tabs

**Files:**
- Modify: `src/components/processo/processo-tabs.tsx`
- Modify: `src/app/(dashboard)/admin/processos/[id]/page.tsx`
- Modify: `src/components/processo/processo-header.tsx`

- [ ] **Step 1: Remove Demandas/Agenda/Documentos/Vinculados from tabs**

In `src/components/processo/processo-tabs.tsx`, update `BASE_TABS` to only keep Análise:

```typescript
const BASE_TABS: { key: MainTab; label: string; icon: React.ElementType }[] = [
  { key: "analise", label: "Análise", icon: Brain },
];
```

Update the `MainTab` type:

```typescript
export type MainTab = "analise" | "delitos" | "institutos" | "atos_infracionais" | "medidas";
```

Remove the `counts` prop since no tab needs counts anymore:

```typescript
interface ProcessoTabsProps {
  active: MainTab;
  onChange: (tab: MainTab) => void;
}

export function ProcessoTabs({ active, onChange }: ProcessoTabsProps) {
```

Remove the count badge rendering from inside the button JSX (the `{counts?.[tab.key] ...}` block).

- [ ] **Step 2: Remove redundant tab content from page**

In `src/app/(dashboard)/admin/processos/[id]/page.tsx`:

Remove these imports:
```typescript
// Remove:
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DriveTabEnhanced } from "@/components/drive/DriveTabEnhanced";
import { VinculadosCards } from "@/components/processo/vinculados-cards";
```

Remove the `counts` prop from `<ProcessoTabs>`:

```tsx
<ProcessoTabs active={tab} onChange={setTab} />
```

Remove the entire JSX blocks for tabs: `demandas`, `agenda`, `documentos`, `vinculados` (keep `analise`, `delitos`, `institutos`, `atos_infracionais`, `medidas`).

Remove `counts` from the `<ProcessoHeader>` props.

- [ ] **Step 3: Update ProcessoHeader — replace stats bar with CasoBar**

In `src/components/processo/processo-header.tsx`:

Add import:
```typescript
import { CasoBar } from "./caso-bar";
```

Update the props interface — remove `counts`, add case fields:

```typescript
interface ProcessoHeaderProps {
  id: number;
  numeroAutos: string;
  assistidos: Assistido[];
  atribuicao: string;
  vara: string | null;
  comarca: string | null;
  proximaAudiencia: Audiencia | null;
  classeProcessual: string | null;
  casoInfo?: { id: number; titulo: string } | null;
  processosVinculados?: {
    id: number;
    numeroAutos: string | null;
    tipoProcesso: string | null;
    isReferencia: boolean | null;
    assistidosNomes: string[];
  }[];
}
```

Replace the stats glass bar (`{counts && (...)}` block) with:

```tsx
        {/* Caso bar — sibling processes */}
        {casoInfo && processosVinculados && processosVinculados.length > 0 && (
          <CasoBar
            casoTitulo={casoInfo.titulo}
            currentProcessoId={id}
            processos={processosVinculados}
          />
        )}
```

- [ ] **Step 4: Update page to pass case data to header**

In `src/app/(dashboard)/admin/processos/[id]/page.tsx`, update the `<ProcessoHeader>` call:

```tsx
      <ProcessoHeader
        id={data.id}
        numeroAutos={data.numeroAutos ?? "Sem numero"}
        assistidos={data.assistidos?.map((a: any) => ({
          id: a.id,
          nome: a.nome,
          statusPrisional: a.statusPrisional,
        })) ?? []}
        atribuicao={data.atribuicao}
        vara={data.vara}
        comarca={data.comarca}
        proximaAudiencia={proximaAudiencia}
        classeProcessual={(data as any).classeProcessual}
        casoInfo={(data as any).casoInfo}
        processosVinculados={(data as any).processosVinculados}
      />
```

- [ ] **Step 5: Verify build**

```bash
npx tsc --noEmit 2>&1 | grep -E "processo|page.tsx"
```

Expected: No new errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/processo/ src/app/(dashboard)/admin/processos/
git commit -m "feat: simplify Processo page — 4 tabs, CasoBar in header"
```

---

## Task 7: Remove Casos page and sidebar link

**Files:**
- Delete: `src/app/(dashboard)/admin/casos/page.tsx`
- Delete: `src/app/(dashboard)/admin/casos/novo/page.tsx`
- Delete: `src/app/(dashboard)/admin/casos/[id]/page.tsx`
- Delete: `src/app/(dashboard)/admin/casos/loading.tsx`
- Modify: `src/components/layouts/admin-sidebar.tsx:80`

- [ ] **Step 1: Remove sidebar link**

In `src/components/layouts/admin-sidebar.tsx`, remove line 80:

```typescript
  { label: "Casos", path: "/admin/casos", icon: "Briefcase" },
```

So `CADASTROS_NAV` becomes:

```typescript
const CADASTROS_NAV: AssignmentMenuItem[] = [
  { label: "Assistidos", path: "/admin/assistidos", icon: "Users", requiredRoles: ["admin", "defensor", "servidor", "estagiario", "triagem"] },
  { label: "Processos", path: "/admin/processos", icon: "Scale" },
  { label: "Solar", path: "/admin/intimacoes", icon: "Sun" },
  { label: "Mapa", path: "/admin/cadastro/mapa", icon: "Map" },
];
```

- [ ] **Step 2: Delete casos page files**

```bash
rm -rf src/app/\(dashboard\)/admin/casos/
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit 2>&1 | grep -i "caso"
```

Expected: No errors from deleted files (tRPC router stays — used internally).

- [ ] **Step 4: Commit**

```bash
git add -A src/app/\(dashboard\)/admin/casos/ src/components/layouts/admin-sidebar.tsx
git commit -m "feat: remove Casos page and sidebar link — caso is now implicit"
```

---

## Task 8: Enrich assistidos.getById with case grouping

**Files:**
- Modify: `src/lib/trpc/routers/assistidos.ts` (getById procedure)

- [ ] **Step 1: Add case grouping to assistidos.getById**

In the `getById` procedure of `src/lib/trpc/routers/assistidos.ts`, after the existing parallel queries, add a query for case-grouped processes.

Find the return statement and add case grouping logic before it:

```typescript
      // Group processes by caso
      const processosComCaso = baseResult.processos ?? [];
      const casoIds = [...new Set(processosComCaso.map((p: any) => p.casoId).filter(Boolean))];

      let casosAgrupados: {
        id: number;
        titulo: string;
        processos: {
          id: number;
          numeroAutos: string | null;
          tipoProcesso: string | null;
          isReferencia: boolean | null;
          ativo: boolean;
          papel: string;
          isDoProprio: boolean;
        }[];
      }[] = [];

      if (casoIds.length > 0) {
        // Get caso titles
        const casoRows = await db
          .select({ id: casos.id, titulo: casos.titulo })
          .from(casos)
          .where(inArray(casos.id, casoIds));

        // Get ALL processes in these cases (including other assistidos')
        const todosProcessosCaso = await db
          .select({
            id: processos.id,
            casoId: processos.casoId,
            numeroAutos: processos.numeroAutos,
            tipoProcesso: processos.tipoProcesso,
            isReferencia: processos.isReferencia,
          })
          .from(processos)
          .where(
            and(
              inArray(processos.casoId, casoIds),
              isNull(processos.deletedAt),
            ),
          );

        // Get this assistido's relationship to each process
        const vinculacoes = await db
          .select({
            processoId: assistidosProcessos.processoId,
            ativo: assistidosProcessos.ativo,
            papel: assistidosProcessos.papel,
          })
          .from(assistidosProcessos)
          .where(eq(assistidosProcessos.assistidoId, input.id));

        const vinculacaoMap = new Map(vinculacoes.map((v) => [v.processoId, v]));

        casosAgrupados = casoRows.map((c) => ({
          id: c.id,
          titulo: c.titulo,
          processos: todosProcessosCaso
            .filter((p) => p.casoId === c.id)
            .map((p) => {
              const v = vinculacaoMap.get(p.id);
              return {
                id: p.id,
                numeroAutos: p.numeroAutos,
                tipoProcesso: p.tipoProcesso,
                isReferencia: p.isReferencia,
                ativo: v?.ativo ?? false,
                papel: v?.papel ?? "",
                isDoProprio: !!v,
              };
            }),
        }));
      }
```

Add `casosAgrupados` to the return object:

```typescript
      return {
        ...baseResult,
        casosAgrupados,
      };
```

Note: Import `casos` from schema, and `inArray` from drizzle-orm if not already imported.

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit 2>&1 | grep "assistidos.ts"
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/trpc/routers/assistidos.ts
git commit -m "feat: assistidos.getById returns casosAgrupados with all sibling processes"
```

---

## Task 9: Update Assistido page header with CasoBar

**Files:**
- Modify: `src/app/(dashboard)/admin/assistidos/[id]/page.tsx:458-503`

- [ ] **Step 1: Replace glass bar with CasoBar(s)**

In `src/app/(dashboard)/admin/assistidos/[id]/page.tsx`, add import:

```typescript
import { CasoBar } from "@/components/processo/caso-bar";
```

Replace the glass bar section (lines ~458-503, the `<div className="flex items-center gap-3 flex-wrap mt-3 px-3.5 py-2.5 rounded-lg bg-white/[0.12]">` block) with:

```tsx
        {/* Case grouping — one bar per caso */}
        {(data as any).casosAgrupados?.length > 0 ? (
          (data as any).casosAgrupados.map((caso: any) => (
            <CasoBar
              key={caso.id}
              casoTitulo={caso.titulo}
              currentProcessoId={-1}
              processos={caso.processos.map((p: any) => ({
                id: p.id,
                numeroAutos: p.numeroAutos,
                tipoProcesso: p.tipoProcesso,
                isReferencia: p.isReferencia,
                ativo: p.isDoProprio ? p.ativo : null,
                assistidosNomes: p.isDoProprio ? [] : undefined,
              }))}
              stats={{
                demandas: data.demandas.length,
                audiencias: data.audiencias.length,
                arquivos: data.driveFiles.length,
              }}
            />
          ))
        ) : (
          /* Fallback — no caso yet, show simple stats */
          <div className="flex items-center gap-3 flex-wrap mt-3 px-3.5 py-2.5 rounded-lg bg-white/[0.12]">
            <div className="flex items-center gap-3 text-[11px] text-white/30">
              <span><span className="font-semibold text-white/60">{data.processos.length}</span> proc</span>
              <span><span className="font-semibold text-white/60">{data.demandas.length}</span> dem</span>
              <span><span className="font-semibold text-white/60">{data.audiencias.length}</span> aud</span>
            </div>
          </div>
        )}
```

- [ ] **Step 2: Remove Processos tab**

Find the `tabs` array definition (around line 294) and remove the processos entry:

```typescript
  const tabs: { key: Tab; label: string; icon: React.ElementType; count?: number; urgency?: "red" | "amber" }[] = [
    // REMOVED: { key: "processos", label: "Processos", icon: Gavel, count: data.processos.length },
    { key: "analise", label: "Análise", icon: Sparkles },
    {
      key: "demandas",
      // ... rest stays the same
```

Update the `Tab` type to remove "processos":

```typescript
type Tab = "demandas" | "drive" | "audiencias" | "midias" | "timeline" | "oficios" | "analise" | "investigacao" | "radar";
```

Update the default tab in useState:

```typescript
const [tab, setTab] = useState<Tab>(() => {
  if (typeof window === "undefined") return "demandas";
  return (localStorage.getItem(`assistido-tab-${id}`) as Tab) ?? "demandas";
});
```

Remove the tab content block that renders the processos list (find `{tab === "processos" && (` and remove the entire block).

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit 2>&1 | grep "assistidos"
```

- [ ] **Step 4: Test visually**

Open `http://localhost:3000/admin/assistidos/{id}` in the browser. Verify:
- Header shows CasoBar (or fallback stats if no caso)
- Processos tab is gone
- Default tab is now Demandas

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/admin/assistidos/
git commit -m "feat: Assistido header shows CasoBar, remove Processos tab"
```

---

## Task 10: Wire up classifyTipoProcesso in process creation/import

**Files:**
- Modify: `src/lib/trpc/routers/processos.ts` (create procedure)

- [ ] **Step 1: Auto-classify on process creation**

In `src/lib/trpc/routers/processos.ts`, add import:

```typescript
import { classifyTipoProcesso, isReferenceTipo } from "@/lib/utils/processo-classification";
```

Find the `create` procedure. In the insert values, replace the static `tipoProcesso` with the classification:

```typescript
const tipo = classifyTipoProcesso(input.classeProcessual ?? null);

const [created] = await db.insert(processos).values({
  ...input,
  tipoProcesso: tipo,
  isReferencia: isReferenceTipo(tipo),
  // ... rest of existing values
}).returning();
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit 2>&1 | grep "processos.ts"
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/trpc/routers/processos.ts
git commit -m "feat: auto-classify tipoProcesso on process creation"
```

---

## Task Summary

| Task | Description | Estimated |
|------|-------------|-----------|
| 1 | Schema migration (ativo, enum, drop fields) | 10 min |
| 2 | classifyTipoProcesso utility | 5 min |
| 3 | getProcessosFocados utility | 5 min |
| 4 | Enrich processos.getById with case context | 10 min |
| 5 | CasoBar component | 5 min |
| 6 | Simplify Processo page — remove 4 tabs + CasoBar | 15 min |
| 7 | Remove Casos page and sidebar link | 5 min |
| 8 | Enrich assistidos.getById with case grouping | 10 min |
| 9 | Update Assistido page header with CasoBar | 10 min |
| 10 | Wire classifyTipoProcesso in creation | 5 min |
