# Registros Panel Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 5 divergent "Registros" implementations with one reusable `RegistrosPanel` (composer-first timeline, Pendências pinned on top, Lucide icons), backed by a small additive `registros.prazo` column.

**Architecture:** A new `RegistrosPanel` driven by a `scope` prop composes four units — `RegistroComposer`, `RegistrosToolbar`, pure `splitRegistros` section logic, and a refined `RegistroCard`. `registros-timeline.tsx` is refactored in place into it. A nullable `registros.prazo` date column powers the Pendências countdown. All existing `registros.create` side-effects (audiência auto-schedule, MPU/cautelar parsing, Sheets sync) and "Abrir autos" are preserved by reusing the current `RegistroEditor`/`RegistroComAutosDialog`.

**Tech Stack:** Next.js 15 (App Router), tRPC, Drizzle ORM (Postgres/Supabase), Vitest + @testing-library/react (happy-dom), Tailwind + shadcn/ui, lucide-react.

**Spec:** `docs/superpowers/specs/2026-06-29-registros-panel-redesign-design.md`

---

## Conventions (read once)

- **Test runner:** Vitest. Default env is `node`. **DOM/component tests must start with** `// @vitest-environment happy-dom` on line 1. Imports are explicit (`globals: false`).
- **Component test template:** `src/components/registros/__tests__/registro-editor.test.tsx`. tRPC is mocked with `vi.mock("@/lib/trpc/client", () => ({ trpc: { ... } }))`; query/mutation hooks are hand-stubbed.
- **Pure-logic test template:** `src/lib/services/__tests__/registros-summary.test.ts` (import the unit directly).
- **Run a single test:** `npx vitest run <path> -t "<name>"`. **Typecheck:** `npm run typecheck`. **Lint:** `npm run lint`.
- **Commit cadence:** one commit per task (after its tests pass). Conventional commits.
- Tipo taxonomy + Lucide icons + colors already live in `src/components/registros/registro-tipo-config.ts` (`REGISTRO_TIPOS[tipo] = { label, shortLabel, color, bg, text, Icon }`). **Reuse it — do not redefine colors/icons.**

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/lib/db/schema/agenda.ts` | `registros.prazo` date column | Modify (L1 import + ~L196) |
| `src/lib/trpc/routers/registros.ts` | `prazo` in create/update input + insert + feedUnificado select | Modify |
| `src/components/registros/registros-sections.ts` | **Pure** split into Pendências/Histórico + day-grouping | Create |
| `src/components/registros/registro-card.tsx` | Refined single-registro row (badge+icon, preview, autor, time, prazo) | Modify |
| `src/components/registros/registro-editor.tsx` | Add optional `prazo` field (diligência) → passes to `create` | Modify |
| `src/components/registros/registros-toolbar.tsx` | Search / tipo-filter / sort (3 header icons) | Create |
| `src/components/registros/registro-composer.tsx` | Collapsed "Adicionar registro…" bar → expands `RegistroEditor` | Create |
| `src/components/registros/registros-panel.tsx` | Orchestrator (`scope`+`variant`), composes the above | Create (from `registros-timeline.tsx`) |
| `src/components/registros/registros-timeline.tsx` | — | Delete after imports migrated |
| 5 surface files | Mount `RegistrosPanel` | Modify |

---

## Phase 0 — Data model

### Task 1: Add `registros.prazo` column

**Files:**
- Modify: `src/lib/db/schema/agenda.ts` (drizzle import line; `registros` table ~L196)

- [ ] **Step 1: Add `date` to the drizzle import**

In `src/lib/db/schema/agenda.ts`, the top import from `drizzle-orm/pg-core` currently lists `pgTable, serial, integer, varchar, text, timestamp, jsonb` (no `date`). Add `date`:

```ts
import { pgTable, serial, integer, varchar, text, timestamp, jsonb, date } from "drizzle-orm/pg-core";
```

- [ ] **Step 2: Add the `prazo` column** to the `registros` pgTable, right after `status` (~L196):

```ts
  status: varchar("status", { length: 20 }).default("agendado"),
  prazo: date("prazo"),   // ← deadline for diligências; null for ciência/anotação
