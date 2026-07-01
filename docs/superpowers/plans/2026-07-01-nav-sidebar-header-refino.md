# Refino de Navegação (Sidebar legível + Drawer mobile + Header ⋯) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the desktop sidebar items larger/more legible, restore the ☰ sidebar drawer on mobile (keeping the 4-tab bottom nav, removing the "Mais" launcher), and harmonize the crowded mobile top bar into `☰ · título · 🔔 · ⋯` with an overflow bottom sheet.

**Architecture:** All changes are nav/header presentational, gated by Tailwind `md:` / `useIsMobile()`; desktop (≥768px) stays byte-for-byte behaviorally identical. Part 1 is a CSS scale pass in `admin-sidebar.tsx` via shared className constants. Part 2 deletes the launcher and simplifies `MobileBottomNav`. Part 3 adds a `MobileHeaderOverflow` bottom sheet and restructures `header-utility-row.tsx`.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, Tailwind, Radix (`ui/sheet`), lucide-react, Vitest + Testing Library (happy-dom).

## Global Constraints

- **Breakpoint:** mobile `< 768px` via Tailwind `md:` and the existing `useIsMobile()` (`src/hooks/use-mobile.ts`). No new breakpoint.
- **No desktop regression:** ≥768px must render/behave exactly as before every task. Mobile-only additions are `md:hidden`; desktop-only inline controls become `hidden md:flex`/`hidden md:inline-flex`.
- **Client components:** files using hooks/state start with `"use client";`.
- **Path alias:** `@/*` → `./src/*`.
- **Tests:** component tests declare `// @vitest-environment happy-dom` on line 1; `@testing-library/react`; `afterEach(cleanup)`. Run scoped: `npx vitest run <path>` — a nested `.claude/worktrees/` dir holds stale duplicate tests; never let them interfere.
- **Every task ends `tsc`-clean:** `npx tsc --noEmit` (vitest/esbuild does NOT type-check). Removals must leave zero orphaned imports.
- **Copy:** Portuguese (pt-BR). Icons: lucide only. Tap targets ≥44px on mobile.
- **Commits:** conventional prefix, trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Working dir:** worktree `/Users/rodrigorochameire/Projetos/Defender-nav-refino-wt` on branch `feat/nav-sidebar-header-refino`.

---

## Task 1: Sidebar desktop — itens maiores e legíveis

CSS scale pass in the sidebar. No logic → verified by `tsc`, a grep that the old tiny sizes are gone at item sites, and a manual visual check (incl. the collapsed icon-only state).

**Files:**
- Modify: `src/components/layouts/admin-sidebar.tsx`

**Interfaces:**
- Produces: nav item sizing constants (module-scope consts) reused across the item render sites. No exported symbols.

- [ ] **Step 1: Add sizing constants near the top of the module**

After the existing imports in `admin-sidebar.tsx` (module scope, before the first component), add:

```tsx
// Nav item sizing (legibilidade) — aplicado uniformemente aos sites de item.
const NAV_LABEL = "text-sm font-medium";        // era text-[12px]/[13px]
const NAV_ICON = "h-5 w-5";                       // era h-[15px]/[18px]
const NAV_SUBICON = "h-[18px] w-[18px]";          // era h-3.5 w-3.5
const NAV_ROW_PAD = "py-2.5";                      // era py-2
const NAV_BADGE_TEXT = "text-[11px]";             // era text-[8px]/[9px]/[10px]
```

- [ ] **Step 2: Enumerate the item render sites**

Run: `grep -nE "text-\[12px\]|text-\[13px\]|h-\[15px\] w-\[15px\]|h-3\.5 w-3\.5|py-2\b|text-\[8px\]|text-\[9px\]|text-\[10px\]" src/components/layouts/admin-sidebar.tsx`
This lists every candidate. For EACH match, confirm from context it is a **clickable nav item** (a `SidebarMenuButton` label/icon, a popover/`MoreMenu`/`NewsMenu`/`ToolsMenu` item row, or its badge) — NOT a section header (`text-[11px] uppercase tracking-wider`), the user card, or an unrelated element. Section headers, the online dot, and the user footer stay untouched.

- [ ] **Step 3: Apply the sizing at each confirmed item site**

