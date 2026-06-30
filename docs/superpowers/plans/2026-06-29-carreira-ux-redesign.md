# Carreira UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Bring the carreira screens to the `assistido-card` exemplar standard via shared primitives — presentational/a11y only, no behavior/schema/router change.

**Architecture:** 5 new shared components under `src/components/carreira/`, then each carreira view swaps its local `Kpi`/`inputCls`/`window.confirm`/ad-hoc cards for the primitives.

**Tech Stack:** Next.js 15, React, Tailwind, shadcn/ui, vitest + testing-library.

**Design doc:** `docs/superpowers/specs/2026-06-29-carreira-ux-redesign-design.md` (read it).

## Global Constraints

- Card shell = `assistido-card` verbatim: `bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-lg shadow-sm transition-all duration-200`; interactive adds `hover:shadow-md hover:-translate-y-0.5 cursor-pointer` + `FOCUS_RING`; selected adds `ring-2 ring-emerald-400/50 dark:ring-emerald-500/40 border-emerald-300 dark:border-emerald-700`.
- `FOCUS_RING` = `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40` (import from `@/lib/config/design-tokens`).
- Forms use shadcn `@/components/ui/{input,select,textarea,label}`; never raw `inputCls`.
- Destructive actions use `ConfirmDeleteButton` (Radix `AlertDialog`); never `window.confirm`.
- Reuse tokens (`TYPO`, `CARD_STYLE`, `GLASS`, `TAB_STYLE_V3`, `HEADER_STYLE`, `COLORS`). No new tokens, no new aesthetic.
- Every screen keeps its current queries, KPIs, fields, and lifecycle behavior — only presentation/a11y changes.
- `dark:` on every surface; dividers `divide-neutral-100 dark:divide-neutral-800`.
- `npx tsc --noEmit` clean for touched files; existing carreira tests stay green.

---

### Task 1: Shared primitives + tests

**Files:**
- Create: `src/components/carreira/kpi-chip.tsx`, `carreira-card.tsx`, `carreira-field.tsx`, `carreira-list-skeleton.tsx`, `confirm-delete-button.tsx`, `index.ts`
- Test: `src/components/carreira/__tests__/primitives.test.tsx`

**Interfaces (Produces):** `KpiChip`, `CarreiraCard`, `CarreiraField`, `CarreiraListSkeleton`, `ConfirmDeleteButton` — barrel-exported from `@/components/carreira`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/carreira/__tests__/primitives.test.tsx
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { KpiChip, CarreiraCard, CarreiraField, CarreiraListSkeleton, ConfirmDeleteButton } from "@/components/carreira";
import { Plane } from "lucide-react";

afterEach(cleanup);

