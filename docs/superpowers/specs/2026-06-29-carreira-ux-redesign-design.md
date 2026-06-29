# Carreira UX — Exemplar Redesign

**Date:** 2026-06-29
**Status:** Design (pending review)
**Scope:** Bring the carreira/vida-funcional screens up to the OMBUDS "exemplar" standard (demandas-premium / assistidos), and kill the duplicated/anti-pattern UI code. Presentational + a11y refactor — **no behavior/logic/data-model change**.

---

## 1. Problem & Goal

The carreira modules (Hub cockpit, cobertura-rollup, vida-funcional + `[dominio]`, Férias, Diárias, Ausências, Pedidos-Adm, SIGA-import) work but lag the app's best screens. Systemic gaps (confirmed by audit):
- A header KPI chip helper copy-pasted **4×** (`carreira-cockpit`, `cobertura-rollup-view`, `ferias-view`, `diarias-view`).
- The `inputCls` raw-`<input>` anti-pattern (no focus ring, bypasses shadcn `Input`/`Select`, bare `rounded`) in `ferias-view`/`diarias-view` (and the newer ausências/pedidos views mirror it).
- `window.confirm()` for destructive actions (férias/diárias) instead of Radix `AlertDialog`.
- Zero `dark:` coverage in the Hub cockpit/rollup; `divide-neutral-100` invisible in dark mode.
- No loading skeletons (plain "Carregando…"); no `collapsedStats` on any header; inline abono/suspensa pills bypass `StatusChip`; `EmptyState` never uses `description`; progress bar without a11y; bento "0" with no CTA; non-responsive table/forms.

**Goal:** adopt the existing exemplar patterns (no new aesthetic invented) and consolidate into shared carreira primitives, so all carreira screens look and behave like `DemandaCard`/`assistido-card`.

**Exemplars (the target look, already in the app):** `src/components/demandas-premium/DemandaCard.tsx` + `admin/demandas` header; `admin/assistidos/_components/assistido-card.tsx`.

---

## 2. Scope (YAGNI)

**In:** new shared carreira UI primitives; apply them across the 9 carreira view files; a11y (focus rings, aria-labels, AlertDialog); full dark-mode; loading skeletons; richer empty states; responsive forms/tables; `collapsedStats` in headers.

**Out (explicit):** no change to routers, schema, tRPC inputs, lifecycle logic, or projection. No new data. No new routes. The SIGA scrape and Drive seeding are a **separate data-population track** (handled outside this redesign). No redesign of non-carreira screens.

---

## 3. Constraints (from existing code)

