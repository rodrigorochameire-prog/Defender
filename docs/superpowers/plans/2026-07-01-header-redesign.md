# Header Redesign (Fase A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o novo header "vidro em duas camadas" (GlassHeaderShell + HeaderActionsBar com overflow automático por medição) e migrar a página Agenda como exemplar.

**Architecture:** Novos componentes em `src/components/layouts/header/`: lógica pura de overflow (`overflow-logic.ts`, TDD), barra de ações com medição via ResizeObserver (`header-actions-bar.tsx`), casca de vidro com faixa utilitária + faixa de trabalho (`glass-header-shell.tsx`) e o poço do switch de atribuições com modo colapsado (`atribuicao-switch-well.tsx`). O `CollapsiblePageHeader` atual continua existindo — as demais páginas migram num plano seguinte (Fase B: Demandas, Assistidos, varredura).

**Tech Stack:** Next.js 15 (App Router, client components), Tailwind, shadcn/ui (DropdownMenu), lucide-react, vitest.

**Spec:** `docs/superpowers/specs/2026-07-01-header-redesign-design.md`

## Global Constraints

- Copy/labels em português (padrão do app).
- Paleta Padrão Defender: cinza neutro + emerald como único acento primário; cores de atribuição via `getAtribuicaoHex` de `@/lib/config/atribuicoes`.
- Nenhuma dependência nova.
- Testes: `npx vitest run <arquivo>` (não há @testing-library/react no projeto — componentes são verificados no browser; só lógica pura ganha teste unitário).
- Dev server: `npm run dev` (Turbopack — obrigatório neste projeto).
- Nada abaixo de 11px de fonte (regra dos design tokens).
- `+ Novo` é o único botão sólido (emerald). Demais ações são ghost.
- Um único menu "…" por header; nenhuma ação pode ficar inacessível em nenhuma largura; sem scroll horizontal no header.

---

### Task 1: Lógica pura de overflow por prioridade

**Files:**
- Create: `src/components/layouts/header/overflow-logic.ts`
- Test: `src/components/layouts/header/overflow-logic.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `computeVisibleActions(items: OverflowItem[], available: number, overflowReserve: number): OverflowResult`, com `OverflowItem = { id: string; priority: number; width: number }` e `OverflowResult = { visibleIds: string[]; overflowIds: string[] }`. Task 2 depende exatamente destas assinaturas.

- [ ] **Step 1: Write the failing tests**

```ts
// src/components/layouts/header/overflow-logic.test.ts
import { describe, it, expect } from "vitest";
import { computeVisibleActions, type OverflowItem } from "./overflow-logic";

const item = (id: string, priority: number, width = 40): OverflowItem => ({ id, priority, width });