Replace, ONLY at confirmed nav-item sites:
- item **label** classes `text-[12px]` / `text-[13px]` → `NAV_LABEL` (e.g. `className={cn(NAV_LABEL, "truncate")}`; keep any existing `truncate`/color).
- item **icon** classes `h-[15px] w-[15px]` and the item-level `h-[18px] w-[18px]` → `NAV_ICON`; the leading item icon may keep its `mr-2.5`/`flex-shrink-0`.
- **sub-item icon** `h-3.5 w-3.5` (News/collapsible sub-items) → `NAV_SUBICON`.
- item **row** vertical padding `py-2` (on `flex items-center ... rounded-lg` item rows) → `NAV_ROW_PAD`.
- item **badge** text `text-[8px]`/`text-[9px]`/`text-[10px]` → `NAV_BADGE_TEXT`, and bump the badge box if needed so the number isn't clipped (e.g. `min-w-[18px] h-[18px]` stays; `h-[14px]` count dots → `h-[16px]`).

Do NOT change: colors, the emerald active border, `truncate`, the collapsed-state widths, section headers, or the user footer.

- [ ] **Step 4: Verify no tiny item sizes remain + typecheck**

Run: `grep -nE "text-\[12px\]|text-\[13px\]|h-\[15px\] w-\[15px\]" src/components/layouts/admin-sidebar.tsx`
Expected: no matches at nav-item sites (only, if any, non-item leftovers you deliberately kept — none expected).
Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 5: Manual visual check (describe for the human)**

Note in the report the manual steps: at ≥768px, open the app — sidebar labels read at 14px, icons ~20px, rows roomier; **collapse the sidebar** (rail toggle) and confirm icons still fit the icon-only width with no overflow/clipping; badges legible.

- [ ] **Step 6: Commit**

```bash
git add src/components/layouts/admin-sidebar.tsx
git commit -m "feat(sidebar): itens maiores e legíveis (labels 14px, ícones 20px, rows py-2.5)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Remover launcher "Mais" + simplificar o bottom nav

Landing together keeps `tsc` green: simplify `MobileBottomNav` to 4 tabs, delete the launcher files, prune `nav-registry`, and update the sidebar mount + tests.

**Files:**
- Modify: `src/components/shared/mobile-bottom-nav.tsx`
- Modify: `src/components/shared/__tests__/mobile-bottom-nav.test.tsx`
- Delete: `src/components/shared/mobile/mobile-more-sheet.tsx`
- Delete: `src/components/shared/mobile/resolve-icon.tsx`
- Delete: `src/components/shared/mobile/__tests__/mobile-more-sheet.test.tsx`
- Modify: `src/components/layouts/nav-registry.ts`
- Modify: `src/components/layouts/__tests__/nav-registry.test.ts`
- Modify: `src/components/layouts/admin-sidebar.tsx` (the `<MobileBottomNav />` mount, ~line 2068)

**Interfaces:**
- Produces: `MobileBottomNav()` — NO props (was `{ role: UserRole }`). `nav-registry` keeps `BOTTOM_TABS`, `isTabActive`, `type BottomTab`; removes `getLauncherGroups`, `type LauncherGroup`, `roleAllows`.

- [ ] **Step 1: Update the bottom-nav test to the new shape (failing)**

Replace `src/components/shared/__tests__/mobile-bottom-nav.test.tsx` with:

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MobileBottomNav } from "@/components/shared/mobile-bottom-nav";

afterEach(cleanup);
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/demandas" }));

describe("MobileBottomNav", () => {
  it("renders exactly the 4 fixed tabs and no 'Mais'", () => {
    render(<MobileBottomNav />);
    ["Home", "Agenda", "Demandas", "Assistidos"].forEach((label) =>
      expect(screen.getByText(label)).toBeInTheDocument(),
    );
    expect(screen.queryByText("Mais")).toBeNull();
  });

  it("marks the active tab from the pathname", () => {
    render(<MobileBottomNav />);
    expect(screen.getByText("Demandas").closest("a")).toHaveAttribute("aria-current", "page");
  });
});
```

- [ ] **Step 2: Run test — it fails to compile/run**

Run: `npx vitest run src/components/shared/__tests__/mobile-bottom-nav.test.tsx`
Expected: FAIL — current `MobileBottomNav` requires a `role` prop / still renders "Mais".

- [ ] **Step 3: Simplify `MobileBottomNav`**