```

- [ ] **Step 3: Generate the migration**

Run: `npm run db:generate`
Expected: a new `drizzle/00XX_*.sql` file containing `ALTER TABLE "registros" ADD COLUMN "prazo" date;`

- [ ] **Step 4: Verify the generated SQL** contains the ALTER and no destructive changes:

Run: `git status --porcelain drizzle/ && grep -rl 'ADD COLUMN "prazo"' drizzle/`
Expected: prints the new migration file path; the diff touches only `registros`.

- [ ] **Step 5: Apply to the database**

Run: `npm run db:push`
Expected: applies cleanly (additive, nullable — no data loss prompt). If push asks about truncation, STOP — the column is nullable so it should not.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: PASS (the `Registro`/`InsertRegistro` exported types now include `prazo: string | null`).

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/schema/agenda.ts drizzle/
git commit -m "feat(registros): add nullable prazo date column"
```

### Task 2: Thread `prazo` through the registros router

**Files:**
- Modify: `src/lib/trpc/routers/registros.ts` (create input ~L390, insert `.values` ~L417, `updateRegistroInput` ~L135, `feedUnificado` select ~L294)
- Test: `src/lib/trpc/routers/__tests__/registros-input.test.ts` (create)

- [ ] **Step 1: Write the failing test** for the create input schema accepting `prazo`:

```ts
// src/lib/trpc/routers/__tests__/registros-input.test.ts
import { describe, it, expect } from "vitest";
import { createRegistroInput } from "../registros";

describe("createRegistroInput", () => {
  it("accepts an optional prazo date string", () => {
    const parsed = createRegistroInput.parse({
      assistidoId: 1, tipo: "diligencia", conteudo: "x", prazo: "2026-07-11",
    });
    expect(parsed.prazo).toBe("2026-07-11");
  });
  it("defaults prazo to undefined when omitted", () => {
    const parsed = createRegistroInput.parse({ assistidoId: 1, tipo: "ciencia", conteudo: "x" });
    expect(parsed.prazo).toBeUndefined();
  });
});
```

> If the create input zod object is currently inline (not exported), first **extract it** to a named export `export const createRegistroInput = z.object({ ... })` and pass it to `.input(createRegistroInput)`. This is the DRY refactor that makes it testable.

- [ ] **Step 2: Run the test — verify it fails**

Run: `npx vitest run src/lib/trpc/routers/__tests__/registros-input.test.ts`
Expected: FAIL (`prazo` unknown / `createRegistroInput` not exported).

- [ ] **Step 3: Add `prazo` to the create input** (~L390, inside the create `z.object`):

```ts
  prazo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "prazo deve ser YYYY-MM-DD").optional(),
```

- [ ] **Step 4: Add `prazo` to the insert `.values({...})`** (~L417):

```ts
  prazo: input.prazo ?? null,
```

- [ ] **Step 5: Add `prazo` to `updateRegistroInput`** (~L135) and the corresponding update `.set({...})` so edits can change a deadline:

```ts
// in updateRegistroInput z.object:
  prazo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
// in the update .set (only when provided):
  ...(input.prazo !== undefined ? { prazo: input.prazo } : {}),
```

- [ ] **Step 6: Add `prazo` to the `feedUnificado` explicit select** (~L294-309) so the Assistido feed can show countdowns:

```ts
  prazo: registros.prazo,
```

