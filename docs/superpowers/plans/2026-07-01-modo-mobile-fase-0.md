# Modo Mobile — Fase 0 (Fundação) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared mobile primitives, the blended mobile navigation (4 tabs + "Mais" launcher + subtle search), and validate them end-to-end on two pilot pages (Demandas, Assistidos), without any mass rollout.

**Architecture:** New primitives live under `src/components/shared/mobile/` and `src/components/ui/`. Mobile nav is driven by a thin `nav-registry.ts` that reuses the existing route registry in `src/contexts/assignment-context.tsx` (`useAssignment().modules`, `COLLAPSIBLE_MENU_GROUPS`, `UTILITIES_MENU`). Layout primitives are no-ops on desktop (≥768px) so nothing regresses; they branch on the existing `useIsMobile()` hook or Tailwind `md:` classes.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS, Radix UI (`ui/dialog`, `ui/sheet`, `ui/command`), lucide-react, Vitest + Testing Library (happy-dom), Playwright.

## Global Constraints

- **Breakpoint:** mobile = `< 768px`, via the existing `useIsMobile()` (`src/hooks/use-mobile.ts`). Do not introduce a second breakpoint value.
- **No desktop regression:** every new layout primitive must render exactly the desktop path when `!isMobile`. Tablets 768–1024px are treated as desktop.
- **Client components:** every file that uses hooks/state starts with `"use client";`.
- **Path alias:** import via `@/*` (maps to `./src/*`).
- **Tests:** component tests declare `// @vitest-environment happy-dom` on line 1, import from `@testing-library/react`, and `afterEach(cleanup)`. Run with `npm test` (alias for `vitest run`). E2E: `npm run test:e2e`.
- **Icons:** lucide-react only, never emojis. Minimum touch target 44×44px.
- **Tokens (spec §9.7) are applied inline, no config change needed:** breakpoint = `useIsMobile()`; safe-area via Tailwind arbitrary values `pb-[env(safe-area-inset-bottom)]` / `pb-[calc(env(safe-area-inset-bottom)+…)]` (already used in the codebase); 44px targets via `h-11`/`min-h-[76px]`/`h-16` on interactive elements. No new `tailwind.config`/`globals.css` entries are introduced (YAGNI); if a repeated pattern emerges during the pilots, extract a utility class then.
- **Copy:** Portuguese (pt-BR).
- **Commits:** one per task, conventional prefix, end message with the Co-Authored-By trailer:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- **Reused existing types (do NOT redefine — import from `@/contexts/assignment-context`):**
  - `type UserRole = "admin" | "defensor" | "servidor" | "estagiario" | "triagem"`
  - `interface AssignmentMenuItem { label: string; path: string; icon: string; description?: string; isPremium?: boolean; requiredRoles?: UserRole[] }`
  - `interface MenuSection { id?: string; title: string; items: AssignmentMenuItem[]; collapsible?: boolean; defaultOpen?: boolean }`
  - `useAssignment()` returns `{ currentAssignment, config, modules: MenuSection[], ... }`
  - Exported constants: `COLLAPSIBLE_MENU_GROUPS: MenuSection[]`, `UTILITIES_MENU: AssignmentMenuItem[]`, `TEAM_MENU_ITEM: AssignmentMenuItem`.

---

## Task 1: Nav registry (bottom tabs + launcher groups)

Pure data + helpers that both the bottom nav and the launcher consume. No JSX, fully unit-testable.

**Files:**
- Create: `src/components/layouts/nav-registry.ts`
- Test: `src/components/layouts/__tests__/nav-registry.test.ts`

**Interfaces:**
- Consumes: `AssignmentMenuItem`, `MenuSection`, `UserRole`, `COLLAPSIBLE_MENU_GROUPS`, `UTILITIES_MENU` from `@/contexts/assignment-context`; `LucideIcon`, `LayoutDashboard`, `Calendar`, `FileText`, `Users` from `lucide-react`.
- Produces:
  - `type BottomTab = { label: string; icon: LucideIcon; path: string; matchExact?: boolean }`
  - `const BOTTOM_TABS: BottomTab[]`
  - `type LauncherGroup = { title: string; items: AssignmentMenuItem[] }`
  - `function isTabActive(pathname: string, tab: BottomTab): boolean`
  - `function getLauncherGroups(modules: MenuSection[], role: UserRole): LauncherGroup[]`

- [ ] **Step 1: Write the failing test**

