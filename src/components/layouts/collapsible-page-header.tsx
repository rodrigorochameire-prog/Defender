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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const outerRef = useRef<HTMLDivElement>(null);
  const { setHasPageHeader } = usePageHeader();

  // Register page header presence
  useEffect(() => {
    setHasPageHeader(true);
    return () => setHasPageHeader(false);
  }, [setHasPageHeader]);

  // Scroll detection: find the closest scrollable parent and listen on it
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    // Walk up the DOM to find the closest scrollable ancestor
    function getScrollParent(node: HTMLElement | null): HTMLElement | Window {
      if (!node || node === document.documentElement) return window;
      const { overflowY } = window.getComputedStyle(node);
      const isScrollable = overflowY === "auto" || overflowY === "scroll";
      if (isScrollable && node.scrollHeight > node.clientHeight) return node;
      return getScrollParent(node.parentElement);
    }

    const scrollTarget = getScrollParent(el.parentElement);

    let lastCollapsed = false;
    function handleScroll() {
      const scrollTop =
        scrollTarget === window
          ? window.scrollY
          : (scrollTarget as HTMLElement).scrollTop;
      // Hysteresis: collapse at 20px, expand back at 5px — prevents flickering
      const next = lastCollapsed ? scrollTop > 5 : scrollTop > 20;
      if (next !== lastCollapsed) {
        lastCollapsed = next;
        setIsCollapsed(next);
      }
    }

    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
    // Run once to set initial state
    handleScroll();

    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div
      ref={outerRef}
      className={cn("sticky top-0 z-30", className)}
    >
      {/* ── EXPANDED STATE ─────────────────────────────────────── */}
      <div
        className={cn(
          "transition-[transform,opacity] duration-200 ease-out origin-top will-change-[transform,opacity]",
          isCollapsed
            ? "opacity-0 scale-y-0 h-0 pointer-events-none"
            : "opacity-100 scale-y-100",
        )}
        aria-hidden={isCollapsed}
      >
        <div className="overflow-visible">
          {/* Utility Bar */}
          <div className="bg-[#484850]">
            <HeaderUtilityRow variant="embedded" />
          </div>

          {/* Separação */}
          <div className="h-2 bg-neutral-100 dark:bg-[#1a1a1e]" />

          {/* Page Header — card flutuante arredondado */}
          <div className="mx-4 lg:mx-5 mb-2 rounded-2xl bg-gradient-to-b from-[#434349] to-[#3e3e44] ring-1 ring-white/[0.06] shadow-lg shadow-black/[0.08]">
            {/* Row 1 — título/ações */}
            <div className="px-5 pb-3 pt-4">
              {children}
            </div>

            {/* Row 2 — pills/filtros */}
            {bottomRow && (
              <div className="px-5 pb-3.5 pt-2 border-t border-white/[0.05]">
                {bottomRow}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── COLLAPSED STATE ────────────────────────────────────── */}
      <div
        className={cn(
          "transition-[transform,opacity] duration-200 ease-out origin-top will-change-[transform,opacity]",
          isCollapsed
            ? "opacity-100 scale-y-100"
            : "opacity-0 scale-y-0 h-0 pointer-events-none",
          HEADER_STYLE.collapsedBar,
        )}
        aria-hidden={!isCollapsed}
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