(Confirm the second `.insert(registros)` at ~L610 — if it inserts user-authored registros, add `prazo: ... ?? null` there too; if it's an internal/system insert with no deadline concept, leave it.)

- [ ] **Step 7: Run the test — verify it passes**

Run: `npx vitest run src/lib/trpc/routers/__tests__/registros-input.test.ts`
Expected: PASS.

- [ ] **Step 8: Typecheck + commit**

```bash
npm run typecheck
git add src/lib/trpc/routers/registros.ts src/lib/trpc/routers/__tests__/registros-input.test.ts
git commit -m "feat(registros): accept prazo in create/update inputs and feed select"
```

---

## Phase 1 — Pure section logic

### Task 3: `splitRegistros` (Pendências / Histórico + day grouping)

**Files:**
- Create: `src/components/registros/registros-sections.ts`
- Test: `src/components/registros/__tests__/registros-sections.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/components/registros/__tests__/registros-sections.test.ts
import { describe, it, expect } from "vitest";
import { splitRegistros, type RegistroLike } from "../registros-sections";

const reg = (o: Partial<RegistroLike>): RegistroLike => ({
  id: 1, tipo: "anotacao", status: "realizado", prazo: null,
  dataRegistro: "2026-06-26T12:00:00Z", titulo: null, conteudo: "x", ...o,
});

describe("splitRegistros", () => {
  it("pins open diligências (status=agendado) as pendências, sorted by prazo asc, nulls last", () => {
    const r = splitRegistros([
      reg({ id: 1, tipo: "diligencia", status: "agendado", prazo: "2026-07-20" }),
      reg({ id: 2, tipo: "diligencia", status: "agendado", prazo: "2026-07-11" }),
      reg({ id: 3, tipo: "diligencia", status: "agendado", prazo: null }),
      reg({ id: 4, tipo: "ciencia", status: "realizado" }),
    ]);
    expect(r.pendencias.map((x) => x.id)).toEqual([2, 1, 3]);
  });
  it("excludes realizado diligências from pendências", () => {
    const r = splitRegistros([reg({ id: 9, tipo: "diligencia", status: "realizado", prazo: "2026-07-01" })]);
    expect(r.pendencias).toHaveLength(0);
    expect(r.historico).toHaveLength(1);
  });
  it("groups histórico by calendar day, newest day first", () => {
    const r = splitRegistros([
      reg({ id: 1, dataRegistro: "2026-06-29T09:00:00Z" }),
      reg({ id: 2, dataRegistro: "2026-06-26T09:00:00Z" }),
      reg({ id: 3, dataRegistro: "2026-06-29T15:00:00Z" }),
    ]);
    expect(r.historico.map((g) => g.dayKey)).toEqual(["2026-06-29", "2026-06-26"]);
    expect(r.historico[0].registros.map((x) => x.id)).toEqual([3, 1]); // newest first within day
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `npx vitest run src/components/registros/__tests__/registros-sections.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement the pure module**

```ts
// src/components/registros/registros-sections.ts
import type { TipoRegistro } from "./registro-tipo-config";

export type RegistroLike = {
  id: number;
  tipo: TipoRegistro | string;
  status: string | null;
  prazo: string | null;
  dataRegistro: string | Date;
  titulo: string | null;
  conteudo: string | null;
  [k: string]: unknown;
};

export type DayGroup<T extends RegistroLike> = { dayKey: string; registros: T[] };
export type SplitResult<T extends RegistroLike> = { pendencias: T[]; historico: DayGroup<T>[] };

const dayKeyOf = (d: string | Date): string => new Date(d).toISOString().slice(0, 10);
const ts = (d: string | Date): number => new Date(d).getTime();

/** A pendência is an open (status=agendado) diligência. */
export function isPendencia(r: RegistroLike): boolean {
  return r.tipo === "diligencia" && r.status === "agendado";
}

export function splitRegistros<T extends RegistroLike>(registros: T[]): SplitResult<T> {
  const pendencias: T[] = [];
  const historicoFlat: T[] = [];
  for (const r of registros) (isPendencia(r) ? pendencias : historicoFlat).push(r);

  pendencias.sort((a, b) => {
    if (a.prazo && b.prazo) return a.prazo.localeCompare(b.prazo); // asc
    if (a.prazo) return -1; // dated first
    if (b.prazo) return 1;
    return ts(b.dataRegistro) - ts(a.dataRegistro);
  });

  const byDay = new Map<string, T[]>();
  for (const r of historicoFlat) {
    const k = dayKeyOf(r.dataRegistro);
    (byDay.get(k) ?? byDay.set(k, []).get(k)!).push(r);
  }
  const historico: DayGroup<T>[] = [...byDay.entries()]
    .map(([dayKey, regs]) => ({ dayKey, registros: regs.sort((a, b) => ts(b.dataRegistro) - ts(a.dataRegistro)) }))
    .sort((a, b) => b.dayKey.localeCompare(a.dayKey)); // newest day first

  return { pendencias, historico };
}

/** "HOJE" / "ONTEM" / "26 JUN" label for a dayKey, relative to `now`. */
export function dayLabel(dayKey: string, now: Date = new Date()): string {
  const today = now.toISOString().slice(0, 10);
  const yest = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
  if (dayKey === today) return "HOJE";
  if (dayKey === yest) return "ONTEM";
  const [y, m, d] = dayKey.split("-");
  const meses = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
  return `${d} ${meses[Number(m) - 1]}${y !== today.slice(0, 4) ? " " + y : ""}`;
}
```

- [ ] **Step 4: Run — verify it passes**

Run: `npx vitest run src/components/registros/__tests__/registros-sections.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/registros/registros-sections.ts src/components/registros/__tests__/registros-sections.test.ts
git commit -m "feat(registros): pure splitRegistros (pendências/histórico) + day grouping"
```

---

## Phase 2 — Presentational units

### Task 4: Refine `RegistroCard`

**Files:**
- Modify: `src/components/registros/registro-card.tsx`
- Test: `src/components/registros/__tests__/registro-card.test.tsx` (create)

- [ ] **Step 1: Write the failing test** (DOM):

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RegistroCard } from "../registro-card";