Replace `src/components/shared/mobile-bottom-nav.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BOTTOM_TABS, isTabActive } from "@/components/layouts/nav-registry";

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "bg-[#303032]/95 backdrop-blur-xl border-t border-neutral-700/30",
        "h-16 pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <div className="flex h-16 items-center justify-around px-1">
        {BOTTOM_TABS.map((tab) => {
          const active = isTabActive(pathname, tab);
          return (
            <Link
              key={tab.path}
              href={tab.path}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-full w-full flex-col items-center justify-center gap-0.5 transition-colors duration-150",
                active ? "text-emerald-400" : "text-neutral-500",
              )}
            >
              {active && (
                <span className="absolute top-1 h-1 w-1 rounded-full bg-emerald-400" />
              )}
              <tab.icon className="mt-1 h-5 w-5" />
              <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Delete the launcher files**

```bash
git rm src/components/shared/mobile/mobile-more-sheet.tsx \
       src/components/shared/mobile/resolve-icon.tsx \
       src/components/shared/mobile/__tests__/mobile-more-sheet.test.tsx
```

- [ ] **Step 5: Prune `nav-registry.ts`**

In `src/components/layouts/nav-registry.ts`, remove `roleAllows`, `type LauncherGroup`, and `getLauncherGroups` (everything from `export type LauncherGroup` through the end of `getLauncherGroups`). Also remove now-unused imports (`COLLAPSIBLE_MENU_GROUPS`, `UTILITIES_MENU`, and — if no longer referenced — `AssignmentMenuItem`, `MenuSection`, `UserRole`). Keep `type BottomTab`, `BOTTOM_TABS`, `isTabActive`, and the lucide + `LucideIcon` imports they use. After editing, run `grep -nE "COLLAPSIBLE_MENU_GROUPS|UTILITIES_MENU|MenuSection|AssignmentMenuItem|UserRole" src/components/layouts/nav-registry.ts` and delete any import line with no remaining reference.

- [ ] **Step 6: Prune the nav-registry test**

In `src/components/layouts/__tests__/nav-registry.test.ts`, delete the entire `describe("getLauncherGroups", ...)` block and remove the now-unused `import type { MenuSection }` if present. Keep the `BOTTOM_TABS` and `isTabActive` describes.

- [ ] **Step 7: Update the sidebar mount**

In `src/components/layouts/admin-sidebar.tsx`, change `<MobileBottomNav role={userRole ?? "estagiario"} />` to `<MobileBottomNav />`. If `MobileBottomNav` was the only reason `userRole` is computed, leave `userRole` as-is (other menus use it) — do not remove it.

- [ ] **Step 8: Run tests + typecheck**

Run: `npx vitest run src/components/shared/__tests__/mobile-bottom-nav.test.tsx src/components/layouts/__tests__/nav-registry.test.ts`
Expected: PASS.
Run: `npx tsc --noEmit`
Expected: zero errors (no orphaned imports from the deletions).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(mobile): remover launcher Mais, bottom nav só com 4 tabs

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `MobileHeaderOverflow` — bottom sheet do ⋯

Self-contained ⋯ button + bottom sheet holding the collapsed global controls (search, conflitos, tema, chat).

**Files:**
- Create: `src/components/layouts/mobile-header-overflow.tsx`
- Test: `src/components/layouts/__tests__/mobile-header-overflow.test.tsx`

**Interfaces:**
- Consumes: `Sheet, SheetTrigger, SheetContent, SheetTitle` (`@/components/ui/sheet`); `openCommandPalette` (`@/lib/events/command-palette`); `ConflictBadge` (`@/components/conflict-badge`); `ThemeToggle` (`@/components/theme-toggle`); `chatPanelActions` (`@/hooks/use-chat-panel`); `MoreHorizontal, Search, MessageSquare` (lucide).
- Produces: `function MobileHeaderOverflow()` — renders a `md:hidden` ⋯ trigger + its sheet.

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MobileHeaderOverflow } from "@/components/layouts/mobile-header-overflow";

afterEach(cleanup);

const openSpy = vi.fn();
vi.mock("@/lib/events/command-palette", () => ({ openCommandPalette: () => openSpy() }));
const toggleSpy = vi.fn();
vi.mock("@/hooks/use-chat-panel", () => ({ chatPanelActions: { toggle: () => toggleSpy() } }));
vi.mock("@/components/conflict-badge", () => ({ ConflictBadge: () => <div data-testid="conflict-badge" /> }));
vi.mock("@/components/theme-toggle", () => ({ ThemeToggle: () => <div data-testid="theme-toggle" /> }));

describe("MobileHeaderOverflow", () => {
  it("opens the sheet and shows the collapsed controls", () => {
    render(<MobileHeaderOverflow />);
    fireEvent.click(screen.getByRole("button", { name: /mais op/i }));
    expect(screen.getByText(/Buscar/i)).toBeInTheDocument();
    expect(screen.getByTestId("conflict-badge")).toBeInTheDocument();
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    expect(screen.getByText(/Assistente/i)).toBeInTheDocument();
  });

  it("the search row opens the command palette", () => {
    render(<MobileHeaderOverflow />);
    fireEvent.click(screen.getByRole("button", { name: /mais op/i }));
    fireEvent.click(screen.getByText(/Buscar/i));
    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it("the chat row toggles the chat panel", () => {
    render(<MobileHeaderOverflow />);
    fireEvent.click(screen.getByRole("button", { name: /mais op/i }));
    fireEvent.click(screen.getByText(/Assistente/i));
    expect(toggleSpy).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test — fails (module missing)**

Run: `npx vitest run src/components/layouts/__tests__/mobile-header-overflow.test.tsx`
Expected: FAIL — cannot resolve the component.

- [ ] **Step 3: Implement the component**

```tsx
// src/components/layouts/mobile-header-overflow.tsx
"use client";

