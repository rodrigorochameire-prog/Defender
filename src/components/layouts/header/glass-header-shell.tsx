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
  const [dateLabel, setDateLabel] = useState("");

  useEffect(() => {
    setHasPageHeader(true);
    return () => setHasPageHeader(false);
  }, [setHasPageHeader]);

  useEffect(() => {
    setDateLabel(
      new Date().toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "short",
      }),
    );
  }, []);

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
          inert={condensed || undefined}
          className={cn(
            HEADER_GLASS.utilityRow,
            "transition-[height,opacity] duration-200 motion-reduce:transition-none",
            // overflow-hidden só no colapso — expandida, deixa o badge do sino respirar
            condensed ? "h-0 opacity-0 border-b-0 overflow-hidden" : "h-10 opacity-100",
          )}
        >
          <SidebarTrigger
            title="Abrir/fechar menu lateral (⌘B)"
            className="hidden md:inline-flex h-7 w-7 rounded-md text-white/50 hover:text-white/85 hover:bg-white/[0.10] transition-all duration-200 shrink-0"
          />
          <div className="h-4 w-px bg-white/[0.08] shrink-0" />
          <Breadcrumbs />
          {/* Slot p/ conteúdo injetado pela página (ex.: avatares da escala) */}
          <div id="header-slot" className="flex items-center" />
          <div className="flex-1 min-w-0" />
          <span className="hidden lg:inline capitalize">{dateLabel}</span>
          <ConflictBadge />
          <div className="flex items-center gap-1">
            <span className="hidden md:inline-flex">
              <CommandPalette />
            </span>
            <ThemeToggle />
            <NotificationsPopover />
            <button
              type="button"
              onClick={() => chatPanelActions.toggle()}
              title="Assistente OMBUDS"
              className="inline-flex items-center justify-center h-7 w-7 rounded-md text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── Faixa de trabalho ── */}
        <div className={HEADER_GLASS.workRow}>
          {/* Toggle da sidebar visível aqui só quando a faixa utilitária recolheu */}
          {condensed && (
            <SidebarTrigger
              title="Abrir/fechar menu lateral (⌘B)"
              className="hidden md:inline-flex h-7 w-7 rounded-md text-white/50 hover:text-white/85 hover:bg-white/[0.10] transition-all duration-200 shrink-0"
            />
          )}
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
          {condensed && (
            <div className="shrink-0 motion-reduce:transition-none animate-in fade-in duration-200">
              <NotificationsPopover />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