describe("computeVisibleActions", () => {
  it("mantém tudo visível quando cabe (sem reservar o botão …)", () => {
    const r = computeVisibleActions([item("a", 10), item("b", 20)], 100, 40);
    expect(r).toEqual({ visibleIds: ["a", "b"], overflowIds: [] });
  });

  it("derruba a menor prioridade primeiro, preservando a ordem visual dos visíveis", () => {
    // total 120 > 100; budget = 100 - 40 = 60 → derruba até caber
    const r = computeVisibleActions([item("a", 10), item("b", 30), item("c", 20)], 100, 40);
    expect(r.overflowIds).toEqual(["a"]); // prioridade 10 cai primeiro
    expect(r.visibleIds).toEqual(["b", "c"]); // ordem original preservada
  });

  it("derruba vários até caber", () => {
    const r = computeVisibleActions(
      [item("a", 10), item("b", 30), item("c", 20), item("d", 40)],
      100,
      40,
    ); // total 160, budget 60 → sobra 1 item de 40 + reserva
    expect(r.visibleIds).toEqual(["d"]);
    expect(r.overflowIds).toEqual(["a", "c", "b"]); // ordem original entre os que caíram
  });

  it("empate de prioridade: o item mais à direita cai primeiro", () => {
    const r = computeVisibleActions([item("a", 10), item("b", 10), item("c", 10)], 100, 40);
    // budget 60 → derruba c, depois b
    expect(r.visibleIds).toEqual(["a"]);
    expect(r.overflowIds).toEqual(["b", "c"]);
  });

  it("priority Infinity nunca cai, mesmo sem caber", () => {
    const r = computeVisibleActions([item("novo", Infinity, 80), item("x", 10, 80)], 100, 40);
    expect(r.visibleIds).toContain("novo");
    expect(r.overflowIds).toEqual(["x"]);
  });

  it("lista vazia", () => {
    expect(computeVisibleActions([], 100, 40)).toEqual({ visibleIds: [], overflowIds: [] });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/layouts/header/overflow-logic.test.ts`
Expected: FAIL — "Cannot find module './overflow-logic'" (ou equivalente).

- [ ] **Step 3: Write the implementation**

```ts
// src/components/layouts/header/overflow-logic.ts
/**
 * Overflow por prioridade do header — lógica pura (testável sem DOM).
 * Determinístico: derruba a menor prioridade primeiro (empate: o item mais
 * à direita cai primeiro) até o conjunto caber. Quando algo cai, o espaço
 * do botão "…" (overflowReserve) é descontado do disponível.
 */

export interface OverflowItem {
  id: string;
  /** Maior prioridade sobrevive mais tempo. Infinity nunca colapsa. */
  priority: number;
  /** Largura medida em px (já incluindo o gap). */
  width: number;
}

export interface OverflowResult {
  visibleIds: string[];
  overflowIds: string[];
}

export function computeVisibleActions(
  items: OverflowItem[],
  available: number,
  overflowReserve: number,
): OverflowResult {
  const totalAll = items.reduce((sum, i) => sum + i.width, 0);
  if (totalAll <= available) {
    return { visibleIds: items.map((i) => i.id), overflowIds: [] };
  }

  const budget = Math.max(0, available - overflowReserve);
  const dropOrder = items
    .map((it, index) => ({ it, index }))
    .sort((a, b) =>
      a.it.priority !== b.it.priority
        ? a.it.priority - b.it.priority
        : b.index - a.index,
    );

  const dropped = new Set<string>();
  let total = totalAll;
  for (const { it } of dropOrder) {
    if (total <= budget) break;
    if (!Number.isFinite(it.priority)) continue;
    dropped.add(it.id);
    total -= it.width;
  }

  return {
    visibleIds: items.filter((i) => !dropped.has(i.id)).map((i) => i.id),
    overflowIds: items.filter((i) => dropped.has(i.id)).map((i) => i.id),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/layouts/header/overflow-logic.test.ts`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add src/components/layouts/header/overflow-logic.ts src/components/layouts/header/overflow-logic.test.ts
git commit -m "feat(header): lógica pura de overflow por prioridade (computeVisibleActions)"
```

---

### Task 2: Tokens do vidro + HeaderActionsBar

**Files:**
- Modify: `src/lib/config/design-tokens.ts` (adicionar `HEADER_GLASS` após `HEADER_STYLE`, ~linha 116)
- Create: `src/components/layouts/header/header-actions-bar.tsx`

**Interfaces:**
- Consumes: `computeVisibleActions`, `OverflowItem` de `./overflow-logic` (Task 1).
- Produces:
  - `HEADER_GLASS` (tokens) exportado de `@/lib/config/design-tokens`.
  - `HeaderActionsBar({ actions, className }: { actions: HeaderAction[]; className?: string })` e o tipo `HeaderAction` exportados de `@/components/layouts/header/header-actions-bar`. Tasks 4 e 5 dependem exatamente destes nomes.

- [ ] **Step 1: Adicionar tokens `HEADER_GLASS` em design-tokens.ts**

Inserir após o bloco `HEADER_STYLE` (depois da linha `} as const;` em ~116):

```ts
// ============================================
// HEADER GLASS (v6 — vidro flutuante em duas camadas)
// ============================================
// Bloco de vidro translúcido com blur flutuando sobre o conteúdo.
// Fallback: sem suporte a backdrop-filter, usa fundo sólido equivalente.

export const HEADER_GLASS = {
  /** Wrapper sticky que deixa o conteúdo passar por baixo do vidro */
  wrapper: "sticky top-0 z-50 px-3 pt-2 pb-1",
  /** O bloco de vidro em si */
  shell:
    "rounded-xl overflow-hidden border border-white/[0.09] shadow-[0_8px_24px_rgba(0,0,0,0.22)] bg-[#3a3a3d] dark:bg-[#1b1b1d] supports-[backdrop-filter]:bg-[#303033]/80 dark:supports-[backdrop-filter]:bg-[#171719]/75 supports-[backdrop-filter]:backdrop-blur-xl",
  /** Faixa utilitária (camada de cima, mais funda) */
  utilityRow:
    "flex items-center gap-2.5 px-3.5 bg-black/[0.22] border-b border-white/[0.07] text-[11px] text-white/45",
  /** Faixa de trabalho (camada de baixo) */
  workRow: "flex h-12 items-center gap-1.5 px-2.5",
  /** Poço rebaixado do switch de atribuições */
  well:
    "inline-flex items-center gap-0.5 p-[3px] rounded-[10px] bg-black/[0.25] shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]",
  /** Botão fantasma da faixa de trabalho (FOCUS_RING: a11y §10.8) */
  ghostBtn:
    "inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-white/70 hover:bg-white/[0.10] hover:text-white transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
  /** Único botão sólido do header */
  primaryBtn:
    "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition-all duration-150 cursor-pointer text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
} as const;
```

- [ ] **Step 2: Criar o componente HeaderActionsBar**

```tsx
// src/components/layouts/header/header-actions-bar.tsx
"use client";

import {
  Fragment,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { HEADER_GLASS } from "@/lib/config/design-tokens";
import { computeVisibleActions } from "./overflow-logic";

export interface HeaderAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  /**
   * Maior prioridade fica mais tempo na barra.
   * Infinity = nunca colapsa. 0 = nasce no "…" (nunca aparece na barra).
   */
  priority: number;
  /** "primary" = botão sólido emerald (reservado ao + Novo). */
  variant?: "ghost" | "primary";
  /** Handler do clique — usado na barra E no item do "…". */
  onSelect?: () => void;
  /** Render custom na barra (input de busca, dropdown próprio). */
  render?: ReactNode;
  /** Só ícone na barra; o label vira title/aria-label. */
  hideLabel?: boolean;
  /** Grupo no "…" — separador entre grupos distintos. */
  group?: string;
  /** Itens alternativos no "…" (ex.: as 3 opções de visualização). */
  overflowItems?: Array<{ id: string; label: string; icon?: LucideIcon; onSelect: () => void }>;
}

const OVERFLOW_RESERVE = 40; // largura do botão "…" + gap

function BarButton({ action }: { action: HeaderAction }) {
  if (action.render) return <>{action.render}</>;
  const Icon = action.icon;
  return (
    <button
      type="button"
      onClick={action.onSelect}
      title={action.label}
      aria-label={action.label}
      className={cn(
        action.variant === "primary" ? HEADER_GLASS.primaryBtn : HEADER_GLASS.ghostBtn,
        action.variant !== "primary" && (action.hideLabel ? "w-8" : "px-2.5 text-[11px] font-semibold"),
        "shrink-0",
      )}
    >
      {Icon && <Icon className="w-[15px] h-[15px]" />}
      {!action.hideLabel && <span>{action.label}</span>}
    </button>
  );
}

export function HeaderActionsBar({
  actions,
  className,
}: {
  actions: HeaderAction[];
  className?: string;
}) {
  // Candidatos à barra: priority > 0. Os de priority 0 moram no "…".
  const barCandidates = actions.filter((a) => a.priority > 0);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleIds, setVisibleIds] = useState<string[] | null>(null);

  const recompute = useCallback(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;
    const children = Array.from(measure.children) as HTMLElement[];
    const items = children.map((el, i) => ({
      id: barCandidates[i].id,
      priority: barCandidates[i].priority,
      width: el.offsetWidth + 6, // gap-1.5
    }));
    const { visibleIds: ids } = computeVisibleActions(
      items,
      container.offsetWidth,
      OVERFLOW_RESERVE,
    );
    setVisibleIds(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  useLayoutEffect(() => {
    recompute();
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    return () => ro.disconnect();
  }, [recompute]);

  const isVisible = (a: HeaderAction) =>
    a.priority > 0 && (visibleIds === null || visibleIds.includes(a.id));
  const visible = actions.filter(isVisible);
  const overflow = actions.filter((a) => !isVisible(a));

  return (
    <div
      ref={containerRef}
      className={cn("flex flex-1 items-center justify-end gap-1.5 min-w-0", className)}
    >
      {/* Régua de medição invisível — todos os candidatos, sempre montados */}
      <div
        ref={measureRef}
        aria-hidden
        className="absolute -top-[999px] left-0 flex items-center gap-1.5 invisible pointer-events-none"
      >
        {barCandidates.map((a) => (
          <Fragment key={a.id}>
            <BarButton action={a} />
          </Fragment>
        ))}
      </div>

      {visible.map((a) => (
        <Fragment key={a.id}>
          <BarButton action={a} />
        </Fragment>
      ))}

      {overflow.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="Mais opções"
              aria-label="Mais opções"
              className={cn(HEADER_GLASS.ghostBtn, "w-8 shrink-0")}
            >
              <MoreHorizontal className="w-[15px] h-[15px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {overflow.map((a, i) => {
              const prev = overflow[i - 1];
              const needsSeparator = i > 0 && prev.group !== a.group;
              const Icon = a.icon;
              return (
                <Fragment key={a.id}>
                  {needsSeparator && <DropdownMenuSeparator />}
                  {a.overflowItems ? (
                    a.overflowItems.map((sub) => {
                      const SubIcon = sub.icon;
                      return (
                        <DropdownMenuItem key={sub.id} onClick={sub.onSelect}>
                          {SubIcon && <SubIcon className="w-4 h-4 mr-2" />}
                          {sub.label}
                        </DropdownMenuItem>
                      );
                    })
                  ) : (
                    <DropdownMenuItem onClick={a.onSelect}>
                      {Icon && <Icon className="w-4 h-4 mr-2" />}
                      {a.label}
                    </DropdownMenuItem>
                  )}
                </Fragment>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verificar tipos e testes existentes**

Run: `npx tsc --noEmit 2>&1 | grep -E "header-actions-bar|design-tokens" ; npx vitest run src/components/layouts/header/overflow-logic.test.ts`
Expected: nenhum erro de tipo nos dois arquivos; testes da Task 1 continuam PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/config/design-tokens.ts src/components/layouts/header/header-actions-bar.tsx
git commit -m "feat(header): HEADER_GLASS tokens + HeaderActionsBar com overflow por medição"
```

---

### Task 3: GlassHeaderShell (vidro em duas camadas)

**Files:**
- Create: `src/components/layouts/header/glass-header-shell.tsx`

**Interfaces:**
- Consumes: `HEADER_GLASS` (Task 2), `usePageHeader` de `@/components/layouts/page-header-context`, `NotificationsPopover`, `ConflictBadge`, `CommandPalette`, `ThemeToggle`, `Breadcrumbs`, `SidebarTrigger`, `chatPanelActions`.
- Produces: `GlassHeaderShell(props: GlassHeaderShellProps)` com `filters?: ReactNode | ((collapsed: boolean) => ReactNode)` — o shell mede a própria largura e passa `collapsed=true` abaixo de `wellCollapseAt` px (default 760). Task 5 (Agenda) depende deste contrato.

- [ ] **Step 1: Criar o componente**

```tsx
// src/components/layouts/header/glass-header-shell.tsx
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CommandPalette } from "@/components/shared/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsPopover } from "@/components/notifications-popover";
import { ConflictBadge } from "@/components/conflict-badge";
import { chatPanelActions } from "@/hooks/use-chat-panel";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageHeader } from "@/components/layouts/page-header-context";
import { HEADER_GLASS } from "@/lib/config/design-tokens";

interface GlassHeaderShellProps {
  title: string;
  icon?: React.ElementType;
  /** Stats inline ao lado do título (ex.: "0 · 11"). */
  stats?: ReactNode;
  /** Conteúdo do poço (switch de atribuições). Função recebe `collapsed`. */
  filters?: ReactNode | ((collapsed: boolean) => ReactNode);
  /** Cluster de ações — normalmente <HeaderActionsBar/>. Ocupa o flex-1 da direita. */
  actions?: ReactNode;
  /** Largura (px) abaixo da qual o poço colapsa para dropdown. */
  wellCollapseAt?: number;
  className?: string;
}

export function GlassHeaderShell({
  title,
  icon: Icon,
  stats,
  filters,
  actions,
  wellCollapseAt = 760,
  className,
}: GlassHeaderShellProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const { setHasPageHeader } = usePageHeader();
  const [condensed, setCondensed] = useState(false);
  const [wellCollapsed, setWellCollapsed] = useState(false);

  useEffect(() => {
    setHasPageHeader(true);
    return () => setHasPageHeader(false);
  }, [setHasPageHeader]);

  // Colapso do poço por largura do próprio shell (determinístico, documentado na spec §4)
  useEffect(() => {
    const el = outerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      setWellCollapsed(entry.contentRect.width < wellCollapseAt);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [wellCollapseAt]);

  // Faixa utilitária recolhe ao rolar (spec §2.2). Mesmo scroll-parent walk do
  // CollapsiblePageHeader — o container de scroll é um ancestral, não window.
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    function getScrollParent(node: HTMLElement | null): HTMLElement | Window {
      if (!node || node === document.documentElement) return window;
      const { overflowY } = window.getComputedStyle(node);
      const isScrollable = overflowY === "auto" || overflowY === "scroll";
      if (isScrollable && node.scrollHeight > node.clientHeight) return node;
      return getScrollParent(node.parentElement);
    }

    const scrollTarget = getScrollParent(el.parentElement);
    let rafId: number;
    function handleScroll() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const scrollTop =
          scrollTarget === window
            ? window.scrollY
            : (scrollTarget as HTMLElement).scrollTop;
        setCondensed(scrollTop > 40);
      });
    }
    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const filtersNode = typeof filters === "function" ? filters(wellCollapsed) : filters;

  return (
    <div ref={outerRef} className={cn(HEADER_GLASS.wrapper, className)}>
      <div className={HEADER_GLASS.shell}>
        {/* ── Faixa utilitária (recolhe ao rolar) ── */}
        <div
          className={cn(
            HEADER_GLASS.utilityRow,
            "transition-[height,opacity] duration-200 motion-reduce:transition-none overflow-hidden",
            condensed ? "h-0 opacity-0 border-b-0" : "h-[26px] opacity-100",
          )}
        >
          <Breadcrumbs />
          <div id="header-slot" className="flex items-center" />
          <div className="hidden md:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
            <span className="font-medium">Online</span>
          </div>
          <div className="flex-1 min-w-0" />
          <span className="hidden lg:inline capitalize">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "short",
            })}
          </span>
          <ConflictBadge />
          <div className="flex items-center">
            <span className="hidden md:inline-flex">
              <CommandPalette />
            </span>
            <ThemeToggle />
            <NotificationsPopover />
            <button
              type="button"
              onClick={() => chatPanelActions.toggle()}
              title="Assistente OMBUDS"
              className="inline-flex items-center justify-center h-6 w-6 rounded-md text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── Faixa de trabalho ── */}
        <div className={HEADER_GLASS.workRow}>
          <SidebarTrigger className="hidden md:inline-flex h-7 w-7 rounded-md text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-all duration-200 shrink-0" />
          <div className="flex items-center gap-1.5 shrink-0 pl-1">
            {Icon && <Icon className="w-4 h-4 text-white/70" />}
            <h1 className="text-white text-[13px] font-semibold tracking-tight leading-none">
              {title}
            </h1>
            {stats}
          </div>

          {filtersNode && (
            <>
              <div className="w-px h-5 bg-white/[0.10] shrink-0 mx-1" />
              <div className={cn("shrink-0", !wellCollapsed && HEADER_GLASS.well)}>
                {filtersNode}
              </div>
            </>
          )}

          {actions ?? <div className="flex-1" />}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit 2>&1 | grep glass-header-shell`
Expected: sem saída (zero erros neste arquivo).

- [ ] **Step 3: Commit**

```bash
git add src/components/layouts/header/glass-header-shell.tsx
git commit -m "feat(header): GlassHeaderShell — vidro flutuante em duas camadas com recolhimento no scroll"
```

---

### Task 4: AtribuicaoSwitchWell (poço + modo colapsado)

**Files:**
- Create: `src/components/layouts/header/atribuicao-switch-well.tsx`

**Interfaces:**
- Consumes: `AtribuicaoPills`, `ATRIBUICAO_PILL_ICONS` de `@/components/demandas-premium/AtribuicaoPills`; `getAtribuicaoHex` de `@/lib/config/atribuicoes`; `HEADER_GLASS` (Task 2).
- Produces: `AtribuicaoSwitchWell(props: AtribuicaoSwitchWellProps)` — mesma API de dados do `AtribuicaoPills` (`options`, `selectedValues`, `onToggle`, `onClear`, `counts?`, `singleSelect?`) mais `collapsed?: boolean`. Task 5 depende deste contrato.

- [ ] **Step 1: Criar o componente**

```tsx
// src/components/layouts/header/atribuicao-switch-well.tsx
"use client";

import { ChevronDown, LayoutGrid, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getAtribuicaoHex } from "@/lib/config/atribuicoes";
import { HEADER_GLASS } from "@/lib/config/design-tokens";
import {
  AtribuicaoPills,
  ATRIBUICAO_PILL_ICONS,
} from "@/components/demandas-premium/AtribuicaoPills";

interface AtribuicaoSwitchWellProps {
  options: Array<{ value: string; label: string }>;
  selectedValues: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  counts?: Record<string, number>;
  singleSelect?: boolean;
  /** true = dropdown compacto (ícone ativo + chevron) em vez do poço. */
  collapsed?: boolean;
}

export function AtribuicaoSwitchWell({
  options,
  selectedValues,
  onToggle,
  onClear,
  counts,
  singleSelect = false,
  collapsed = false,
}: AtribuicaoSwitchWellProps) {
  if (!collapsed) {
    return (
      <AtribuicaoPills
        variant="dark"
        iconOnly
        options={options}
        selectedValues={selectedValues}
        onToggle={onToggle}
        onClear={onClear}
        counts={counts}
        singleSelect={singleSelect}
      />
    );
  }

  const specific = options.filter(
    (o) => o.value !== "all" && o.value !== "Todas" && o.label !== "Todas",
  );
  const active = specific.filter((o) => selectedValues.includes(o.value));
  const isAll = active.length === 0;
  const first = active[0];
  const ActiveIcon = first ? (ATRIBUICAO_PILL_ICONS[first.label] ?? LayoutGrid) : LayoutGrid;
  const activeHex = first ? getAtribuicaoHex(first.label) : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={isAll ? "Todas as atribuições" : active.map((a) => a.label).join(", ")}
          aria-label="Trocar atribuição"
          className={cn(HEADER_GLASS.ghostBtn, "px-2 gap-1")}
          style={
            activeHex
              ? {
                  backgroundColor: `${activeHex}26`,
                  boxShadow: `inset 0 0 0 1.5px ${activeHex}cc`,
                }
              : undefined
          }
        >
          <ActiveIcon className="w-[17px] h-[17px]" style={activeHex ? { color: activeHex } : undefined} />
          {active.length > 1 && (
            <span className="text-[11px] font-bold tabular-nums text-white/80">
              +{active.length - 1}
            </span>
          )}
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {!singleSelect && (
          <>
            <DropdownMenuItem onClick={onClear}>
              <LayoutGrid className="w-4 h-4 mr-2" />
              Todas
              {isAll && <Check className="w-3.5 h-3.5 ml-auto text-emerald-500" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {specific.map((opt) => {
          const Icon = ATRIBUICAO_PILL_ICONS[opt.label];
          const hex = getAtribuicaoHex(opt.label);
          const isActive = selectedValues.includes(opt.value);
          return (
            <DropdownMenuItem key={opt.value} onClick={() => onToggle(opt.value)}>
              {Icon && <Icon className="w-4 h-4 mr-2" style={{ color: hex }} />}
              {opt.label}
              {counts?.[opt.label] !== undefined && (
                <span className="ml-2 text-[10px] tabular-nums text-muted-foreground">
                  {counts[opt.label]}
                </span>
              )}
              {isActive && <Check className="w-3.5 h-3.5 ml-auto text-emerald-500" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit 2>&1 | grep atribuicao-switch-well`
Expected: sem saída.

- [ ] **Step 3: Commit**

```bash
git add src/components/layouts/header/atribuicao-switch-well.tsx
git commit -m "feat(header): AtribuicaoSwitchWell — poço do switch com modo dropdown colapsado"
```

---

### Task 5: Sino — ponto discreto no lugar do badge "9+"

**Files:**
- Modify: `src/components/notifications-popover.tsx:168-180`

**Interfaces:**
- Consumes: variáveis já existentes no componente: `unreadCount`, `temAlerta`, `dotUrgente`.
- Produces: nada novo — mudança visual interna.

- [ ] **Step 1: Substituir o bloco do badge**

Trocar as linhas 168–180 (o ternário `{unreadCount > 0 ? (...) : temAlerta ? (...) : null}`) por:

```tsx
          {dotUrgente && unreadCount > 0 ? (
            // Urgência real (prazo vencido/réu preso) com não-lidas: contagem vermelha
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center shadow-sm">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : dotUrgente ? (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-rose-500 animate-pulse motion-reduce:animate-none shadow-sm" />
          ) : temAlerta ? (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-400 shadow-sm" />
          ) : unreadCount > 0 ? (
            // Não-lidas sem urgência: ponto neutro discreto (adeus "9+" vermelho)
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-white/60 shadow-sm" />
          ) : null}
```

- [ ] **Step 2: Verificar tipos e visual**

Run: `npx tsc --noEmit 2>&1 | grep notifications-popover`
Expected: sem saída.
Depois `npm run dev`, abrir `http://localhost:3000/admin` e conferir: com notificações não lidas mas sem prazo urgente, o sino mostra ponto branco discreto (não "9+" vermelho).

- [ ] **Step 3: Commit**

```bash
git add src/components/notifications-popover.tsx
git commit -m "feat(header): sino com ponto discreto — contagem vermelha só para urgência real"
```

---

### Task 6: Migrar a Agenda para o GlassHeaderShell

**Files:**
- Modify: `src/app/(dashboard)/admin/agenda/page.tsx` (bloco do header: linhas 1583–1831 na revisão atual; imports no topo)

**Interfaces:**
- Consumes: `GlassHeaderShell` (Task 3), `HeaderActionsBar` + `HeaderAction` (Task 2), `AtribuicaoSwitchWell` (Task 4). Todo o estado da página já existe (`viewMode`, `searchTerm`, `isSearchOpen`, `isFiltersExpanded`, modais etc.) — nenhum estado novo.
- Produces: Agenda renderizando o header novo. O portal `#header-slot` (avatares de defensores, linhas ~1560–1581) continua funcionando — o shell mantém o `<div id="header-slot">` na faixa utilitária.

- [ ] **Step 1: Atualizar imports**

No topo de `page.tsx`, adicionar:

```tsx
import { GlassHeaderShell } from "@/components/layouts/header/glass-header-shell";
import { HeaderActionsBar, type HeaderAction } from "@/components/layouts/header/header-actions-bar";
import { AtribuicaoSwitchWell } from "@/components/layouts/header/atribuicao-switch-well";
```

Manter o import de `CollapsiblePageHeader` removido SOMENTE se nenhum outro uso existir no arquivo (verificar com grep; hoje é uso único).

- [ ] **Step 2: Extrair os controles ricos (busca e filtros) para consts**

Logo antes do `return` do componente da página (mesmo escopo onde hoje vive o JSX do header), criar duas consts movendo o JSX existente **sem alterações internas**:

- `const searchControl = (...)` ← mover o bloco do search toggle, linhas 1636–1665 (o ternário `{isSearchOpen ? (...) : (...)}` inteiro). **Sem wrapper responsivo** (`hidden md:flex` etc.) — a visibilidade agora é decidida pelo HeaderActionsBar por medição.
- `const filtersControl = (...)` ← mover o bloco do botão de filtros + popover, linhas 1667–1745 (o `<div className="relative">...</div>` inteiro, incluindo o dropdown de Tipo/Status/Prioridade/Cancelados). Também sem wrappers responsivos.

Nota de implementação: a régua de medição do HeaderActionsBar monta uma cópia invisível desses controles (`invisible` + `pointer-events-none`) — inofensivo: elementos `visibility:hidden` não recebem foco nem clique.

- [ ] **Step 3: Declarar as ações do header**

Ainda antes do `return`:

```tsx
  const headerActions: HeaderAction[] = [
    {
      id: "view",
      label: "Visualização",
      priority: 20,
      render: (
        <ViewModeDropdown
          options={AGENDA_VIEW_OPTIONS}
          value={viewMode}
          onChange={(v) => { setViewMode(v as "calendar" | "week" | "list"); setSelectedPeriodo(null); }}
          variant="dark"
        />
      ),
      overflowItems: AGENDA_VIEW_OPTIONS.map((opt) => ({
        id: `view-${opt.value}`,
        label: opt.label,
        icon: opt.icon,
        onSelect: () => { setViewMode(opt.value as "calendar" | "week" | "list"); setSelectedPeriodo(null); },
      })),
    },
    {
      id: "search",
      label: "Buscar",
      icon: Search,
      priority: 15,
      render: searchControl,
      onSelect: () => { setIsSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); },
    },
    {
      id: "filters",
      label: "Filtros",
      icon: Filter,
      priority: 15,
      render: filtersControl,
      onSelect: () => setIsFiltersExpanded(true),
    },
    { id: "refresh", label: "Atualizar pauta", icon: RefreshCw, priority: 40, hideLabel: true, onSelect: () => setIsAtualizarPautaOpen(true) },
    { id: "pje", label: "PJe", icon: Download, priority: 50, onSelect: () => setIsPJeImportModalOpen(true) },
    { id: "novo", label: "Novo", icon: Plus, priority: Infinity, variant: "primary", onSelect: () => setIsCreateModalOpen(true) },
    // ── nasce no "…" (priority 0) ──
    { id: "preparar", label: "Preparar audiências", icon: Target, priority: 0, group: "acoes", onSelect: () => prepararAudienciasActions.open() },
    { id: "config", label: "Configurações", icon: Settings, priority: 0, group: "admin", onSelect: () => setIsGoogleConfigModalOpen(true) },
    { id: "registros", label: "Buscar Registros", icon: Database, priority: 0, group: "admin", onSelect: () => setIsBuscaRegistrosModalOpen(true) },
    { id: "escalas", label: "Configurar Escalas", icon: UserCog, priority: 0, group: "admin", onSelect: () => setIsEscalaModalOpen(true) },
    { id: "import-seeu", label: "Importar do SEEU", icon: Lock, priority: 0, group: "importar", onSelect: () => setIsSEEUImportModalOpen(true) },
    { id: "import-ical", label: "Importar iCal", icon: Upload, priority: 0, group: "importar", onSelect: () => setIsICalImportModalOpen(true) },
    { id: "sync-google", label: "Sincronizar Google", icon: RefreshCw, priority: 0, group: "importar", onSelect: () => setIsGoogleSyncModalOpen(true) },
    { id: "export", label: "Exportar Agenda", icon: FileDown, priority: 0, group: "exportar", onSelect: () => setIsExportModalOpen(true) },
  ];
```

Nota: `FileUp` (Importar do PJe do menu antigo) sai do "…" — a ação `pje` da barra já cobre e cai pro "…" automaticamente quando falta espaço. Remover import de `FileUp` se ficar sem uso.

- [ ] **Step 4: Substituir o bloco do header**

Substituir TODO o bloco `<CollapsiblePageHeader ... </CollapsiblePageHeader>` (linhas 1583–1831) por:

```tsx
      {/* ====== GLASS HEADER (vidro em duas camadas) ====== */}
      <GlassHeaderShell
        title="Agenda"
        icon={CalendarIcon}
        stats={
          <span className="text-[11px] text-white/55 tabular-nums leading-none">
            {stats.hoje} · {stats.semana}
          </span>
        }
        filters={(collapsed) => (
          <AtribuicaoSwitchWell
            collapsed={collapsed}
            options={AGENDA_ATRIBUICAO_PILL_OPTIONS}
            selectedValues={Array.from(areaFilters)}
            onToggle={handleAreaFilterToggle}
            onClear={() => setAreaFilters(new Set(["all"]))}
            counts={Object.fromEntries(
              AGENDA_ATRIBUICAO_PILL_OPTIONS
                .filter(o => o.value !== "all")
                .map(o => [o.label, countByArea[o.value] ?? 0])
            )}
          />
        )}
        actions={<HeaderActionsBar actions={headerActions} />}
      />
```

- [ ] **Step 5: Verificar tipos e lint**

Run: `npx tsc --noEmit 2>&1 | grep "agenda/page" ; npm run lint 2>&1 | grep -E "agenda|header" | head -20`
Expected: sem erros de tipo; lint sem erros novos nestes arquivos (warnings pré-existentes de outros arquivos são OK).

- [ ] **Step 6: Verificação manual no browser (regras da spec §4/§5)**

Com `npm run dev` rodando, abrir `http://localhost:3000/admin/agenda` e conferir:

1. **1440px**: vidro flutuante com duas faixas; conteúdo passa por baixo ao rolar; faixa utilitária recolhe ao rolar e volta no topo.
2. **Switch**: pill ativo com cor da atribuição (só ícone); tooltips funcionam; "poço" rebaixado visível.
3. **Encolher a janela gradualmente**: primeiro `view` → "…", depois `search`/`filters` → "…", depois `refresh`, depois `pje`; `+ Novo` sempre visível; abaixo de 760px o poço vira dropdown com ícone colorido; **nunca** aparece scrollbar horizontal nem ícone cortado; existe no máximo UM "…".
4. **Menu "…"**: itens com separadores por grupo; todos os handlers abrem os modais corretos (Preparar audiências, Configurações, Buscar Registros, Escalas, SEEU, iCal, Sincronizar Google, Exportar).
5. **Ações da barra**: Atualizar pauta, PJe e + Novo abrem os modais corretos; busca expande e filtra; popover de filtros abre e filtra.
6. **Sino**: ponto discreto (não "9+") quando não há urgência.
7. **Dark mode** (ThemeToggle): vidro mais fundo, legível.
8. **Avatares de defensores** (portal `#header-slot`) seguem visíveis na faixa utilitária.
9. **375px**: bottom nav mobile intacta; header utilizável (título + switch colapsado + Novo + "…").

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/admin/agenda/page.tsx
git commit -m "feat(agenda): migra header para GlassHeaderShell com overflow automático"
```

---

## Fora deste plano (Fase B — plano seguinte)

Depois de validar a Agenda ao vivo: migrar **Demandas** (`demandas-premium-view.tsx` — `headerToolbarLeft/Right`, `ImportDropdown` como `render` action, collapsedStats/Pill/Search deixam de existir) e **Assistidos**, depois varrer as páginas que usam só o `HeaderUtilityRow` standalone, e por fim remover o `CollapsiblePageHeader` e os tokens antigos. O padrão estabelecido aqui (declarar `HeaderAction[]` + `AtribuicaoSwitchWell`) se repete mecanicamente.