- Reuse `src/lib/config/design-tokens.ts` tokens verbatim: `TYPO`, `CARD_STYLE`, `GLASS`, `LIST_ITEM`, `TAB_STYLE_V3`, `HEADER_STYLE`, `COLORS`, `FOCUS_RING` (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40`).
- Card shell must match the exemplar exactly: `rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200/70 dark:ring-neutral-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`, optional top accent pinstripe (`absolute inset-x-0 top-0 h-0.5`), optional selected ring (`ring-2 ring-emerald-400/50 dark:ring-emerald-500/40`).
- Forms use shadcn `Input`/`Select`/`Textarea` from `@/components/ui/*` + `Label`, never raw `inputCls`.
- Destructive actions use Radix `AlertDialog` (the `[dominio]` page already does — copy that), never `window.confirm`.
- Palette per `RULES.md §5`: emerald/zinc; semantic cluster accents only (no decorative blue/rose/amber).
- Each screen keeps its current data flow, KPIs, and behavior — only presentation/a11y changes.

---

## 4. Shared primitives (new — `src/components/carreira/`)

### `KpiChip` (`kpi-chip.tsx`)
Extracts the 4× duplicated header chip. Exactly the current markup, hardened:
```tsx
// charcoal-header KPI chip (lives inside CollapsiblePageHeader children)
export function KpiChip({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg bg-white/[0.08] px-3 py-1.5">
      <Icon className="h-4 w-4 shrink-0 text-white/70" />
      <div className="min-w-0 leading-tight">
        <div className="truncate text-sm font-semibold text-white">{value}</div>
        <div className="truncate text-[11px] text-white/60">{label}</div>
      </div>
    </div>
  );
}
```
Replaces the 4 local `Kpi` copies (fixes the currency-overflow gap via `min-w-0 truncate`).

### `CarreiraCard` (`carreira-card.tsx`)
The exemplar card shell + optional accent + selected state.
```tsx
const ACCENT: Record<string, string> = {
  ausencias: "from-amber-400 to-amber-500",
  contraprestacao: "from-emerald-400 to-emerald-500",
  progressao: "from-blue-400 to-blue-500",
  administrativo: "from-violet-400 to-violet-500",
  neutral: "from-neutral-300 to-neutral-400",
};
export function CarreiraCard({ accent, selected, onClick, className, children }: {
  accent?: keyof typeof ACCENT; selected?: boolean; onClick?: () => void; className?: string; children: React.ReactNode;
}) { /* relative rounded-xl bg-white dark:bg-neutral-900 ring-1 ... hover:-translate-y-0.5 ...; accent pinstripe; selected ring; FOCUS_RING when onClick */ }
```

### `CarreiraField` (`carreira-field.tsx`)
Label + control wrapper replacing `inputCls`. `flex flex-col gap-1`, label = `TYPO.label`-style, control = shadcn `Input`/`Select`/`Textarea` (already carry `FOCUS_RING`). Exposes `<CarreiraField label>` wrapping `children`, plus thin re-exports so screens pass `<Input>`/`<Select>` children. (Keeps the same field set/labels each form already has.)

### `CarreiraListSkeleton` (`carreira-list-skeleton.tsx`)
Mirrors `CarreiraCard` anatomy with shadcn `Skeleton` (`rows` prop, default 3), `aria-busy`, `aria-label`.

### `ConfirmDeleteButton` (`confirm-delete-button.tsx`)
Radix `AlertDialog` wrapper: `{ onConfirm, title, description?, trigger? }` → replaces `window.confirm`. Default trigger = ghost rose Trash2 icon button with `aria-label`.

All five primitives are unit/render-tested (Section 7).

---

## 5. Per-screen application

| Screen | Changes |
|---|---|
| **carreira-cockpit** | `KpiChip`; `collapsedStats` (the 4 KPIs) on header; full `dark:` pass + `dark:divide-neutral-800`; cluster cards → `CarreiraCard accent={cluster}`; list rows → `CarreiraListSkeleton` while loading; `EmptyState` gains `description`. |
| **cobertura-rollup-view** | `KpiChip`; full `dark:`; "Por defensor" `<table>` wrapped in `overflow-x-auto`; skeletons; `CarreiraCard` for the two lists. |
| **vida-funcional-view** | tab bar → `TAB_STYLE_V3`; radar + bento cards → `CarreiraCard accent`; bento "0" gets an "Adicionar" CTA via `EmptyState size="sm"`; "Produtividade" placeholder → `EmptyState icon title description`; title via header slot. |
| **vida-funcional/[dominio]** | accordion rows → `CarreiraCard`; `aria-label` on edit/delete icon buttons (keep its existing `AlertDialog`). |
| **ferias-view** | `KpiChip`; `collapsedStats`; forms → `CarreiraField` (DS `Input`/`Select`); rows → `CarreiraCard`; `CarreiraListSkeleton`; delete → `ConfirmDeleteButton`; abono/suspensa pills → `StatusChip size="xs"`; progress bar gets `role="progressbar"` + `aria-valuenow/min/max` + `dark:` track; responsive form grid; `EmptyState description`. |
| **diarias-view** | same treatment as férias (KpiChip, collapsedStats, CarreiraField, CarreiraCard, skeleton, ConfirmDeleteButton, currency KPI `min-w-0 truncate`, EmptyState description). |
| **ausencias view** | same treatment (mirrors férias). |
| **pedidos-administrativos view** | same treatment (adds the carried-forward `inputCls` focus-ring fix from the pedidos review). |
| **siga-import view** | review table/cards → `CarreiraCard` shell + skeleton + dark-mode; selection uses `CarreiraCard selected`. |

Every screen keeps its current KPIs, fields, lifecycle actions, and queries — only the presentation layer changes.

---

## 6. Architecture / data flow

No data-flow change. Presentational components are pure (props in, JSX out). `CarreiraField`/`ConfirmDeleteButton` wrap existing shadcn primitives. Screens import the new primitives from `@/components/carreira/*` and delete their local `Kpi`/`inputCls`/`window.confirm` code. The `CARREIRA_CLUSTER_ACCENT` map is the single source for cluster colors.

---

## 7. Testing

- **Render tests** (vitest + testing-library) for each primitive: `KpiChip` (renders value+label, truncates), `CarreiraCard` (accent class present when given; selected ring; calls `onClick`; `FOCUS_RING` when interactive), `CarreiraField` (renders label; control has the focus-ring class), `CarreiraListSkeleton` (renders N rows, `aria-busy`), `ConfirmDeleteButton` (opens dialog, `onConfirm` fires on confirm, not on cancel).
- **Regression:** existing carreira tests (`src/lib/{ferias,diarias,ausencias,pedidos-administrativos}/**`, schema/router structural tests) still pass; `npx tsc --noEmit` clean for touched files.
- **Smoke:** `npm run dev:turbo`, visit each carreira route — renders, dark-mode toggles, delete dialogs open, skeletons show on load. (Manual, listed in plan.)

---

## 8. Out of scope (explicit)
- No router/schema/tRPC/lifecycle/projection change; no new data; no new routes.
- SIGA scrape + Drive funcional seeding = separate data-population track.
- No redesign of non-carreira screens; no new design tokens (reuse existing).