describe("KpiChip", () => {
  it("renders value + label, works without icon", () => {
    render(<KpiChip label="Pendentes" value={3} />);
    expect(screen.getByText("Pendentes")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
  it("renders an icon when given", () => {
    const { container } = render(<KpiChip icon={Plane} label="Férias" value="2" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});

describe("CarreiraCard", () => {
  it("applies the accent pinstripe class when accent given", () => {
    const { container } = render(<CarreiraCard accent="ausencias">x</CarreiraCard>);
    expect(container.querySelector("span.absolute.inset-x-0.top-0")).toBeTruthy();
  });
  it("calls onClick and is focusable when interactive", () => {
    const fn = vi.fn();
    render(<CarreiraCard onClick={fn}>hit</CarreiraCard>);
    fireEvent.click(screen.getByText("hit"));
    expect(fn).toHaveBeenCalledOnce();
  });
  it("applies selected ring", () => {
    const { container } = render(<CarreiraCard selected>s</CarreiraCard>);
    expect(container.firstChild).toHaveClass("ring-2");
  });
});

describe("CarreiraField", () => {
  it("renders its label and children", () => {
    render(<CarreiraField label="Destino"><input aria-label="destino-input" /></CarreiraField>);
    expect(screen.getByText("Destino")).toBeInTheDocument();
    expect(screen.getByLabelText("destino-input")).toBeInTheDocument();
  });
});

describe("CarreiraListSkeleton", () => {
  it("renders N rows with aria-busy", () => {
    const { container } = render(<CarreiraListSkeleton rows={4} />);
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-skeleton-row]').length).toBe(4);
  });
});

describe("ConfirmDeleteButton", () => {
  it("opens dialog and fires onConfirm only on confirm", async () => {
    const fn = vi.fn();
    render(<ConfirmDeleteButton onConfirm={fn} title="Excluir?" />);
    fireEvent.click(screen.getByRole("button", { name: /excluir/i }));
    const confirm = await screen.findByRole("button", { name: /^Excluir$/ });
    fireEvent.click(confirm);
    expect(fn).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run it (FAIL — modules missing)**

`npx vitest run src/components/carreira/__tests__/primitives.test.tsx` → FAIL.

- [ ] **Step 3: Write the primitives**

`kpi-chip.tsx`:
```tsx
import type React from "react";
export function KpiChip({ icon: Icon, label, value }: { icon?: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg bg-white/[0.08] px-3 py-1.5">
      {Icon ? <Icon className="h-4 w-4 shrink-0 text-white/70" /> : null}
      <div className="min-w-0 leading-tight">
        <div className="truncate text-sm font-semibold text-white">{value}</div>
        <div className="truncate text-[11px] text-white/60">{label}</div>
      </div>
    </div>
  );
}
```

`carreira-card.tsx`:
```tsx
import type React from "react";
import { cn } from "@/lib/utils";
import { FOCUS_RING } from "@/lib/config/design-tokens";

const ACCENT: Record<string, string> = {
  ausencias: "from-amber-400 to-amber-500",
  contraprestacao: "from-emerald-400 to-emerald-500",
  progressao: "from-blue-400 to-blue-500",
  administrativo: "from-violet-400 to-violet-500",
  neutral: "from-neutral-300 to-neutral-400",
};

export function CarreiraCard({ accent, selected, onClick, className, children }: {
  accent?: keyof typeof ACCENT; selected?: boolean; onClick?: () => void; className?: string; children: React.ReactNode;
}) {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick!(); } } : undefined}
      className={cn(
        "relative bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-lg shadow-sm transition-all duration-200",
        interactive && "cursor-pointer hover:shadow-md hover:-translate-y-0.5 " + FOCUS_RING,
        selected && "ring-2 ring-emerald-400/50 dark:ring-emerald-500/40 border-emerald-300 dark:border-emerald-700",
        className,
      )}
    >
      {accent ? <span className={cn("absolute inset-x-0 top-0 h-0.5 rounded-t-lg bg-gradient-to-r", ACCENT[accent])} /> : null}
      {children}
    </div>
  );
}
```

`carreira-field.tsx`:
```tsx
import type React from "react";
import { cn } from "@/lib/utils";
export function CarreiraField({ label, htmlFor, className, children }: { label: string; htmlFor?: string; className?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</span>
      {children}
    </label>
  );
}
```

`carreira-list-skeleton.tsx`:
```tsx
import { Skeleton } from "@/components/ui/skeleton";
export function CarreiraListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando" className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} data-skeleton-row className="rounded-lg border border-neutral-200/80 dark:border-neutral-800/80 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

`confirm-delete-button.tsx`:
```tsx
import type React from "react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ConfirmDeleteButton({ onConfirm, title = "Excluir?", description, trigger, confirmLabel = "Excluir" }: {
  onConfirm: () => void; title?: string; description?: string; trigger?: React.ReactNode; confirmLabel?: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <button type="button" aria-label="Excluir" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-rose-600 hover:bg-rose-700">{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

`index.ts`:
```ts
export { KpiChip } from "./kpi-chip";
export { CarreiraCard } from "./carreira-card";
export { CarreiraField } from "./carreira-field";
export { CarreiraListSkeleton } from "./carreira-list-skeleton";
export { ConfirmDeleteButton } from "./confirm-delete-button";
```

Before writing, confirm `@/components/ui/skeleton` and `@/components/ui/alert-dialog` export the names used (read them); if an export differs, match it. Confirm `FOCUS_RING` is exported from design-tokens (it is).

- [ ] **Step 4: Run tests (PASS)** — `npx vitest run src/components/carreira/__tests__/primitives.test.tsx`. Then `npx tsc --noEmit` clean for these files.

- [ ] **Step 5: Commit** — `git add src/components/carreira && git commit -m "feat(carreira-ux): shared primitives (KpiChip, CarreiraCard, CarreiraField, CarreiraListSkeleton, ConfirmDeleteButton)"`

---

### Task 2: Férias view — reference application

**Files:** Modify `src/app/(dashboard)/admin/ferias/_components/ferias-view.tsx`
**Interfaces (Consumes):** all 5 primitives from `@/components/carreira`.

- [ ] **Step 1: Read** the current `ferias-view.tsx` fully and the design doc §5 Férias row.
- [ ] **Step 2: Apply the swaps** (behavior unchanged):
  1. Delete the local `function Kpi(...)` (lines ~14-24) and the `inputCls` const; import `{ KpiChip, CarreiraCard, CarreiraField, CarreiraListSkeleton, ConfirmDeleteButton }` from `@/components/carreira`. Replace `<Kpi .../>` usages with `<KpiChip .../>`.
  2. Header: pass `collapsedStats={<>…the KPIs…</>}` to `CollapsiblePageHeader` (mirror how the main demandas/dashboard header populates it — read `admin/demandas` if unsure).
  3. Forms: replace each raw `<input className={inputCls}>`/`<select className={inputCls}>` with shadcn `<Input>`/`<Select>` (`@/components/ui/input`,`/select`) wrapped in `<CarreiraField label=...>`. Keep the same fields, names, state bindings, and onChange handlers. Make the form container responsive: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3` instead of `flex flex-wrap`.
  4. Parcela rows: wrap each row in `<CarreiraCard accent="ausencias">` (férias is the ausências cluster), keep the inner content (name, meta, StatusChip, transition Buttons). Replace the abono/suspensa hand-made pills with `<StatusChip size="xs" info={{ label, badge, dot }} />` (or the existing `Tag` DS component) — keep the same label text.
  5. Loading: replace the `<p>Carregando…</p>` with `<CarreiraListSkeleton rows={3} />` (gate on `isLoading`).
  6. Delete period: replace the `window.confirm(...)` + button with `<ConfirmDeleteButton onConfirm={() => removerPeriodo.mutate({ id })} title="Excluir período?" description="Exclui o período e todas as parcelas." />`. Same for parcela delete.
  7. Progress bar: add `role="progressbar"` + `aria-valuenow`/`aria-valuemin={0}`/`aria-valuemax={100}` + `aria-label`; track → `bg-neutral-100 dark:bg-neutral-800`.
  8. Dividers: `divide-neutral-100` → add `dark:divide-neutral-800`.
  9. `EmptyState`: add a `description` prop (short guidance).
- [ ] **Step 3: Verify** — `npx tsc --noEmit` clean for the file; `npx vitest run src/lib/ferias` still green; manual note: dev renders. No logic/query change.
- [ ] **Step 4: Commit** — `feat(carreira-ux): férias view → exemplar primitives (KpiChip, CarreiraCard, DS forms, skeleton, AlertDialog)`

---

### Task 3: Diárias view

**Files:** Modify `src/app/(dashboard)/admin/diarias/_components/diarias-view.tsx`

- [ ] Apply the **same treatment as Task 2** (read this file fully first). Cluster accent = `contraprestacao`. Specifics: currency KPI values rely on `KpiChip`'s `min-w-0 truncate` (fixes overflow). `quantidade` field stays `multipleOf 0.5`. Delete via `ConfirmDeleteButton`. The list already had `dark:divide-neutral-800` — keep. Commit: `feat(carreira-ux): diárias view → exemplar primitives`.

---

### Task 4: Ausências view

**Files:** Modify `src/app/(dashboard)/admin/ausencias/_components/ausencias-view.tsx`

- [ ] Same treatment (read fully first). Cluster accent = `ausencias`. Replace the local `Kpi`, `inputCls`, and the `window.confirm` at ~line 379. Keep the SIGA-field display (numeroSolicitacao/nSiga/situacaoSiga) and the tipo filter a11y (`aria-pressed`). Commit: `feat(carreira-ux): ausências view → exemplar primitives`.

---

### Task 5: Pedidos Administrativos view

**Files:** Modify `src/app/(dashboard)/admin/pedidos-administrativos/_components/pedidos-view.tsx`

- [ ] Same treatment (read fully first). Cluster accent = `administrativo`. This also resolves the carried-forward review minors: `inputCls` gets the focus-ring (now via DS `Input`), shared KpiChip. Keep the per-card mutation-error scoping (`.variables?.id === p.id`). Delete via `ConfirmDeleteButton`. Commit: `feat(carreira-ux): pedidos-adm view → exemplar primitives`.

---

### Task 6: SIGA-import view

**Files:** Modify `src/app/(dashboard)/admin/siga-import/_components/siga-import-view.tsx`

- [ ] Read fully. Replace the no-icon local `Kpi` with `<KpiChip label value />` (no icon — supported). Staging rows → `<CarreiraCard selected={row.selected} onClick={toggle}>` for the review selection. Skeleton on load. Full dark-mode. Keep the extract/confirm mutations and decisão badges. Commit: `feat(carreira-ux): siga-import view → exemplar shell`.

---

### Task 7: Carreira Hub (cockpit + cobertura-rollup)

**Files:** Modify `src/app/(dashboard)/admin/carreira/_components/carreira-cockpit.tsx`, `cobertura-rollup-view.tsx`

- [ ] Read both fully. Replace both local `Kpi` copies with `KpiChip`; add `collapsedStats` to the header. **Full dark-mode pass** (these have zero `dark:` today): every surface gets dark variants; `divide-neutral-100 → dark:divide-neutral-800`. Cluster cards in the cockpit → `<CarreiraCard accent={clusterKey}>`. The "Por defensor" `<table>` in rollup → wrap in `<div className="overflow-x-auto">`. Loading → `CarreiraListSkeleton`. `EmptyState` gains `description`. Keep all aggregation logic and the role-split. Commit: `feat(carreira-ux): hub cockpit + cobertura rollup → primitives + dark-mode + skeletons`.

---

### Task 8: Vida Funcional view + domínio

**Files:** Modify `src/app/(dashboard)/admin/carreira/vida-funcional/_components/vida-funcional-view.tsx`, `carreira/vida-funcional/[dominio]/page.tsx`

- [ ] Read both fully. In `vida-funcional-view`: tab bar → `TAB_STYLE_V3.{bar,item,active}` tokens; radar + bento cluster cards → `<CarreiraCard accent={clusterKey}>`; bento "0" gets a small "Adicionar" affordance via `EmptyState size="sm"`; the "Produtividade" placeholder → `<EmptyState icon={BarChart2} title="Em breve" description="…"/>`. In `[dominio]/page.tsx`: accordion rows → `CarreiraCard`; add `aria-label` to the Pencil/Trash2 icon buttons; **keep the existing inline `AlertDialog`** (lines ~105-113). No change to queries/projection. Commit: `feat(carreira-ux): vida-funcional view + domínio → primitives, TAB_STYLE_V3, a11y`.

---

### Task 9: Manual smoke + final pass

- [ ] `npx tsc --noEmit` clean overall (touched files); `npx vitest run src/components/carreira src/lib/{ferias,diarias,ausencias,pedidos-administrativos}` green.
- [ ] `npm run dev:turbo`; visit `/admin/carreira`, `/admin/carreira/vida-funcional`, `/admin/ferias`, `/admin/diarias`, `/admin/ausencias`, `/admin/pedidos-administrativos`, `/admin/siga-import`. Confirm: renders, dark-mode toggles cleanly, delete dialogs open (no native confirm), skeletons show on load, forms have focus rings, KPI chips don't overflow.

---

## Self-Review

**Spec coverage:** primitives §4 → Task 1; per-screen §5 → Tasks 2–8 (all 9 files: ferias, diarias, ausencias, pedidos, siga-import, cockpit, rollup, vida-funcional-view, [dominio]); testing §7 → Task 1 + per-task verify + Task 9. ✓ No schema/router/logic change. ✓ progressoes excluded. ✓
**Placeholder scan:** Task 1 has full code; screen tasks are concrete swap-lists over existing files (the "match an existing pattern" style). No TBDs.
**Type consistency:** the 5 primitive names/signatures in Task 1 match their usage in Tasks 2–8; `accent` keys (ausencias/contraprestacao/progressao/administrativo) match the cluster keys; `KpiChip.icon` optional (siga-import). 