afterEach(() => cleanup());

const base = {
  id: 1, tipo: "diligencia", status: "agendado", prazo: "2026-07-11",
  dataRegistro: "2026-06-29T12:00:00Z", titulo: "Resposta à Acusação",
  conteudo: "Defensoria nomeada. Confirmar termo inicial no PJe.",
  autor: { id: 1, name: "Rodrigo", email: "" },
};

describe("RegistroCard", () => {
  it("renders the tipo badge, title and a content preview", () => {
    render(<RegistroCard registro={base as any} />);
    expect(screen.getByText("Resposta à Acusação")).toBeInTheDocument();
    expect(screen.getByText(/Diligência/i)).toBeInTheDocument();
    expect(screen.getByText(/Defensoria nomeada/)).toBeInTheDocument();
  });
  it("shows a prazo badge when prazo is set", () => {
    render(<RegistroCard registro={base as any} showPrazo />);
    expect(screen.getByText(/11\/07/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `npx vitest run src/components/registros/__tests__/registro-card.test.tsx`
Expected: FAIL (props/markup mismatch or missing prazo badge).

- [ ] **Step 3: Update `RegistroCard`** to the refined anatomy. Keep the existing `onEdit`/`onDelete` hover actions; reuse `REGISTRO_TIPOS[tipo]` for `{ Icon, label, color, bg, text }`. Add an optional `showPrazo` prop that renders an amber prazo chip (`dd/MM`) when `registro.prazo` is set. Structure: `[tipo badge with <Icon/> + label] [title (truncate)] [relative time]` / 2-line clamped preview (`line-clamp-2`) / `[autor]`. Use existing relative-time/`date-fns` helpers already imported in the file (use the project's `safeFmt` for any date formatting — see memory note on date-fns throwing on invalid dates).

> Pure formatting helpers (`dd/MM` from a YYYY-MM-DD string, relative time) — if not already present, add small local functions guarded against invalid input. Do NOT call `date-fns` `format()` directly on possibly-invalid values.

- [ ] **Step 4: Run — verify it passes**

Run: `npx vitest run src/components/registros/__tests__/registro-card.test.tsx`
Expected: PASS.

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add src/components/registros/registro-card.tsx src/components/registros/__tests__/registro-card.test.tsx
git commit -m "feat(registros): refined RegistroCard with tipo badge, preview, optional prazo"
```

### Task 5: `RegistroEditor` — optional `prazo` field for diligências

**Files:**
- Modify: `src/components/registros/registro-editor.tsx`
- Test: `src/components/registros/__tests__/registro-editor.test.tsx` (extend existing)

- [ ] **Step 1: Add a failing test** to the existing file — when tipo is `diligencia`, a prazo control renders and its value is included in `create.mutate`. Follow the existing mock of `trpc.registros.create.useMutation` (capture the `mutate` spy and assert the payload).

```tsx
it("includes prazo in the create payload for a diligência", async () => {
  // arrange: render editor with tipoDefault="diligencia", set conteúdo, set prazo input to 2026-07-11, click Salvar
  // assert: mutateSpy called with objectContaining({ tipo: "diligencia", prazo: "2026-07-11" })
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `npx vitest run src/components/registros/__tests__/registro-editor.test.tsx -t "prazo"`
Expected: FAIL.

- [ ] **Step 3: Implement** — add `prazo` state (string `""`), render a date input (reuse the project's `InlineDatePicker` if ergonomic, else a native `<input type="date">`) shown only when `tipo === "diligencia"`. Include `prazo: prazo || undefined` in BOTH `create.mutate` call sites (the ⌘↵ handler and the Salvar button). No change to `onSuccess`.

- [ ] **Step 4: Run — verify it passes**

Run: `npx vitest run src/components/registros/__tests__/registro-editor.test.tsx`
Expected: PASS (existing tests + new one).

- [ ] **Step 5: Commit**

```bash
git add src/components/registros/registro-editor.tsx src/components/registros/__tests__/registro-editor.test.tsx
git commit -m "feat(registros): RegistroEditor prazo field for diligências"
```

### Task 6: `RegistrosToolbar` (search / tipo-filter / sort)

**Files:**
- Create: `src/components/registros/registros-toolbar.tsx`
- Test: `src/components/registros/__tests__/registros-toolbar.test.tsx` (create)

- [ ] **Step 1: Write the failing test** — renders 3 icon-buttons; typing in the expanded search calls `onSearchChange`; choosing a tipo calls `onTipoChange`; toggling sort calls `onSortChange`. (Mock nothing — this is a controlled presentational component; pass spies as props.)

- [ ] **Step 2: Run — verify it fails.**

Run: `npx vitest run src/components/registros/__tests__/registros-toolbar.test.tsx`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement** a controlled component:

```ts
type RegistrosToolbarProps = {
  busca: string; onBusca: (v: string) => void;
  filtroTipo: TipoRegistro | null; onFiltroTipo: (t: TipoRegistro | null) => void;
  tiposComContagem: { tipo: TipoRegistro; count: number }[];
  ordem: "recente" | "antigo"; onOrdem: (o: "recente" | "antigo") => void;
};
```

Lucide `Search`, `ListFilter`, `ArrowDownUp` icon-buttons. Search expands an inline input (port the `searchExpanded` + `data-registros-search-trigger` behavior from `registros-timeline.tsx`). Tipo filter is a dropdown listing `tiposComContagem` (+ "Todos"). Sort toggles `recente`/`antigo`. No data fetching here.

- [ ] **Step 4: Run — verify it passes.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/registros/registros-toolbar.tsx src/components/registros/__tests__/registros-toolbar.test.tsx
git commit -m "feat(registros): extract controlled RegistrosToolbar"
```

### Task 7: `RegistroComposer` (collapsed → expanded)

**Files:**
- Create: `src/components/registros/registro-composer.tsx`
- Test: `src/components/registros/__tests__/registro-composer.test.tsx` (create)

- [ ] **Step 1: Write the failing test** — initially shows the collapsed "Adicionar registro…" bar (Lucide `Pencil`); clicking it reveals the `RegistroEditor` (assert an editor-only control appears, e.g. the Salvar button); the collapsed bar exposes an optional "Abrir autos" affordance when `onAbrirAutos` is provided. Mock `trpc` like the editor test.

- [ ] **Step 2: Run — verify it fails.** Expected: FAIL.

- [ ] **Step 3: Implement** — `RegistroComposer` holds `open` state. Collapsed: a button row (`Pencil` + "Adicionar registro…", plus an optional `Paperclip` "Abrir autos" calling `onAbrirAutos`). Expanded: render the existing `RegistroEditor` with the passed scope/tipo props; `onSaved`/`onCancel` collapse it (and bubble up). Props:

```ts
type RegistroComposerProps = {
  scope: { assistidoId: number; processoId?: number; demandaId?: number; audienciaId?: number };
  tipoDefault?: TipoRegistro;
  tiposPrimarios?: TipoRegistro[];
  onAbrirAutos?: () => void;   // opens RegistroComAutosDialog at the surface level
  onSaved?: () => void;
};
```

- [ ] **Step 4: Run — verify it passes.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/registros/registro-composer.tsx src/components/registros/__tests__/registro-composer.test.tsx
git commit -m "feat(registros): RegistroComposer (collapsed bar → inline editor)"
```

---

## Phase 3 — Assemble the panel

### Task 8: `RegistrosPanel` (orchestrator) — refactor from `registros-timeline.tsx`

**Files:**
- Create: `src/components/registros/registros-panel.tsx` (built from `registros-timeline.tsx`)
- Test: `src/components/registros/__tests__/registros-panel.test.tsx` (create)

- [ ] **Step 1: Write the failing test** — given a mocked `trpc.registros.list` returning one open diligência (prazo set) + one ciência on different days, the panel renders a **PENDÊNCIAS** section containing the diligência and a **HISTÓRICO** section with a day label; the composer bar is present; the empty case renders the empty-state copy + quick actions. Mock `trpc.registros.list.useQuery` to return the fixtures; mock `useUtils`.

- [ ] **Step 2: Run — verify it fails.** Expected: FAIL (module missing).

- [ ] **Step 3: Implement `RegistrosPanel`** by moving `registros-timeline.tsx`'s data layer in and composing the new units:

```ts
type RegistrosScope = { assistidoId?: number; processoId?: number; demandaId?: number; audienciaId?: number };
type RegistrosPanelProps = {
  scope: RegistrosScope;                       // ≥1 id
  variant?: "drawer" | "page" | "tab";
  tiposPermitidos?: TipoRegistro[];
  tipoDefault?: TipoRegistro;
  tiposPrimarios?: TipoRegistro[];
  emptyHint?: string;
  quickActions?: { agendarAudiencia?: () => void; adicionarPrazo?: () => void };
  onAbrirAutos?: () => void;
};
```

Behavior:
- Keep the two `trpc.registros.list.useQuery` calls (filtered + unfiltered-for-counts) but key them off `scope` (spread `scope` into the input). Preserve the existing client-side text filter and the `counts` computation.
- Header: `REGISTROS · N` + `<RegistrosToolbar>` (wire `busca`, `filtroTipo`, `tiposComContagem`, `ordem`).
- Body: `<RegistroComposer scope={{assistidoId, ...scope}} tipoDefault tiposPrimarios onAbrirAutos onSaved={refetch}/>`, then `splitRegistros(registros)` →
  - **Pendências** section (amber, count) of `<RegistroCard showPrazo .../>` — only when `pendencias.length`.
  - **Histórico** section: for each `DayGroup`, a `dayLabel(group.dayKey)` header + spine of `<RegistroCard/>`.
  - Empty state (no registros at all): icon + `emptyHint` + quick-action buttons from `quickActions`.
- `assistidoId` is required for the composer; if `scope.assistidoId` is absent (e.g. processo-only mount), hide the composer and show a read-only timeline (guard).
- Inline edit/delete behavior carries over from `registros-timeline.tsx` (`editandoId`, `updateMut`, `deleteMut`).

- [ ] **Step 4: Run — verify it passes.** Expected: PASS.

- [ ] **Step 5: Delete `registros-timeline.tsx`** only AFTER all imports are migrated (Tasks 9-11). For now keep it; add a TODO comment at its top: `// DEPRECATED: superseded by registros-panel.tsx — remove once all surfaces migrated (Task 11)`.

- [ ] **Step 6: Typecheck + commit**

```bash
npm run typecheck
git add src/components/registros/registros-panel.tsx src/components/registros/__tests__/registros-panel.test.tsx src/components/registros/registros-timeline.tsx
git commit -m "feat(registros): RegistrosPanel orchestrator (composer + toolbar + sections)"
```

---

## Phase 4 — Wire the 5 surfaces

> After each surface, run `npm run typecheck` and a quick manual smoke (the dev server must use Turbopack — see project memory; `npm run dev`).

### Task 9: Demanda drawer (`DemandaQuickPreview.tsx`)

**Files:**
- Modify: `src/components/demandas-premium/DemandaQuickPreview.tsx` (registros tab body L938-1009; keep `RegistroComAutosDialog` mount L1874-1896)

- [ ] **Step 1:** Replace the registros tab body (the `+ Adicionar` row + inline `RegistroEditor` + `RegistrosTimeline`) with a single panel:

```tsx
<RegistrosPanel
  scope={{ assistidoId: demanda.assistidoId, processoId: demanda.processoId ?? undefined, demandaId: Number(demanda.id) }}
  variant="drawer"
  tipoDefault="ciencia"
  tiposPrimarios={["ciencia","providencia","diligencia","atendimento","delegacao","anotacao","peticao"]}
  emptyHint="Sem registros nesta demanda."
  onAbrirAutos={previewFiles.length > 0 ? () => setRegistroComAutosOpen(true) : undefined}
  quickActions={{
    agendarAudiencia: onAgendarAudiencia ? () => onAgendarAudiencia(demanda.id) : undefined,
    adicionarPrazo: () => (document.querySelector(`[data-prazo-trigger='${demanda.id}'] button[data-edit-trigger]`) as HTMLButtonElement | null)?.click(),
  }}
/>
```

- [ ] **Step 2:** Remove now-dead local state/handlers (`novoRegistroOpen` and its toggles) if no longer referenced. Keep `registroComAutosOpen`/`setRegistroComAutosOpen` and the `RegistroComAutosDialog` mount (now opened via `onAbrirAutos`). Keep the footer quick-action buttons OR drop them in favor of the panel's empty-state actions — **keep them** (they're useful when registros exist too).
- [ ] **Step 3:** Remove the `RegistroEditor` import if unused; remove the `RegistrosTimeline` import.
- [ ] **Step 4: Typecheck + manual smoke** — open a demanda drawer: empty state shows composer + "Agendar audiência"/"Adicionar prazo"; add a Ciência that designates an audiência → confirm the audiência still auto-schedules (side-effect preserved); "Abrir autos" opens the split dialog.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/demandas-premium/DemandaQuickPreview.tsx
git commit -m "feat(registros): wire RegistrosPanel into demanda drawer"
```

### Task 10: Processo, Atendimento, Audiência

**Files:**
- Modify: `src/components/processo/sheet/processo-sheet.tsx:89`
- Modify: `src/components/atendimentos/atendimento-detail-sheet.tsx` (L491-514)
- Modify: `src/components/agenda/registro-audiencia/tabs/tab-anotacoes.tsx` (L142-151)

- [ ] **Step 1 — Processo sheet:** replace `<RegistrosTimeline processoId={processoId} />` with `<RegistrosPanel scope={{ processoId }} variant="page" />`. (No `assistidoId` → composer hidden by the guard; read-only timeline. If the sheet has `assistidoId` in scope, pass it to enable the composer.)
- [ ] **Step 2 — Atendimento sheet:** replace the `RegistroEditor` + `RegistrosTimeline` pair (L491-514) with `<RegistrosPanel scope={{ assistidoId: a.assistidoId, processoId: a.processoId ?? undefined }} variant="tab" tipoDefault="anotacao" tiposPrimarios={["anotacao","providencia","diligencia","peticao"]} emptyHint="Sem registros para este assistido ainda." />`. Remove the now-redundant local `novoRegistro` toggle + its button.
- [ ] **Step 3 — Audiência tab:** replace `<NovoRegistroButton .../>` + `<RegistrosTimeline audienciaId .../>` (L142-151) with `<RegistrosPanel scope={{ audienciaId, assistidoId }} variant="tab" tipoDefault="anotacao" tiposPermitidos={...existing...} emptyHint="Sem registros nesta audiência." />` (composer shows only when `assistidoId` present, matching current behavior).
- [ ] **Step 4: Typecheck + smoke each surface.**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/processo/sheet/processo-sheet.tsx src/components/atendimentos/atendimento-detail-sheet.tsx src/components/agenda/registro-audiencia/tabs/tab-anotacoes.tsx
git commit -m "feat(registros): wire RegistrosPanel into processo/atendimento/audiência"
```

### Task 11: Assistido feed reskin + remove `registros-timeline.tsx`

**Files:**
- Modify: `src/components/registros/feed-por-caso.tsx` and/or `src/components/registros/feed-unificado.tsx` (adopt `RegistroCard`)
- Delete: `src/components/registros/registros-timeline.tsx`
- Modify: any remaining importers of `RegistrosTimeline`

- [ ] **Step 1:** In `FeedPorCaso`/`FeedUnificado`, replace bespoke row markup with `<RegistroCard>` for `tipo`-bearing entries (registros), keeping the multi-source merge (registros + demandaEventos + audiências) and the per-caso grouping. Audiência/evento rows keep their own small renderers but adopt the same badge/spacing tokens for visual parity. Optionally surface the new `prazo` (now selected in `feedUnificado`) as a `showPrazo` chip.
- [ ] **Step 2:** Grep for stragglers: `grep -rl "registros-timeline\|RegistrosTimeline" src` — migrate each to `RegistrosPanel`. Expected after migration: no matches outside the deleted file.
- [ ] **Step 3:** Delete `src/components/registros/registros-timeline.tsx`.
- [ ] **Step 4: Run the full registros test suite + typecheck**

Run: `npx vitest run src/components/registros && npm run typecheck`
Expected: PASS; no unresolved imports.

- [ ] **Step 5: Commit**

```bash
git add -A src/components/registros src/app/\(dashboard\)/admin/assistidos
git commit -m "feat(registros): reskin assistido feed to RegistroCard; remove registros-timeline"
```

---

## Phase 5 — Verification

### Task 12: Full verification sweep

- [ ] **Step 1: Typecheck + lint + full test run**

Run: `npm run typecheck && npm run lint && npx vitest run`
Expected: all PASS (note pre-existing `CI_QUARANTINE` exclusions only apply when `CI` is set).

- [ ] **Step 2: Manual cross-surface checklist** (dev server on Turbopack: `npm run dev`):
  - [ ] Demanda drawer: empty → composer + quick actions; add Ciência w/ audiência designation → audiência auto-schedules; add Diligência w/ prazo → appears pinned in **Pendências** with countdown; "Abrir autos" split view works.
  - [ ] Processo detail: read-only timeline renders (or composer if assistido in scope).
  - [ ] Atendimento sheet: composer + timeline render; create invalidates list.
  - [ ] Audiência tab: composer appears only with assistido; registro saved against `audienciaId`.
  - [ ] Assistido "Linha do tempo": `FeedPorCaso` renders unified entries with the new card look; prazo chip shows on open diligências.
- [ ] **Step 3: Confirm side-effects intact** — verify (DB or toast) that a `ciencia` create still triggers `detectarDesignacaoAudiencia` and Sheets sync (unchanged `registros.create` path).
- [ ] **Step 4: Final commit (if any cleanup)**

```bash
git add -A && git commit -m "chore(registros): verification cleanup" || echo "nothing to commit"
```

---

## Notes & Risks

- **Side-effects are sacred:** all creation flows go through `registros.create` (never raw insert) so audiência auto-schedule / MPU-cautelar parsing / Sheets sync keep working. The composer reuses `RegistroEditor`, which already calls `create`.
- **`prazo` vs `demanda.prazo`:** the new `registros.prazo` is per-registro (powers Pendências countdowns) and is **distinct** from the existing `demanda.prazo` chip in the drawer — do not conflate them.
- **Date safety:** never call `date-fns` `format()` on possibly-invalid dates (project memory: it throws). Use guarded helpers / `safeFmt`.
- **Turbopack dev only** for manual testing (project memory: webpack dev crashes the PDF viewer / cross-route `[id]` imports).
- **Out of scope (separate plan):** the catch-22 where demandas already in `2_ATENDER` never get a registro (the Moabe/Fábio gap).
```