```ts
// src/components/layouts/__tests__/nav-registry.test.ts
import { describe, it, expect } from "vitest";
import {
  BOTTOM_TABS,
  isTabActive,
  getLauncherGroups,
} from "@/components/layouts/nav-registry";
import type { MenuSection } from "@/contexts/assignment-context";

describe("BOTTOM_TABS", () => {
  it("has exactly 4 fixed tabs in order Home, Agenda, Demandas, Assistidos", () => {
    expect(BOTTOM_TABS.map((t) => t.label)).toEqual([
      "Home",
      "Agenda",
      "Demandas",
      "Assistidos",
    ]);
    expect(BOTTOM_TABS.map((t) => t.path)).toEqual([
      "/admin",
      "/admin/agenda",
      "/admin/demandas",
      "/admin/assistidos",
    ]);
  });
});

describe("isTabActive", () => {
  const home = BOTTOM_TABS[0]; // /admin, matchExact
  const demandas = BOTTOM_TABS[2]; // /admin/demandas
  it("matches Home only exactly", () => {
    expect(isTabActive("/admin", home)).toBe(true);
    expect(isTabActive("/admin/demandas", home)).toBe(false);
  });
  it("matches prefix tabs on subpaths", () => {
    expect(isTabActive("/admin/demandas", demandas)).toBe(true);
    expect(isTabActive("/admin/demandas/123", demandas)).toBe(true);
    expect(isTabActive("/admin/assistidos", demandas)).toBe(false);
  });
});

describe("getLauncherGroups", () => {
  const modules: MenuSection[] = [
    { title: "Plenário", items: [{ label: "Sessões", path: "/admin/juri", icon: "Gavel" }] },
  ];
  it("prepends the assignment modules, then global + system groups", () => {
    const groups = getLauncherGroups(modules, "defensor");
    expect(groups[0].title).toBe("Plenário");
    expect(groups.some((g) => g.title === "Cadastros")).toBe(true);
    expect(groups.some((g) => g.title === "Sistema")).toBe(true);
  });
  it("filters items whose requiredRoles exclude the current role", () => {
    const restricted: MenuSection[] = [
      {
        title: "Restrito",
        items: [
          { label: "Só admin", path: "/admin/x", icon: "Lock", requiredRoles: ["admin"] },
          { label: "Todos", path: "/admin/y", icon: "Globe" },
        ],
      },
    ];
    const groups = getLauncherGroups(restricted, "estagiario");
    const restrito = groups.find((g) => g.title === "Restrito")!;
    expect(restrito.items.map((i) => i.label)).toEqual(["Todos"]);
  });
  it("drops groups left empty after role filtering", () => {
    const restricted: MenuSection[] = [
      { title: "VazioPraEstagiario", items: [{ label: "X", path: "/admin/x", icon: "Lock", requiredRoles: ["admin"] }] },
    ];
    const groups = getLauncherGroups(restricted, "estagiario");
    expect(groups.some((g) => g.title === "VazioPraEstagiario")).toBe(false);
  });
  it("dedupes items by path across groups (first wins)", () => {
    const dup: MenuSection[] = [
      { title: "A", items: [{ label: "Assistidos", path: "/admin/assistidos", icon: "Users" }] },
    ];
    const groups = getLauncherGroups(dup, "defensor");
    const allPaths = groups.flatMap((g) => g.items.map((i) => i.path));
    const occurrences = allPaths.filter((p) => p === "/admin/assistidos").length;
    expect(occurrences).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layouts/__tests__/nav-registry.test.ts`
Expected: FAIL — cannot resolve `@/components/layouts/nav-registry`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/components/layouts/nav-registry.ts
import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Calendar, FileText, Users } from "lucide-react";
import {
  COLLAPSIBLE_MENU_GROUPS,
  UTILITIES_MENU,
  type AssignmentMenuItem,
  type MenuSection,
  type UserRole,
} from "@/contexts/assignment-context";

export type BottomTab = {
  label: string;
  icon: LucideIcon;
  path: string;
  /** When true, the tab is active only on an exact pathname match. */
  matchExact?: boolean;
};

/** The 4 fixed bottom-bar tabs. "Mais" is rendered separately by MobileBottomNav. */
export const BOTTOM_TABS: BottomTab[] = [
  { label: "Home", icon: LayoutDashboard, path: "/admin", matchExact: true },
  { label: "Agenda", icon: Calendar, path: "/admin/agenda" },
  { label: "Demandas", icon: FileText, path: "/admin/demandas" },
  { label: "Assistidos", icon: Users, path: "/admin/assistidos" },
];

export function isTabActive(pathname: string, tab: BottomTab): boolean {
  if (tab.matchExact) return pathname === tab.path;
  return pathname === tab.path || pathname.startsWith(tab.path + "/");
}

export type LauncherGroup = { title: string; items: AssignmentMenuItem[] };

function roleAllows(item: AssignmentMenuItem, role: UserRole): boolean {
  return !item.requiredRoles || item.requiredRoles.includes(role);
}

/**
 * Combines the current assignment's modules with the global collapsible groups
 * and the utilities menu ("Sistema"), filtered by role and deduped by path.
 */
export function getLauncherGroups(
  modules: MenuSection[],
  role: UserRole,
): LauncherGroup[] {
  const sourceGroups: LauncherGroup[] = [
    ...modules.map((m) => ({ title: m.title, items: m.items })),
    ...COLLAPSIBLE_MENU_GROUPS.map((g) => ({ title: g.title, items: g.items })),
    { title: "Sistema", items: UTILITIES_MENU },
  ];

  const seen = new Set<string>();
  const result: LauncherGroup[] = [];
  for (const group of sourceGroups) {
    const items = group.items.filter((it) => {
      if (!roleAllows(it, role)) return false;
      if (seen.has(it.path)) return false;
      seen.add(it.path);
      return true;
    });
    if (items.length > 0) result.push({ title: group.title, items });
  }
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/layouts/__tests__/nav-registry.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/components/layouts/nav-registry.ts src/components/layouts/__tests__/nav-registry.test.ts
git commit -m "feat(mobile): nav registry — bottom tabs + launcher groups

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Command-palette open event

A tiny pure module that lets any mobile control open the existing command palette without prop drilling. Mirrors the existing `open-seeu-import` CustomEvent pattern.

**Files:**
- Create: `src/lib/events/command-palette.ts`
- Test: `src/lib/events/__tests__/command-palette.test.ts`

**Interfaces:**
- Produces:
  - `const OPEN_COMMAND_PALETTE_EVENT = "ombuds:open-command-palette"`
  - `function openCommandPalette(): void`
  - `function onOpenCommandPalette(handler: () => void): () => void` (subscribe, returns unsubscribe)

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment happy-dom
// src/lib/events/__tests__/command-palette.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  OPEN_COMMAND_PALETTE_EVENT,
  openCommandPalette,
  onOpenCommandPalette,
} from "@/lib/events/command-palette";

afterEach(() => vi.restoreAllMocks());

