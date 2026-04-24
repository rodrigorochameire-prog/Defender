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
import { HeaderUtilityRow } from "@/components/layouts/header-utility-row";
import { HEADER_STYLE } from "@/lib/config/design-tokens";

interface CollapsiblePageHeaderProps {
  /** Page title */
  title: string;
  /** Lucide icon component */
  icon?: React.ElementType;
  /** Row 1 content: stats, action buttons, etc. */
  children: ReactNode;
  /** Row 2 content: pills, search, tools — optional */
  bottomRow?: ReactNode;
  /** Active pill/badge to show in collapsed mode */
  collapsedPill?: ReactNode;
  /** Search input for collapsed mode */
  collapsedSearch?: ReactNode;
  /** Stats summary for collapsed mode (e.g. "42 total") */
  collapsedStats?: ReactNode;
  /** Extra className for the outer container */
  className?: string;
}

export function CollapsiblePageHeader({
  title,
  icon: Icon,
  children,
  bottomRow,
  collapsedPill,
  collapsedSearch,
  collapsedStats,
  className,
}: CollapsiblePageHeaderProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef<HTMLDivElement>(null);
  const collapsedRef = useRef<HTMLDivElement>(null);
  const { setHasPageHeader } = usePageHeader();
  const progressRef = useRef(0);

  // Register page header presence
  useEffect(() => {
    setHasPageHeader(true);
    return () => setHasPageHeader(false);
  }, [setHasPageHeader]);

  // Smooth progressive scroll — interpolate between expanded/collapsed
  useEffect(() => {
    const el = outerRef.current;
    const expanded = expandedRef.current;
    const collapsed = collapsedRef.current;
    if (!el || !expanded || !collapsed) return;

    function getScrollParent(node: HTMLElement | null): HTMLElement | Window {
      if (!node || node === document.documentElement) return window;
      const { overflowY } = window.getComputedStyle(node);
      const isScrollable = overflowY === "auto" || overflowY === "scroll";
      if (isScrollable && node.scrollHeight > node.clientHeight) return node;
      return getScrollParent(node.parentElement);
    }

    const scrollTarget = getScrollParent(el.parentElement);
    const SCROLL_RANGE = 50; // pixels over which transition happens
    let rafId: number;

    function handleScroll() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const scrollTop =
          scrollTarget === window
            ? window.scrollY
            : (scrollTarget as HTMLElement).scrollTop;

        // Progress: 0 = fully expanded, 1 = fully collapsed
        const raw = Math.min(1, Math.max(0, scrollTop / SCROLL_RANGE));
        // Ease out cubic for smoother feel
        const p = 1 - Math.pow(1 - raw, 3);
        progressRef.current = p;

        // Expanded: fade out only (no transform — preserves dropdown stacking)
        expanded!.style.opacity = String(1 - p);
        expanded!.style.pointerEvents = p > 0.5 ? "none" : "auto";
        expanded!.style.display = p >= 1 ? "none" : "";

        // Collapsed: fade in
        collapsed!.style.opacity = String(p);
        collapsed!.style.pointerEvents = p > 0.5 ? "auto" : "none";
        collapsed!.style.display = p <= 0 ? "none" : "";
      });
    }

    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={outerRef}
      className={cn("sticky top-0 z-50", HEADER_STYLE.shellShadow, className)}
    >
      {/* ── EXPANDED STATE ─────────────────────────────────────── */}
      <div
        ref={expandedRef}
        className="will-change-[opacity]"
      >
        <div className="overflow-visible">
          {/* Utility Bar — moldura escura */}
          <div className={HEADER_STYLE.utilityRow}>
            <HeaderUtilityRow variant="embedded" />
          </div>

          {/* Gap sutil entre utility e page header */}
          <div className="h-1.5 bg-[#f5f5f5] dark:bg-[#1a1a1e]" />

          {/* Page Header — card com accent emerald no topo */}
          <div className={cn(HEADER_STYLE.container, "mx-3 sm:mx-4 lg:mx-5 mb-2 overflow-visible")}>
            {/* Row 1 — título/ações */}
            <div className="px-4 sm:px-5 pb-3 pt-3.5">
              {children}
            </div>

            {/* Divisor cor do fundo — cria separação visual real */}
            {bottomRow && (
              <>
                <div className="h-[2px] bg-[#f5f5f5] dark:bg-[#1a1a1e]" />
                <div className="px-4 sm:px-5 pb-3 pt-2.5 bg-white/[0.10] dark:bg-white/[0.04] rounded-b-xl">
                  {bottomRow}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── COLLAPSED STATE ────────────────────────────────────── */}
      <div
        ref={collapsedRef}
        className={cn(
          "will-change-[opacity] absolute top-0 left-0 right-0",
          HEADER_STYLE.collapsedBar,
        )}
        style={{ opacity: 0, pointerEvents: "none" }}
      >
        <div className="h-11 flex items-center px-3 gap-2">
          {/* Sidebar trigger */}
          <SidebarTrigger className="h-6 w-6 rounded-md text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-all duration-200 shrink-0" />

          {/* Separator */}
          <div className="h-4 w-px bg-white/[0.08] shrink-0" />

          {/* Breadcrumbs */}
          <div className="shrink-0">
            <Breadcrumbs />
          </div>

          {/* Separator */}
          <div className="h-4 w-px bg-white/[0.08] shrink-0" />

          {/* Page title */}
          <div className="flex items-center gap-1.5 shrink-0">
            {Icon && <Icon className="w-3.5 h-3.5 text-white/60" />}
            <span className={HEADER_STYLE.collapsedText}>{title}</span>
          </div>

          {/* Stats */}
          {collapsedStats && (
            <>
              <div className="h-4 w-px bg-white/[0.08] shrink-0" />
              <div className="text-white/60 text-[11px] shrink-0">
                {collapsedStats}
              </div>
            </>
          )}

          {/* Separator before pills */}
          {collapsedPill && (
            <>
              <div className="h-4 w-px bg-white/[0.08] shrink-0" />
              <div className="shrink-0">{collapsedPill}</div>
            </>
          )}

          {/* Flex spacer */}
          <div className="flex-1 min-w-0" />

          {/* Search */}
          {collapsedSearch && (
            <div className="shrink-0">{collapsedSearch}</div>
          )}

          {/* Utility controls */}
          <ConflictBadge />
          <div className="flex items-center gap-1">
            <CommandPalette />
            <ThemeToggle />
            <NotificationsPopover />
            <button
              onClick={() => chatPanelActions.toggle()}
              title="Assistente OMBUDS"
              className="inline-flex items-center justify-center h-6 w-6 rounded-md text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
