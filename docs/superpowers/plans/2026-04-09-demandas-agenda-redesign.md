# Demandas + Agenda Redesign — Padrão Defender v3

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alinhar visualmente as páginas de Demandas e Agenda com o Padrão Defender v3 — charcoal header unificado, glass cards, status-first color hierarchy, view mode dropdown, Lucide icons only.

**Architecture:** 6 tasks sequenciais. Tasks 1-2 criam componentes shared, Tasks 3-4 aplicam em Demandas, Tasks 5-6 aplicam em Agenda. Cada task produz código compilável e commitável.

**Tech Stack:** Next.js 15, React, TypeScript, Tailwind CSS, Lucide React, design-tokens.ts

**Spec:** `docs/superpowers/specs/2026-04-09-demandas-agenda-redesign-design.md`

---

### Task 1: Criar ViewModeDropdown (shared)

Componente reutilizável: botão tool-icon com micro-chevron que abre dropdown de modos de visualização. Usado tanto em Demandas quanto Agenda.

**Files:**
- Create: `src/components/shared/view-mode-dropdown.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ViewModeOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

interface ViewModeDropdownProps {
  options: ViewModeOption[];
  value: string;
  onChange: (value: string) => void;
  /** When true, renders for dark (charcoal) background */
  variant?: "light" | "dark";
}

export function ViewModeDropdown({
  options,
  value,
  onChange,
  variant = "dark",
}: ViewModeDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = options.find((o) => o.value === value) ?? options[0];
  const ActiveIcon = current.icon;

  const isDark = variant === "dark";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center justify-center gap-0.5 rounded-md transition-all cursor-pointer",
          isDark
            ? "w-[34px] h-[28px] bg-white/[0.08] hover:bg-white/[0.14]"
            : "w-[34px] h-[28px] bg-neutral-100 hover:bg-neutral-200"
        )}
        title={`Modo: ${current.label}`}
      >
        <ActiveIcon
          className={cn(
            "w-[13px] h-[13px]",
            isDark ? "text-white" : "text-neutral-700"
          )}
        />
        <ChevronDown
          className={cn(
            "w-2 h-2",
            isDark ? "text-white/40" : "text-neutral-400"
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-full mt-1.5 z-50 min-w-[140px] rounded-lg border p-1 shadow-lg",
            isDark
              ? "bg-[#1e1e23] border-white/10"
              : "bg-white border-neutral-200"
          )}
        >
          {options.map((opt) => {
            const Icon = opt.icon;
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  "flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer",
                  isDark
                    ? isActive
                      ? "bg-white/[0.08]"
                      : "hover:bg-white/[0.05]"
                    : isActive
                      ? "bg-neutral-100"
                      : "hover:bg-neutral-50"
                )}
              >
                <Icon
                  className={cn(
                    "w-3 h-3",
                    isDark
                      ? isActive ? "text-white" : "text-white/40"
                      : isActive ? "text-neutral-900" : "text-neutral-400"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium flex-1",
                    isDark
                      ? isActive ? "text-white" : "text-white/50"
                      : isActive ? "text-neutral-900" : "text-neutral-500"
                  )}
                >
                  {opt.label}
                </span>
                {isActive && (
                  <Check
                    className={cn(
                      "w-2.5 h-2.5",
                      isDark ? "text-emerald-400" : "text-emerald-600"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/rodrigorochameire/projetos/Defender && npx tsc --noEmit 2>&1 | grep "view-mode-dropdown" | head -5`
Expected: No errors for this file

- [ ] **Step 3: Commit**

```bash
cd /Users/rodrigorochameire/projetos/Defender
git add src/components/shared/view-mode-dropdown.tsx
git commit -m "feat: create ViewModeDropdown shared component for charcoal headers"
```

---

### Task 2: AtribuicaoPills dark variant

Add a `variant="dark"` prop to AtribuicaoPills so it renders correctly on the charcoal header background.

**Files:**
- Modify: `src/components/demandas-premium/AtribuicaoPills.tsx`