describe("command-palette events", () => {
  it("openCommandPalette dispatches the named event", () => {
    const spy = vi.fn();
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, spy);
    openCommandPalette();
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, spy);
  });

  it("onOpenCommandPalette subscribes and unsubscribes", () => {
    const handler = vi.fn();
    const off = onOpenCommandPalette(handler);
    openCommandPalette();
    expect(handler).toHaveBeenCalledTimes(1);
    off();
    openCommandPalette();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/events/__tests__/command-palette.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/events/command-palette.ts
export const OPEN_COMMAND_PALETTE_EVENT = "ombuds:open-command-palette";

/** Opens the global command palette (search overlay) from anywhere. */
export function openCommandPalette(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
}

/** Subscribe to open requests. Returns an unsubscribe function. */
export function onOpenCommandPalette(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, handler);
  return () => window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, handler);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/events/__tests__/command-palette.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/events/command-palette.ts src/lib/events/__tests__/command-palette.test.ts
git commit -m "feat(mobile): global open-command-palette event

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Wire the palette to the open event

Make the existing `CommandPalette` open when the event fires. Small integration edit; covered by Task 2's unit test plus typecheck.

**Files:**
- Modify: `src/components/shared/command-palette.tsx` (the `useEffect` for the Cmd+K listener, ~line 128–137)

**Interfaces:**
- Consumes: `onOpenCommandPalette` from `@/lib/events/command-palette`; existing `setOpen` state setter in the component.

- [ ] **Step 1: Add the import**

At the top of `src/components/shared/command-palette.tsx`, alongside the other `@/lib` imports, add:

```ts
import { onOpenCommandPalette } from "@/lib/events/command-palette";
```

- [ ] **Step 2: Subscribe in an effect**

Immediately after the existing Cmd+K `useEffect` (the block that ends with `return () => window.removeEventListener("keydown", handleKeyDown);`), add:

```tsx
  // Open on the global event (mobile magnifier, launcher search field, etc.)
  useEffect(() => {
    return onOpenCommandPalette(() => setOpen(true));
  }, []);
```

- [ ] **Step 3: Verify typecheck + existing tests**

Run: `npm run typecheck`
Expected: no new errors.
Run: `npx vitest run src/lib/events/__tests__/command-palette.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/command-palette.tsx
git commit -m "feat(mobile): open command palette via global event

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Icon resolver + MobileMoreSheet (launcher)

The bottom-sheet "Mais" launcher: a grouped app-grid of every section for the current assignment + globals, with a subtle search field at the top that opens the command palette.

**Files:**
- Create: `src/components/shared/mobile/resolve-icon.tsx`
- Create: `src/components/shared/mobile/mobile-more-sheet.tsx`
- Test: `src/components/shared/mobile/__tests__/mobile-more-sheet.test.tsx`

**Interfaces:**
- Consumes: `getLauncherGroups`, `LauncherGroup` (Task 1); `openCommandPalette` (Task 2); `useAssignment` (`{ currentAssignment, modules }`) — plus role. Role source: `useAssignment().config` does not carry the user role, so the sheet accepts `role: UserRole` as a prop from its mounting parent (Task 6 passes it). `Sheet, SheetContent` from `@/components/ui/sheet`; `resolveIcon`.
- Produces:
  - `resolve-icon.tsx`: `function resolveIcon(name: string): LucideIcon`
  - `mobile-more-sheet.tsx`: `function MobileMoreSheet(props: { open: boolean; onOpenChange: (o: boolean) => void; role: UserRole })`

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment happy-dom
// src/components/shared/mobile/__tests__/mobile-more-sheet.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MobileMoreSheet } from "@/components/shared/mobile/mobile-more-sheet";

afterEach(cleanup);

// Mock the assignment context so the sheet has grouped modules to render.
vi.mock("@/contexts/assignment-context", async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>);
  return {
    ...actual,
    useAssignment: () => ({
      currentAssignment: "JURI_CAMACARI",
      modules: [
        { title: "Plenário", items: [{ label: "Sessões do Júri", path: "/admin/juri", icon: "Gavel" }] },
      ],
    }),
  };
});

// Mock the open-palette event to observe the search field wiring.
const openSpy = vi.fn();
vi.mock("@/lib/events/command-palette", () => ({
  openCommandPalette: () => openSpy(),
}));

describe("MobileMoreSheet", () => {
  it("renders grouped section titles and items when open", () => {
    render(<MobileMoreSheet open onOpenChange={() => {}} role="defensor" />);
    expect(screen.getByText("Plenário")).toBeInTheDocument();
    expect(screen.getByText("Sessões do Júri")).toBeInTheDocument();
    // A global group from COLLAPSIBLE_MENU_GROUPS is present too:
    expect(screen.getByText("Cadastros")).toBeInTheDocument();
  });

  it("the search field opens the command palette and closes the sheet", () => {
    const onOpenChange = vi.fn();
    render(<MobileMoreSheet open onOpenChange={onOpenChange} role="defensor" />);
    fireEvent.click(screen.getByText(/Buscar seção/i));
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/shared/mobile/__tests__/mobile-more-sheet.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the icon resolver**

```tsx
// src/components/shared/mobile/resolve-icon.tsx
import * as Icons from "lucide-react";
import { Circle, type LucideIcon } from "lucide-react";

/** Resolves an assignment-menu icon name (string) to a lucide component. */
export function resolveIcon(name: string): LucideIcon {
  const map = Icons as unknown as Record<string, LucideIcon>;
  return map[name] ?? Circle;
}
```

- [ ] **Step 4: Write the launcher**

```tsx
// src/components/shared/mobile/mobile-more-sheet.tsx
"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAssignment, type UserRole } from "@/contexts/assignment-context";
import { getLauncherGroups } from "@/components/layouts/nav-registry";
import { openCommandPalette } from "@/lib/events/command-palette";
import { resolveIcon } from "@/components/shared/mobile/resolve-icon";
import { cn } from "@/lib/utils";

export function MobileMoreSheet({
  open,
  onOpenChange,
  role,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  role: UserRole;
}) {
  const { modules } = useAssignment();
  const groups = getLauncherGroups(modules, role);

  function handleSearch() {
    onOpenChange(false);
    openCommandPalette();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-2xl p-0 md:hidden"
      >
        <div className="flex h-full flex-col">
          {/* Subtle search entry — opens the command palette */}
          <div className="p-4 pb-2">
            <button
              type="button"
              onClick={handleSearch}
              className="flex h-11 w-full items-center gap-2 rounded-xl bg-muted px-3 text-sm text-muted-foreground"
            >
              <Search className="h-4 w-4" />
              Buscar seção, assistido, demanda…
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            {groups.map((group) => (
              <section key={group.title} className="mb-5">
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.title}
                </h3>
                <ul className="grid grid-cols-3 gap-3">
                  {group.items.map((item) => {
                    const Icon = resolveIcon(item.icon);
                    return (
                      <li key={item.path}>
                        <Link
                          href={item.path}
                          onClick={() => onOpenChange(false)}
                          className={cn(
                            "flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl p-2 text-center",
                            "bg-card active:bg-accent transition-colors",
                          )}
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="text-[11px] leading-tight text-foreground line-clamp-2">
                            {item.label}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/shared/mobile/__tests__/mobile-more-sheet.test.tsx`
Expected: PASS. (`UserRole`, `AssignmentMenuItem`, `MenuSection`, `COLLAPSIBLE_MENU_GROUPS`, `UTILITIES_MENU` are all already exported from `assignment-context` — verified against the current file.)

- [ ] **Step 6: Commit**

```bash
git add src/components/shared/mobile/resolve-icon.tsx src/components/shared/mobile/mobile-more-sheet.tsx src/components/shared/mobile/__tests__/mobile-more-sheet.test.tsx
git commit -m "feat(mobile): MobileMoreSheet launcher + icon resolver

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Refactor MobileBottomNav (4 tabs + Mais)

Replace the hardcoded 5-item nav with a registry-driven 4 tabs + a "Mais" button that owns and toggles the launcher.

**Files:**
- Modify (rewrite): `src/components/shared/mobile-bottom-nav.tsx`
- Test: `src/components/shared/__tests__/mobile-bottom-nav.test.tsx`

**Interfaces:**
- Consumes: `BOTTOM_TABS`, `isTabActive` (Task 1); `MobileMoreSheet` (Task 4); `usePathname` (next).
- Produces: `function MobileBottomNav(props: { role: UserRole })` — role forwarded to the launcher.

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment happy-dom
// src/components/shared/__tests__/mobile-bottom-nav.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MobileBottomNav } from "@/components/shared/mobile-bottom-nav";

afterEach(cleanup);

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/demandas" }));
vi.mock("@/contexts/assignment-context", async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>);
  return { ...actual, useAssignment: () => ({ currentAssignment: "SUBSTITUICAO", modules: [] }) };
});

describe("MobileBottomNav", () => {
  it("renders 4 tabs plus a Mais button", () => {
    render(<MobileBottomNav role="defensor" />);
    ["Home", "Agenda", "Demandas", "Assistidos", "Mais"].forEach((label) =>
      expect(screen.getByText(label)).toBeInTheDocument(),
    );
  });

  it("marks the active tab from the pathname", () => {
    render(<MobileBottomNav role="defensor" />);
    const demandas = screen.getByText("Demandas").closest("a")!;
    expect(demandas).toHaveAttribute("aria-current", "page");
  });

  it("opens the launcher when Mais is tapped", () => {
    render(<MobileBottomNav role="defensor" />);
    fireEvent.click(screen.getByText("Mais"));
    // The launcher search field becomes visible.
    expect(screen.getByText(/Buscar seção/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/shared/__tests__/mobile-bottom-nav.test.tsx`
Expected: FAIL — old component has no "Mais" and no `role` prop.

- [ ] **Step 3: Rewrite the component**

```tsx
// src/components/shared/mobile-bottom-nav.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOTTOM_TABS, isTabActive } from "@/components/layouts/nav-registry";
import { MobileMoreSheet } from "@/components/shared/mobile/mobile-more-sheet";
import type { UserRole } from "@/contexts/assignment-context";

export function MobileBottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
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

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-neutral-500 transition-colors duration-150 active:text-emerald-400"
          >
            <MoreHorizontal className="mt-1 h-5 w-5" />
            <span className="text-[10px] font-medium leading-tight">Mais</span>
          </button>
        </div>
      </nav>

      <MobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} role={role} />
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/shared/__tests__/mobile-bottom-nav.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/mobile-bottom-nav.tsx src/components/shared/__tests__/mobile-bottom-nav.test.tsx
git commit -m "feat(mobile): registry-driven bottom nav (4 tabs + Mais launcher)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Mount the new nav + subtle search, retire the ☰ drawer on mobile

Wire the refactored nav into the shell, add a mobile-only magnifier that opens the palette, and hide the desktop sidebar trigger (☰) on mobile so "Mais" is the single mobile entry point.

**Files:**
- Modify: `src/components/layouts/admin-sidebar.tsx` — the `<MobileBottomNav />` mount (~line 2065). Pass the user role. The component tree already knows the role via `userRole` (used by `MoreMenu`); reuse that variable. If `userRole` is not in scope at the mount site, thread it from the same source the sidebar already uses.
- Modify: `src/components/layouts/header-utility-row.tsx` — add mobile magnifier; hide `SidebarTrigger` on mobile.

**Interfaces:**
- Consumes: `MobileBottomNav` (now requires `role: UserRole`); `openCommandPalette` (Task 2).

- [ ] **Step 1: Pass role to the bottom nav**

In `admin-sidebar.tsx`, change the mount:

```tsx
{/* Mobile bottom navigation */}
<MobileBottomNav role={userRole} />
```

(`userRole` is the same value passed to `MoreMenu`/`NewsMenu`/`ToolsMenu` above. If the mount site is outside that variable's scope, lift the `role` from the same prop/hook those menus use.)

- [ ] **Step 2: Add the mobile magnifier and hide ☰ on mobile**

In `header-utility-row.tsx`:

Add imports:

```tsx
import { MessageSquare, Search } from "lucide-react";
import { openCommandPalette } from "@/lib/events/command-palette";
```

Change the `SidebarTrigger` to be desktop-only:

```tsx
<SidebarTrigger className="hidden md:inline-flex h-6 w-6 rounded-md text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-all duration-200 shrink-0" />
```

In the right-side controls cluster, immediately before `<CommandPalette />`, add a mobile-only magnifier:

```tsx
<button
  type="button"
  onClick={() => openCommandPalette()}
  aria-label="Buscar"
  className="md:hidden inline-flex items-center justify-center h-7 w-7 rounded-md text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-colors"
>
  <Search className="h-4 w-4" />
</button>
```

And make the palette's own trigger button desktop-only by wrapping its mount:

```tsx
<span className="hidden md:inline-flex"><CommandPalette /></span>
```

- [ ] **Step 3: Manual verification (dev server, mobile viewport)**

Run: `npm run dev` then open `http://localhost:3000/admin/demandas` in a 390px-wide viewport (DevTools device toolbar).
Expected:
- Bottom bar shows Home · Agenda · Demandas · Assistidos · Mais.
- The top-left ☰ is gone on mobile; a magnifier appears in the header and opens the palette.
- Tapping "Mais" opens the launcher grid with a search field; tapping a grid item navigates and closes the sheet.
- At ≥768px the desktop sidebar and ☰ are unchanged.

- [ ] **Step 4: Typecheck + commit**

Run: `npm run typecheck`
Expected: no new errors.

```bash
git add src/components/layouts/admin-sidebar.tsx src/components/layouts/header-utility-row.tsx
git commit -m "feat(mobile): mount registry nav, add subtle search, retire drawer on mobile

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: MobilePageShell

Standard page wrapper: consistent padding, safe-area, and bottom-nav clearance on mobile; a no-op passthrough on desktop.

**Files:**
- Create: `src/components/shared/mobile/mobile-page-shell.tsx`
- Test: `src/components/shared/mobile/__tests__/mobile-page-shell.test.tsx`

**Interfaces:**
- Produces: `function MobilePageShell(props: { children: React.ReactNode; className?: string })`

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment happy-dom
// src/components/shared/mobile/__tests__/mobile-page-shell.test.tsx
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MobilePageShell } from "@/components/shared/mobile/mobile-page-shell";

afterEach(cleanup);

describe("MobilePageShell", () => {
  it("renders children", () => {
    render(<MobilePageShell><p>conteúdo</p></MobilePageShell>);
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });
  it("applies bottom-nav clearance only below md", () => {
    const { container } = render(<MobilePageShell>x</MobilePageShell>);
    expect(container.firstElementChild?.className).toContain("pb-20");
    expect(container.firstElementChild?.className).toContain("md:pb-0");
  });
  it("merges a custom className", () => {
    const { container } = render(<MobilePageShell className="bg-red-500">x</MobilePageShell>);
    expect(container.firstElementChild?.className).toContain("bg-red-500");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/shared/mobile/__tests__/mobile-page-shell.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

```tsx
// src/components/shared/mobile/mobile-page-shell.tsx
import { cn } from "@/lib/utils";

/**
 * Standard page container. On mobile it adds horizontal padding and bottom
 * clearance for the fixed bottom nav; on desktop (md+) those are removed.
 */
export function MobilePageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-4 pb-20 md:px-0 md:pb-0", className)}>{children}</div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/shared/mobile/__tests__/mobile-page-shell.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/mobile/mobile-page-shell.tsx src/components/shared/mobile/__tests__/mobile-page-shell.test.tsx
git commit -m "feat(mobile): MobilePageShell primitive

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: ResponsiveDialog

Radix `Dialog` on desktop; bottom `Sheet` on mobile — one API, decided by `useIsMobile()`.

**Files:**
- Create: `src/components/ui/responsive-dialog.tsx`
- Test: `src/components/ui/__tests__/responsive-dialog.test.tsx`

**Interfaces:**
- Consumes: `useIsMobile` (`@/hooks/use-mobile`); `Dialog*` (`@/components/ui/dialog`); `Sheet*` (`@/components/ui/sheet`).
- Produces: `ResponsiveDialog, ResponsiveDialogTrigger, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter` — same prop shapes as the Dialog equivalents.

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment happy-dom
// src/components/ui/__tests__/responsive-dialog.test.tsx
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";

const isMobile = vi.fn();
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => isMobile() }));

afterEach(cleanup);
beforeEach(() => isMobile.mockReset());

function renderOpen() {
  return render(
    <ResponsiveDialog open onOpenChange={() => {}}>
      <ResponsiveDialogContent>
        <ResponsiveDialogTitle>Título</ResponsiveDialogTitle>
      </ResponsiveDialogContent>
    </ResponsiveDialog>,
  );
}

describe("ResponsiveDialog", () => {
  it("renders content on desktop", () => {
    isMobile.mockReturnValue(false);
    renderOpen();
    expect(screen.getByText("Título")).toBeInTheDocument();
  });
  it("renders content on mobile (as bottom sheet)", () => {
    isMobile.mockReturnValue(true);
    renderOpen();
    expect(screen.getByText("Título")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/__tests__/responsive-dialog.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

```tsx
// src/components/ui/responsive-dialog.tsx
"use client";

import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type RootProps = { open?: boolean; onOpenChange?: (o: boolean) => void; children: React.ReactNode };

export function ResponsiveDialog(props: RootProps) {
  const isMobile = useIsMobile();
  const Root = isMobile ? Sheet : Dialog;
  return <Root {...props} />;
}

export function ResponsiveDialogTrigger(
  props: React.ComponentProps<typeof DialogTrigger>,
) {
  const isMobile = useIsMobile();
  const Trigger = isMobile ? SheetTrigger : DialogTrigger;
  return <Trigger {...props} />;
}

export function ResponsiveDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <SheetContent
        side="bottom"
        className={cn("max-h-[90vh] overflow-y-auto rounded-t-2xl", className)}
        {...props}
      >
        {children}
      </SheetContent>
    );
  }
  return (
    <DialogContent className={className} {...props}>
      {children}
    </DialogContent>
  );
}

export function ResponsiveDialogHeader(props: React.ComponentProps<"div">) {
  const isMobile = useIsMobile();
  const Header = isMobile ? SheetHeader : DialogHeader;
  return <Header {...props} />;
}

export function ResponsiveDialogFooter(props: React.ComponentProps<"div">) {
  const isMobile = useIsMobile();
  const Footer = isMobile ? SheetFooter : DialogFooter;
  return <Footer {...props} />;
}

export function ResponsiveDialogTitle(
  props: React.ComponentProps<typeof DialogTitle>,
) {
  const isMobile = useIsMobile();
  const Title = isMobile ? SheetTitle : DialogTitle;
  return <Title {...props} />;
}

export function ResponsiveDialogDescription(
  props: React.ComponentProps<typeof DialogDescription>,
) {
  const isMobile = useIsMobile();
  const Description = isMobile ? SheetDescription : DialogDescription;
  return <Description {...props} />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/__tests__/responsive-dialog.test.tsx`
Expected: PASS. (If `ui/sheet` does not export `SheetHeader/SheetFooter/SheetTitle/SheetDescription`, confirm the names via `grep -n "export" src/components/ui/sheet.tsx` and adjust imports to the actual exports — the file exports the standard shadcn Sheet set.)

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/responsive-dialog.tsx src/components/ui/__tests__/responsive-dialog.test.tsx
git commit -m "feat(mobile): ResponsiveDialog (dialog on desktop, bottom sheet on mobile)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: ResponsiveTable / DataCards

A table on desktop that collapses into stacked cards below `md`.

**Files:**
- Create: `src/components/ui/responsive-table.tsx`
- Test: `src/components/ui/__tests__/responsive-table.test.tsx`

**Interfaces:**
- Consumes: `useIsMobile`; `Table, TableHeader, TableBody, TableRow, TableHead, TableCell` (`@/components/ui/table`).
- Produces:
  - `type Column<T> = { key: string; header: string; cell: (row: T) => React.ReactNode; hideOnCard?: boolean }`
  - `function ResponsiveTable<T>(props: { columns: Column<T>[]; rows: T[]; getRowKey: (row: T) => string; renderCard?: (row: T) => React.ReactNode; onRowClick?: (row: T) => void })`

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment happy-dom
// src/components/ui/__tests__/responsive-table.test.tsx
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ResponsiveTable, type Column } from "@/components/ui/responsive-table";

const isMobile = vi.fn();
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => isMobile() }));

afterEach(cleanup);
beforeEach(() => isMobile.mockReset());

type Row = { id: string; nome: string; status: string };
const columns: Column<Row>[] = [
  { key: "nome", header: "Nome", cell: (r) => r.nome },
  { key: "status", header: "Status", cell: (r) => r.status },
];
const rows: Row[] = [
  { id: "1", nome: "João", status: "Ativo" },
  { id: "2", nome: "Maria", status: "Pendente" },
];

function renderTable() {
  return render(
    <ResponsiveTable columns={columns} rows={rows} getRowKey={(r) => r.id} />,
  );
}

describe("ResponsiveTable", () => {
  it("renders a <table> on desktop", () => {
    isMobile.mockReturnValue(false);
    const { container } = renderTable();
    expect(container.querySelector("table")).toBeTruthy();
    expect(screen.getByText("João")).toBeInTheDocument();
  });
  it("renders stacked cards (no <table>) on mobile", () => {
    isMobile.mockReturnValue(true);
    const { container } = renderTable();
    expect(container.querySelector("table")).toBeNull();
    expect(screen.getByText("João")).toBeInTheDocument();
    // Card view shows the column header as a label:
    expect(screen.getAllByText("Status").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/__tests__/responsive-table.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

```tsx
// src/components/ui/responsive-table.tsx
"use client";

import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Omit this column from the mobile card body (e.g. redundant/id columns). */
  hideOnCard?: boolean;
};

export function ResponsiveTable<T>({
  columns,
  rows,
  getRowKey,
  renderCard,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  renderCard?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li
            key={getRowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              "rounded-xl border bg-card p-3",
              onRowClick && "active:bg-accent cursor-pointer",
            )}
          >
            {renderCard ? (
              renderCard(row)
            ) : (
              <dl className="flex flex-col gap-1.5">
                {columns
                  .filter((c) => !c.hideOnCard)
                  .map((c) => (
                    <div key={c.key} className="flex items-baseline justify-between gap-3">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {c.header}
                      </dt>
                      <dd className="text-right text-sm text-foreground">{c.cell(row)}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((c) => (
            <TableHead key={c.key}>{c.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={getRowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={onRowClick ? "cursor-pointer" : undefined}
          >
            {columns.map((c) => (
              <TableCell key={c.key}>{c.cell(row)}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/__tests__/responsive-table.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/responsive-table.tsx src/components/ui/__tests__/responsive-table.test.tsx
git commit -m "feat(mobile): ResponsiveTable — collapses to cards below md

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: MobileActionBar

A sticky, thumb-zone action bar for a page's primary actions; renders only on mobile, sitting above the bottom nav.

**Files:**
- Create: `src/components/shared/mobile/mobile-action-bar.tsx`
- Test: `src/components/shared/mobile/__tests__/mobile-action-bar.test.tsx`

**Interfaces:**
- Consumes: `useIsMobile`.
- Produces: `function MobileActionBar(props: { children: React.ReactNode; className?: string })`

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment happy-dom
// src/components/shared/mobile/__tests__/mobile-action-bar.test.tsx
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MobileActionBar } from "@/components/shared/mobile/mobile-action-bar";

const isMobile = vi.fn();
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => isMobile() }));

afterEach(cleanup);
beforeEach(() => isMobile.mockReset());

describe("MobileActionBar", () => {
  it("renders nothing on desktop", () => {
    isMobile.mockReturnValue(false);
    const { container } = render(<MobileActionBar><button>Salvar</button></MobileActionBar>);
    expect(container.firstChild).toBeNull();
  });
  it("renders children on mobile", () => {
    isMobile.mockReturnValue(true);
    render(<MobileActionBar><button>Salvar</button></MobileActionBar>);
    expect(screen.getByText("Salvar")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/shared/mobile/__tests__/mobile-action-bar.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

```tsx
// src/components/shared/mobile/mobile-action-bar.tsx
"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Sticky action bar for primary page actions on mobile. Sits above the fixed
 * bottom nav (h-16) and respects the safe-area inset. Renders nothing on desktop.
 */
export function MobileActionBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const isMobile = useIsMobile();
  if (!isMobile) return null;
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-16 z-40 border-t bg-background/95 backdrop-blur-xl",
        "flex items-center gap-2 px-4 py-3",
        "pb-[calc(env(safe-area-inset-bottom)+0.75rem)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/shared/mobile/__tests__/mobile-action-bar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/mobile/mobile-action-bar.tsx src/components/shared/mobile/__tests__/mobile-action-bar.test.tsx
git commit -m "feat(mobile): MobileActionBar primitive

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: FilterSheet

A button that opens a bottom sheet holding filters/sort controls on mobile; on desktop it renders its trigger inline so pages can keep filters visible. Keeps the API minimal — the page supplies the trigger label and the filter body.

**Files:**
- Create: `src/components/shared/mobile/filter-sheet.tsx`
- Test: `src/components/shared/mobile/__tests__/filter-sheet.test.tsx`

**Interfaces:**
- Consumes: `Sheet, SheetTrigger, SheetContent, SheetTitle` (`@/components/ui/sheet`); `Button` (`@/components/ui/button`); `SlidersHorizontal` (lucide).
- Produces: `function FilterSheet(props: { children: React.ReactNode; triggerLabel?: string; activeCount?: number })`

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment happy-dom
// src/components/shared/mobile/__tests__/filter-sheet.test.tsx
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { FilterSheet } from "@/components/shared/mobile/filter-sheet";

afterEach(cleanup);

describe("FilterSheet", () => {
  it("opens the sheet and shows the filter body", () => {
    render(
      <FilterSheet triggerLabel="Filtros" activeCount={2}>
        <label>Status</label>
      </FilterSheet>,
    );
    // Badge shows active count on the trigger.
    expect(screen.getByText("2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Filtros/i }));
    expect(screen.getByText("Status")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/shared/mobile/__tests__/filter-sheet.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

```tsx
// src/components/shared/mobile/filter-sheet.tsx
"use client";

import { SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/**
 * Wraps filter/sort controls in a bottom sheet behind a "Filtros" button.
 * Use on data-dense pages where inline filters do not fit on a phone.
 */
export function FilterSheet({
  children,
  triggerLabel = "Filtros",
  activeCount = 0,
}: {
  children: React.ReactNode;
  triggerLabel?: string;
  activeCount?: number;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          {triggerLabel}
          {activeCount > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[11px] font-semibold text-white">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetTitle className="mb-4">{triggerLabel}</SheetTitle>
        <div className="flex flex-col gap-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/shared/mobile/__tests__/filter-sheet.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/mobile/filter-sheet.tsx src/components/shared/mobile/__tests__/filter-sheet.test.tsx
git commit -m "feat(mobile): FilterSheet primitive

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Mobile Playwright smoke on the public shell

There is no e2e auth harness (the only existing spec hits public `/`), so authenticated-page smoke is deferred to Phase 1. This task adds a mobile-viewport smoke on the public login page to catch gross horizontal overflow regressions in the app shell/CSS.

**Files:**
- Create: `e2e/mobile-shell.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
// e2e/mobile-shell.spec.ts
import { test, expect } from "@playwright/test";

const MOBILE = { width: 390, height: 844 };

test.describe("Mobile shell: no horizontal overflow", () => {
  test.use({ viewport: MOBILE });

  test("login page fits a 390px viewport", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 30000 });
    // No element pushes the document wider than the viewport.
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth - document.documentElement.clientWidth;
    });
    expect(overflow, "document should not scroll horizontally").toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run the spec (dev server must be running)**

Run (in one shell): `npm run dev`
Run (in another): `npx playwright test e2e/mobile-shell.spec.ts`
Expected: PASS. If `/login` is not the correct public route, use the actual login path from `src/app/(auth)/login/`.

- [ ] **Step 3: Commit**

```bash
git add e2e/mobile-shell.spec.ts
git commit -m "test(mobile): Playwright smoke — no horizontal overflow at 390px

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Mobile audit checklist (document)

A reusable per-page checklist that drives the Phase 1 sweep and the pilot validation below.

**Files:**
- Create: `docs/superpowers/checklists/mobile-page-audit.md`

- [ ] **Step 1: Write the checklist**

```markdown
# Checklist de Auditoria Mobile — por página

Testar a 375px e 390px (DevTools device toolbar), modo claro e escuro.

## Layout & overflow
- [ ] Sem scroll horizontal (nada empurra a página além da viewport).
- [ ] Sem larguras fixas em px que estourem (`w-[NNNpx]`, tabelas largas).
- [ ] Imagens/embeds com `max-width: 100%`.

## Navegação & chrome
- [ ] Bottom nav visível; conteúdo tem folga inferior (MobilePageShell / `pb-20`).
- [ ] Header não sobrepõe conteúdo; sticky funciona.
- [ ] ☰ ausente no mobile; magnifier abre a busca; "Mais" abre o launcher.

## Alvos de toque & tipografia
- [ ] Todos os alvos ≥44×44px.
- [ ] Texto legível sem zoom (mínimo ~14px em corpo).

## Componentes densos
- [ ] Tabelas → `ResponsiveTable`/cards.
- [ ] Diálogos → `ResponsiveDialog` (bottom sheet).
- [ ] Filtros inline → `FilterSheet`.
- [ ] Ações primárias → `MobileActionBar` (zona do polegar).

## Estado & segurança
- [ ] Safe-area respeitada (notch + home indicator).
- [ ] Teclado não cobre o input focado.
- [ ] `prefers-reduced-motion` respeitado.
- [ ] Sem regressão desktop (≥768px idêntico ao anterior).
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/checklists/mobile-page-audit.md
git commit -m "docs(mobile): per-page mobile audit checklist

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Pilot — Demandas page

Apply the primitives to `/admin/demandas` end-to-end to validate them on a real, data-dense page. This is a code-reading task: locate the current patterns and swap them for the primitives. The primitive APIs are fully specified in Tasks 7–11.

**Files:**
- Modify: `src/app/(dashboard)/admin/demandas/page.tsx` and its primary view component under `src/components/demandas-premium/` (identify the concrete file that renders the list/table and the "Nova demanda" dialog).

**Interfaces:**
- Consumes: `MobilePageShell` (Task 7), `ResponsiveDialog*` (Task 8), `ResponsiveTable`/`Column` (Task 9), `FilterSheet` (Task 11), `MobileActionBar` (Task 10).

- [ ] **Step 1: Map the current patterns**

Run: `grep -rn "Dialog\|<Table\|useIsMobile\|filter\|Kanban" src/app/(dashboard)/admin/demandas/page.tsx src/components/demandas-premium/demandas-premium-view.tsx`
Record: which component renders the table/list, which renders the create dialog, and where filters live.

- [ ] **Step 2: Wrap the page body in MobilePageShell**

In `demandas/page.tsx`, wrap the returned content:

```tsx
import { MobilePageShell } from "@/components/shared/mobile/mobile-page-shell";
// ...
return <MobilePageShell>{/* existing page content */}</MobilePageShell>;
```

- [ ] **Step 3: Convert the create/edit dialog**

In the file that renders the "Nova demanda" dialog, replace the Radix dialog imports/usages:

```tsx
// before: import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
```

Then rename the JSX tags (`Dialog` → `ResponsiveDialog`, `DialogContent` → `ResponsiveDialogContent`, etc.). Props are compatible.

- [ ] **Step 4: Convert the list table to ResponsiveTable (or reuse the existing card view)**

`demandas-premium` already ships `DemandaCompactView`/`DemandaCardView`. Prefer wiring the existing card view for mobile: render the card view when `useIsMobile()` and the table/kanban otherwise. If a plain table is used instead, define `Column<Demanda>[]` and use `ResponsiveTable`.

- [ ] **Step 5: Move filters into a FilterSheet on mobile**

Wrap the existing filter controls:

```tsx
import { FilterSheet } from "@/components/shared/mobile/filter-sheet";
// mobile only:
{useIsMobile() ? <FilterSheet activeCount={activeFilterCount}>{/* existing filter controls */}</FilterSheet> : /* existing inline filters */}
```

- [ ] **Step 6: Validate against the checklist + tests**

Run: `npm test` (all component tests still green).
Run: `npm run typecheck`.
Manual: open `/admin/demandas` at 390px and complete `docs/superpowers/checklists/mobile-page-audit.md`. Confirm ≥768px is unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/admin/demandas src/components/demandas-premium
git commit -m "feat(mobile): pilot Demandas on mobile primitives

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Pilot — Assistidos page

Same treatment for `/admin/assistidos` (list + detail + dialogs), validating the primitives on a second, differently-shaped page.

**Files:**
- Modify: `src/app/(dashboard)/admin/assistidos/page.tsx` and its list/detail components under `src/app/(dashboard)/admin/assistidos/_components/` and/or `src/components/assistidos/`.

**Interfaces:**
- Consumes: `MobilePageShell`, `ResponsiveDialog*`, `ResponsiveTable`/`Column`, `FilterSheet`, `MobileActionBar`.

- [ ] **Step 1: Map the current patterns**

Run: `grep -rn "Dialog\|<Table\|useIsMobile\|filter" "src/app/(dashboard)/admin/assistidos/page.tsx" "src/app/(dashboard)/admin/assistidos/_components"`
Record the list/table component, the create/edit dialog, and filters.

- [ ] **Step 2: Wrap the page in MobilePageShell**

```tsx
import { MobilePageShell } from "@/components/shared/mobile/mobile-page-shell";
return <MobilePageShell>{/* existing content */}</MobilePageShell>;
```

- [ ] **Step 3: Convert the assistidos list to ResponsiveTable**

Define columns for the mobile card view (Nome, Documento, Status) and swap the table:

```tsx
import { ResponsiveTable, type Column } from "@/components/ui/responsive-table";

const columns: Column<Assistido>[] = [
  { key: "nome", header: "Nome", cell: (a) => a.nome },
  { key: "documento", header: "Documento", cell: (a) => a.cpf ?? "—" },
  { key: "status", header: "Status", cell: (a) => a.status },
];
// ...
<ResponsiveTable
  columns={columns}
  rows={assistidos}
  getRowKey={(a) => a.id}
  onRowClick={(a) => router.push(`/admin/assistidos/${a.id}`)}
/>
```

(Use the real field names from the assistidos query type discovered in Step 1.)

- [ ] **Step 4: Convert the create/edit dialog to ResponsiveDialog**

Swap `Dialog*` → `ResponsiveDialog*` as in Task 14 Step 3.

- [ ] **Step 5: Filters → FilterSheet on mobile (if the page has filters)**

As in Task 14 Step 5.

- [ ] **Step 6: Validate against the checklist + tests**

Run: `npm test` and `npm run typecheck` (green).
Manual: `/admin/assistidos` at 390px vs the checklist; confirm ≥768px unchanged.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(dashboard)/admin/assistidos"
git commit -m "feat(mobile): pilot Assistidos on mobile primitives

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Definition of Done (Fase 0)

- [ ] `nav-registry.ts`, `command-palette` events, `resolve-icon`, all with passing unit tests.
- [ ] Bottom nav shows 4 tabs + Mais; "Mais" opens the grouped launcher; magnifier + in-sheet field open the palette; ☰ retired on mobile; desktop unchanged.
- [ ] Primitives shipped with tests: `MobilePageShell`, `ResponsiveDialog`, `ResponsiveTable`, `MobileActionBar`, `FilterSheet`.
- [ ] Playwright mobile smoke green; audit checklist committed.
- [ ] Demandas and Assistidos pass the mobile audit checklist at 390px with no desktop regression.
- [ ] `npm test` and `npm run typecheck` pass.

## Out of scope (later phases)
- Mass rollout to the remaining ~84 sections (Phase 1).
- Bespoke hostile views: Kanban list, maps, PDF viewer, calendar agenda, júri cockpit (Phase 2).
- Gestures, pull-to-refresh, install prompt, offline UX, motion (Phase 3).
- E2E auth fixture for authenticated-page smoke tests (prerequisite for Phase 1 automated coverage).
```