import { useState } from "react";
import { MoreHorizontal, Search, MessageSquare } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { openCommandPalette } from "@/lib/events/command-palette";
import { ConflictBadge } from "@/components/conflict-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { chatPanelActions } from "@/hooks/use-chat-panel";

/**
 * Overflow "⋯" do header no mobile (md:hidden). Recolhe os controles globais
 * da utility bar num bottom sheet: busca, conflitos, tema e assistente/chat.
 * O peer switcher NÃO entra aqui — fica no topo da sidebar (drawer ☰).
 */
export function MobileHeaderOverflow() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Mais opções"
          className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md text-white/60 hover:text-white/90 hover:bg-white/[0.08] transition-colors"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl md:hidden pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <SheetTitle className="mb-3 text-sm">Mais opções</SheetTitle>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => { setOpen(false); openCommandPalette(); }}
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-accent min-h-[44px]"
          >
            <Search className="h-5 w-5 text-muted-foreground" />
            Buscar assistido, demanda, página…
          </button>

          <button
            type="button"
            onClick={() => { setOpen(false); chatPanelActions.toggle(); }}
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-accent min-h-[44px]"
          >
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            Assistente OMBUDS
          </button>

          <div className="flex items-center justify-between rounded-lg px-3 py-2 min-h-[44px]">
            <span className="text-sm text-muted-foreground">Conflitos</span>
            <ConflictBadge />
          </div>

          <div className="flex items-center justify-between rounded-lg px-3 py-2 min-h-[44px]">
            <span className="text-sm text-muted-foreground">Tema</span>
            <ThemeToggle />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4: Run test — passes**

Run: `npx vitest run src/components/layouts/__tests__/mobile-header-overflow.test.tsx`
Expected: PASS. Then `npx tsc --noEmit` → zero errors. (If `ui/sheet` export names differ, confirm via `grep -n "export" src/components/ui/sheet.tsx` — they are the standard shadcn set.)

- [ ] **Step 5: Commit**

```bash
git add src/components/layouts/mobile-header-overflow.tsx src/components/layouts/__tests__/mobile-header-overflow.test.tsx
git commit -m "feat(header): MobileHeaderOverflow (bottom sheet do ⋯)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Restructure `header-utility-row.tsx` (mobile ☰·título·🔔·⋯)

Restore the ☰ on mobile, collapse the global controls into the ⋯, remove the Fase 0 magnifier, hide breadcrumbs on mobile, keep the bell always visible. Desktop unchanged. No unit test (integration/CSS) — verified by `tsc` + manual.

**Files:**
- Modify: `src/components/layouts/header-utility-row.tsx`

**Interfaces:**
- Consumes: `MobileHeaderOverflow` (Task 3).

- [ ] **Step 1: Restore the ☰ on mobile**

In `header-utility-row.tsx`, change the `SidebarTrigger` className from `"hidden md:inline-flex h-6 w-6 ..."` to `"inline-flex h-8 w-8 md:h-6 md:w-6 ..."` (visible on mobile, slightly larger touch target there; keep the rest of the classes). Full line:

```tsx
<SidebarTrigger className="inline-flex h-8 w-8 md:h-6 md:w-6 rounded-md text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-all duration-200 shrink-0" />
```

- [ ] **Step 2: Hide breadcrumbs on mobile, keep the title slot**

Wrap the `<Breadcrumbs />` and its leading separator so they are desktop-only (the `#header-slot` title stays visible on mobile). Replace the separator + `<Breadcrumbs />` block:

```tsx
{/* Separator (desktop) */}
<div className="hidden md:block h-4 w-px bg-white/[0.08] shrink-0" />

{/* Breadcrumbs (desktop) */}
<div className="hidden md:flex items-center min-w-0">
  <Breadcrumbs />
</div>

{/* Slot for page-injected content (título+stats) — visível em ambos */}
<div id="header-slot" className="flex items-center min-w-0" />
```

- [ ] **Step 3: Make ConflictBadge desktop-only in the row**

Wrap the inline `<ConflictBadge />` (it moves into the ⋯ on mobile):

```tsx
{/* Conflict badge (desktop; no mobile vai pro ⋯) */}
<div className="hidden md:flex"><ConflictBadge /></div>
```

- [ ] **Step 4: Rework the controls cluster**

Replace the whole controls `<div className="flex items-center gap-1"> ... </div>` block (the one containing the magnifier, `CommandPalette`, `ThemeToggle`, `NotificationsPopover`, chat button) with:

```tsx
<div className="flex items-center gap-1">
  {/* Desktop: busca (Cmd+K), tema, chat inline */}
  <span className="hidden md:inline-flex">
    <CommandPalette />
  </span>
  <span className="hidden md:inline-flex">
    <ThemeToggle />
  </span>

  {/* Sino — sempre visível */}
  <NotificationsPopover />

  {/* Chat — desktop inline (no mobile vai pro ⋯) */}
  <button
    onClick={handleChatToggle}
    title="Assistente OMBUDS"
    className="hidden md:inline-flex items-center justify-center h-7 w-7 rounded-md text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-colors"
  >
    <MessageSquare className="h-3.5 w-3.5" />
  </button>

  {/* Mobile: overflow ⋯ (busca, conflitos, tema, chat) */}
  <MobileHeaderOverflow />
</div>
```

- [ ] **Step 5: Fix imports**

At the top of `header-utility-row.tsx`:
- add `import { MobileHeaderOverflow } from "@/components/layouts/mobile-header-overflow";`
- remove `Search` from the lucide import (the magnifier is gone) — keep `MessageSquare`: `import { MessageSquare } from "lucide-react";`
- remove `import { openCommandPalette } from "@/lib/events/command-palette";` (no longer used here; it's used inside `MobileHeaderOverflow`).

- [ ] **Step 6: Typecheck + manual verification**

Run: `npx tsc --noEmit`
Expected: zero errors (no unused `Search`/`openCommandPalette`).
Manual (describe in report): at 390px — header shows `☰ · [título+stats] · 🔔 · ⋯`; ☰ opens the full sidebar drawer (with the peer switcher at its top); ⋯ opens the sheet with Buscar/Assistente/Conflitos/Tema; no clipped controls; breadcrumbs hidden. At ≥768px — header identical to before (breadcrumbs, online/date, ConflictBadge, Cmd+K palette, theme, bell, chat all inline; no ⋯).

- [ ] **Step 7: Commit**

```bash
git add src/components/layouts/header-utility-row.tsx
git commit -m "feat(header): harmonizar top bar no mobile (☰·título·🔔·⋯), restaurar drawer

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Definition of Done
- [ ] Sidebar desktop legível (labels 14px, ícones 20px, rows py-2.5); estado colapsado intacto.
- [ ] Mobile: ☰ abre a sidebar (drawer) com peer switcher no topo; bottom nav só com 4 tabs; launcher "Mais" e a lupa avulsa removidos; sem arquivos/imports órfãos.
- [ ] Header mobile = `☰ · título · 🔔 · ⋯`; ⋯ abre com busca/conflitos/tema/chat.
- [ ] Desktop (≥768px) inalterado em todas as partes.
- [ ] `npx tsc --noEmit` limpo; testes de componente verdes.

## Out of scope
- Verificação manual em dev server ao vivo (o humano roda `npm run dev`).
- Redesenho dos page headers / `CollapsiblePageHeader`.
- Slot `extra`/`headerExtra` (TriagemBadge) — código morto (workspaces removidos).