- [ ] **Step 1: Read the current file**

Read `src/components/demandas-premium/AtribuicaoPills.tsx` fully (it's ~141 lines).

- [ ] **Step 2: Add `variant` prop and dark styling**

Add `variant?: "light" | "dark"` to the props interface (`AtribuicaoPillsProps`). Default to `"light"` for backwards compatibility.

When `variant === "dark"`:
- Pill container: `bg-white/[0.05]` instead of `bg-neutral-200/60 dark:bg-neutral-800`
- Pill border: `border-white/[0.06]` instead of `border-neutral-300/70 dark:border-neutral-700/60`
- Active pill: keep the hex background color but set text to white
- Inactive pill: `color: rgba(255,255,255,0.35)` instead of `#9ca3af`
- Count badge: `text-white/50` instead of current colors
- Pill dot opacity: 0.4 inactive, 1.0 active (same as current but ensure works on dark)

The key changes are in the wrapper `<div>` className and the pill button inline styles. Find the `style` attributes that set `backgroundColor` and `color` and make them conditional on `variant`.

- [ ] **Step 3: Verify build**

Run: `cd /Users/rodrigorochameire/projetos/Defender && npx tsc --noEmit 2>&1 | grep "AtribuicaoPills" | head -5`
Expected: No errors. Existing callers still work (they default to "light").

- [ ] **Step 4: Commit**

```bash
cd /Users/rodrigorochameire/projetos/Defender
git add src/components/demandas-premium/AtribuicaoPills.tsx
git commit -m "feat: add dark variant to AtribuicaoPills for charcoal header"
```

---

### Task 3: Demandas — Charcoal header unificado

Replace the current PageHeader + separate KPI cards + separate toolbar with a single charcoal header block. Absorb stats as micro-badges, pills, search, view mode dropdown, and tool icons.

**Files:**
- Modify: `src/components/demandas-premium/demandas-premium-view.tsx`
- Reference: `src/lib/config/design-tokens.ts` (HEADER_STYLE tokens)

- [ ] **Step 1: Read the current header/toolbar area**

Read `src/components/demandas-premium/demandas-premium-view.tsx` lines 2100-2350 to understand the current header, KPI grid, AtribuicaoPills, and view tabs structure.

- [ ] **Step 2: Import new dependencies**

Add imports at the top of the file:
```tsx
import { ViewModeDropdown, type ViewModeOption } from "@/components/shared/view-mode-dropdown";
import { HEADER_STYLE } from "@/lib/config/design-tokens";
import { Search, Filter, ArrowUpDown, Settings, BarChart3, LayoutGrid, Table2, List, Plus, Download, Upload } from "lucide-react";
```

Remove the `PageHeader` import since we're replacing it.

- [ ] **Step 3: Define view mode options constant**

Near the top constants area, add:
```tsx
const DEMANDAS_VIEW_OPTIONS: ViewModeOption[] = [
  { value: "kanban", label: "Kanban", icon: LayoutGrid },
  { value: "planilha", label: "Tabela", icon: Table2 },
  { value: "lista", label: "Lista", icon: List },
];
```

- [ ] **Step 4: Replace the header + toolbar rendering**

Find the section where `<PageHeader>`, `<KPIGrid>`, `<AtribuicaoPills>`, and the view tabs are rendered. Replace with a single charcoal header block. The structure should be:

```tsx
{/* ====== CHARCOAL HEADER ====== */}
<div className={cn(HEADER_STYLE.container, "rounded-none sm:rounded-xl mb-0")}>
  {/* Row 1: Title + inline stats + actions */}
  <div className="flex items-center justify-between px-5 pt-4 pb-0">
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-white/[0.07] flex items-center justify-center">
        <LayoutGrid className="w-[15px] h-[15px] text-white/50" />
      </div>
      <h1 className="text-white text-[17px] font-semibold">Demandas</h1>
      {/* Inline micro stats */}
      <div className="flex items-center gap-1.5 ml-2">
        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.08] text-white/60">
          {totalDemandas} total
        </span>
        {urgentCount > 0 && (
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-300">
            {urgentCount} urgentes
          </span>
        )}
      </div>
    </div>
    <div className="flex items-center gap-1.5">
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.07] text-white/60 text-[10px] font-medium hover:bg-white/[0.12] transition-colors cursor-pointer">
        <Download className="w-3 h-3" /> Importar
      </button>
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.07] text-white/60 text-[10px] font-medium hover:bg-white/[0.12] transition-colors cursor-pointer">
        <Upload className="w-3 h-3" /> Exportar
      </button>
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-neutral-900 text-[10px] font-semibold hover:bg-neutral-100 transition-colors cursor-pointer"
      >
        <Plus className="w-3 h-3" /> Nova
      </button>
    </div>
  </div>

  {/* Row 2: Pills + Search | sep | ViewMode + Tools */}
  <div className="flex items-center gap-2 px-5 pt-3 pb-3 mt-3 border-t border-white/[0.06]">
    <AtribuicaoPills
      variant="dark"
      options={atribuicaoOptions}
      selectedValues={selectedAtribuicoes}
      onToggle={handleAtribuicaoToggle}
      singleSelect
      compact
      counts={atribuicaoCounts}
    />

    <div className="relative flex-1 max-w-[200px]">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20" />
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Buscar nome, processo..."
        className="w-full bg-white/[0.05] border border-white/[0.06] rounded-lg py-1.5 pl-7 pr-3 text-[10px] text-white/60 placeholder:text-white/20 outline-none focus:bg-white/[0.1] focus:border-white/[0.15] transition-all"
      />
    </div>

    <div className="w-px h-5 bg-white/[0.08] rounded-full mx-0.5 shrink-0" />

    <ViewModeDropdown
      options={DEMANDAS_VIEW_OPTIONS}
      value={activeTab}
      onChange={(v) => setActiveTab(v as any)}
      variant="dark"
    />

    <div className="w-px h-5 bg-white/[0.08] rounded-full mx-0.5 shrink-0" />

    <div className="flex items-center gap-0.5">
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="relative w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.08] transition-colors cursor-pointer"
        title="Filtros"
      >
        <Filter className="w-[13px] h-[13px] text-white/30" />
        {hasActiveFilters && (
          <div className="absolute top-1 right-1 w-[5px] h-[5px] rounded-full bg-emerald-400" />
        )}
      </button>
      <button className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.08] transition-colors cursor-pointer" title="Ordenar">
        <ArrowUpDown className="w-[13px] h-[13px] text-white/30" />
      </button>
      <button
        onClick={() => setIsConfigModalOpen(true)}
        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.08] transition-colors cursor-pointer"
        title="Configurações"
      >
        <Settings className="w-[13px] h-[13px] text-white/30" />
      </button>
      <button
        onClick={() => setShowChart(!showChart)}
        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.08] transition-colors cursor-pointer"
        title="Gráficos"
      >
        <BarChart3 className="w-[13px] h-[13px] text-white/30" />
      </button>
    </div>
  </div>
</div>
```

**Important:** This replaces the old `<PageHeader>`, `<KPIGrid>`, the filter bar with `<AtribuicaoPills>`, and the view tabs. Remove all of those. The kanban/table/list rendering below remains unchanged — it's keyed off `activeTab` which now comes from the ViewModeDropdown.

Wire the button handlers to the existing state/functions (they already exist in the component — `setIsCreateModalOpen`, `searchTerm`, `setSearchTerm`, `selectedAtribuicoes`, `handleAtribuicaoToggle`, `activeTab`, `setActiveTab`, `showFilters`, `setShowFilters`, etc.). Read the existing code to find the exact variable names.

You'll need to compute `totalDemandas`, `urgentCount`, `hasActiveFilters`, and `atribuicaoCounts` from existing data — these are likely already computed or trivially derivable.

- [ ] **Step 5: Remove old PageHeader import and unused icons**

Clean up imports that are no longer needed (PageHeader, old icon imports replaced by new ones).

- [ ] **Step 6: Verify build**

Run: `cd /Users/rodrigorochameire/projetos/Defender && npx tsc --noEmit 2>&1 | grep "demandas-premium-view" | head -10`

- [ ] **Step 7: Commit**

```bash
cd /Users/rodrigorochameire/projetos/Defender
git add src/components/demandas-premium/demandas-premium-view.tsx
git commit -m "feat: replace demandas header+toolbar with charcoal unified header

- Charcoal gradient header with HEADER_STYLE tokens
- Stats as inline micro-badges (total, urgentes)
- AtribuicaoPills dark variant integrated in header
- Search input inline
- ViewModeDropdown replaces segmented view tabs
- Filter/Sort/Config/Charts as tool icons
- Toolbar completely removed"
```

---

### Task 4: Kanban cards — Glass + Status-first

Update the KanbanCard component in kanban-premium.tsx to use glass styling and status-first color hierarchy.

**Files:**
- Modify: `src/components/demandas-premium/kanban-premium.tsx`

- [ ] **Step 1: Read the current KanbanCard component**

Read `src/components/demandas-premium/kanban-premium.tsx` lines 92-314 to understand the current card rendering.

- [ ] **Step 2: Update card container classes**

Find the card's outer `<div>` (around line 156). Replace its className/style with glass treatment:

Current: likely has `bg-white`, `border`, `rounded-lg`, and a left border color based on group.

New: Apply `GLASS.cardHover` pattern:
```
bg-white/[0.78] backdrop-blur-sm border border-neutral-200/60 rounded-xl
hover:bg-white/95 hover:shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:-translate-y-0.5
transition-all cursor-pointer
```

- [ ] **Step 3: Change left bar from group color to status color**

Find where the left color bar is rendered (around line 181-184, uses `groupColor`). The bar should now use the **status group color** (which it likely already does since `groupColor` comes from STATUS_GROUPS). Verify this is correct — the bar should reflect: triagem=#a1a1aa, preparação=#fbbf24, diligências=#60a5fa, saída=#f97316, concluída=#22c55e.

Make the bar 2.5px wide with `border-radius: 0 2px 2px 0`.

- [ ] **Step 4: Make atribuição badge conditional**

Find where the atribuição label/badge is shown on the card. Wrap it in a condition:

```tsx
{showAtribBadge && (
  <span
    className="text-[7px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border shrink-0"
    style={{
      color: atribColor,
      borderColor: `${atribColor}33`,
      backgroundColor: `${atribColor}12`,
    }}
  >
    {atribLabel}
  </span>
)}
```

Where `showAtribBadge` is passed as a prop from the parent (demandas-premium-view.tsx) and is `true` when the filter is "Todos" (all attributions shown).

Add `showAtribBadge?: boolean` to the KanbanCard props/KanbanPremium props and pass it through.

- [ ] **Step 5: Ensure status dot + label are prominent in footer**

The card footer should have the status dot (5px circle) + status label in bold with the status color. This likely already exists — just make sure the status text uses `font-weight: 500` and the status color is the dominant colored element.

- [ ] **Step 6: Update column styling**

Update column container to be more subtle — remove heavy backgrounds, keep just the header with dot + label + count. The column body should be transparent (cards float on the page background).

For the "Concluída" column, add `opacity: 0.5` to the column container.

- [ ] **Step 7: Verify build**

Run: `cd /Users/rodrigorochameire/projetos/Defender && npx tsc --noEmit 2>&1 | grep "kanban-premium" | head -5`

- [ ] **Step 8: Commit**

```bash
cd /Users/rodrigorochameire/projetos/Defender
git add src/components/demandas-premium/kanban-premium.tsx src/components/demandas-premium/demandas-premium-view.tsx
git commit -m "feat: kanban cards glass + status-first, conditional atrib badge

- Cards use glass treatment (backdrop-blur, translucent bg)
- Left bar color = status group (not atribuição)
- Atribuição badge only shown when filter is 'Todos'
- Concluída column at 50% opacity
- Status dot+label prominent in card footer"
```

---

### Task 5: Agenda — Charcoal header unificado

Replace the current agenda page header, KPI cards, and filters with a single charcoal header matching Demandas.

**Files:**
- Modify: `src/app/(dashboard)/admin/agenda/page.tsx`

- [ ] **Step 1: Read the current header area**

Read `src/app/(dashboard)/admin/agenda/page.tsx` to find where the header, KPI StatCards, filters, and calendar view selection are rendered. Note the state variables for `currentDate`, view mode, filters, etc.

- [ ] **Step 2: Import new dependencies**

Add imports:
```tsx
import { ViewModeDropdown, type ViewModeOption } from "@/components/shared/view-mode-dropdown";
import { HEADER_STYLE } from "@/lib/config/design-tokens";
import { Calendar, Search, Filter, Settings, ChevronLeft, ChevronRight, Plus, Download, LayoutGrid, CalendarDays, List } from "lucide-react";
```

- [ ] **Step 3: Define agenda view mode options**

```tsx
const AGENDA_VIEW_OPTIONS: ViewModeOption[] = [
  { value: "month", label: "Mês", icon: Calendar },
  { value: "week", label: "Semana", icon: CalendarDays },
  { value: "list", label: "Lista", icon: List },
];
```

- [ ] **Step 4: Replace header rendering with charcoal header**

Same pattern as Demandas. Structure:

**Row 1:** Calendar icon + "Agenda" title + inline stats (`9 hoje`, `2 presos`) + action buttons (PJe import, Novo Evento)

**Row 2:** AtribuicaoPills (dark variant) + separator | Month navigation (ChevronLeft + "Abril 2026" + ChevronRight + "Hoje" button) + separator | ViewModeDropdown + Filter icon + Config icon

Wire the month navigation to the existing `currentDate` state and `addMonths`/`subMonths` handlers.

The AtribuicaoPills should filter events by atribuição — connect to the existing filter state.

- [ ] **Step 5: Remove old header, KPI grid, and separate filter components**

Remove the old StatCard rendering, KPIGrid, and any standalone filter bar. All of that is now in the charcoal header.

- [ ] **Step 6: Verify build**

Run: `cd /Users/rodrigorochameire/projetos/Defender && npx tsc --noEmit 2>&1 | grep "agenda/page" | head -10`

- [ ] **Step 7: Commit**

```bash
cd /Users/rodrigorochameire/projetos/Defender
git add src/app/(dashboard)/admin/agenda/page.tsx
git commit -m "feat: replace agenda header with charcoal unified header

- Charcoal gradient matching Demandas header
- Month navigation integrated in header row 2
- AtribuicaoPills dark variant for filtering
- ViewModeDropdown for Mês/Semana/Lista
- Filter/Config as tool icons
- Stats as inline micro-badges (hoje, presos)
- Removed separate KPI grid and filter components"
```

---

### Task 6: Calendar — G hybrid cells + event chips with left status bar

Update CalendarMonthView to use glass hybrid cells (G pattern) and event chips with left status bar.

**Files:**
- Modify: `src/components/agenda/calendar-month-view.tsx`

- [ ] **Step 1: Read the current calendar rendering**

Read `src/components/agenda/calendar-month-view.tsx` fully. Focus on:
- Day cell rendering (around line 432-510)
- EventoCompacto component (around line 187-288)
- How events are passed to and rendered within day cells

- [ ] **Step 2: Update EventoCompacto — left status bar + 2-line format**

The current EventoCompacto has a top-bar gradient and 2 lines (horário+tipo / nome). Change to:

**Remove:** The `h-[2px]` top gradient bar div.

**Add:** A left status bar (2.5px, absolute positioned) colored by event status:
- `agendada` / default → `#a1a1aa`
- `realizada` / `concluida` → `#22c55e`
- `reagendada` / `redesignada` / `remarcado` → `#f59e0b`
- `cancelada` / `cancelado` → `#ef4444`

**Update card classes:** Replace the current white bg card with glass:
```
bg-white/[0.8] border border-neutral-200/50 rounded-md
hover:bg-white hover:shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:-translate-y-0.5
transition-all cursor-pointer relative
```

**Left bar:**
```tsx
<div
  className="absolute left-0 top-1 bottom-1 w-[2.5px] rounded-r-sm"
  style={{ backgroundColor: statusColor }}
/>
```

**Line 1 (horário + tipo):** Keep existing structure but ensure:
- Horário uses `font-variant-numeric: tabular-nums` and color matches status color
- Tipo abbreviation (tipoAbrev) stays as-is in muted `text-neutral-400`

**Line 2 (nome):** Keep as-is.

**Add status color helper** near the top of the file:
```tsx
const STATUS_CHIP_COLOR: Record<string, string> = {
  agendada: "#a1a1aa",
  confirmada: "#a1a1aa",
  realizada: "#22c55e",
  concluida: "#22c55e",
  concluída: "#22c55e",
  reagendada: "#f59e0b",
  redesignada: "#f59e0b",
  redesignado: "#f59e0b",
  remarcado: "#f59e0b",
  cancelada: "#ef4444",
  cancelado: "#ef4444",
};

function getChipStatusColor(status?: string): string {
  return STATUS_CHIP_COLOR[status?.toLowerCase() ?? ""] ?? "#a1a1aa";
}
```

- [ ] **Step 3: Update day cell rendering — G hybrid pattern**

Find where day cells are rendered (around line 432-510). Update the cell classes to implement the G hybrid pattern:

**Base cell:**
```
bg-white/[0.55] transition-all
```

**Cell with events (has at least 1 event):**
```
bg-white/[0.85] shadow-[0_1px_4px_rgba(0,0,0,0.04)]
```

**Today cell:**
```
bg-white/[0.95] shadow-[0_2px_8px_rgba(0,0,0,0.06)]
```

**Other month cell:**
```
bg-neutral-100/[0.35]
```

**Day number for today:** `bg-neutral-900 text-white` (inverted circle)

**Grid container:** Add `bg-neutral-200/30 rounded-lg overflow-hidden gap-px` to the grid wrapper so the 1px gaps show as subtle lines.

The logic to determine `hasEvents` should check if the day's events array has length > 0:
```tsx
const hasEvents = dayEvents.length > 0;
const cellClass = cn(
  "min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 transition-all",
  isOtherMonth && "bg-neutral-100/[0.35]",
  !isOtherMonth && !hasEvents && "bg-white/[0.55]",
  !isOtherMonth && hasEvents && "bg-white/[0.85] shadow-[0_1px_4px_rgba(0,0,0,0.04)]",
  isToday && "bg-white/[0.95] shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
);
```

- [ ] **Step 4: Update day-of-week header**

Change to `text-[9px] font-bold uppercase tracking-wider text-neutral-400` for consistency with the spec.

- [ ] **Step 5: Verify build**

Run: `cd /Users/rodrigorochameire/projetos/Defender && npx tsc --noEmit 2>&1 | grep "calendar-month-view" | head -5`

- [ ] **Step 6: Visual test**

Run dev server and check:
- Day 9 (today) should have inverted number + elevated cell
- Days with events should be slightly brighter than empty days
- Event chips should have left status bar (grey for agendada, green for realizada, amber for reagendada)
- Hovering a chip should elevate slightly

- [ ] **Step 7: Commit**

```bash
cd /Users/rodrigorochameire/projetos/Defender
git add src/components/agenda/calendar-month-view.tsx
git commit -m "feat: calendar G hybrid cells + event chips with left status bar

- Day cells: glass hybrid — elevated when has events, flat when empty
- Today: most elevated with inverted day number
- Event chips: 2-line format with 2.5px left bar colored by status
- Status colors: grey=agendada, green=realizada, amber=reagendada, red=cancelada
- Grid container with subtle 1px gap lines
- Removed old top-bar gradient from event chips"
```
