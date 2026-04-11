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

    function handleScroll() {
      const scrollTop =
        scrollTarget === window
          ? window.scrollY
          : (scrollTarget as HTMLElement).scrollTop;
      setIsCollapsed(scrollTop > 10);
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
          "transition-all duration-300 ease-out overflow-hidden",
          isCollapsed
            ? "opacity-0 max-h-0 pointer-events-none"
            : "opacity-100 max-h-[300px]",
        )}
        aria-hidden={isCollapsed}
      >
        <div className="overflow-hidden">
          {/* Utility Bar — tom mais escuro, moldura */}
          <div className="bg-[#2e2e34] border-b border-white/[0.06]">
            <HeaderUtilityRow variant="embedded" />
          </div>

          {/* Page Header — tom mais claro, área de conteúdo */}
          <div className="bg-[#44444a] px-4 pb-3 pt-3">
            {children}
          </div>

          {/* Row 2 — pills, search, tools (optional) */}
          {bottomRow && (
            <div className="bg-[#44444a] px-4 pb-3">
              {bottomRow}
            </div>
          )}
        </div>
      </div>

      {/* ── COLLAPSED STATE ────────────────────────────────────── */}
      <div
        className={cn(
          "transition-all duration-300 ease-out overflow-hidden",
          isCollapsed
            ? "opacity-100 max-h-12"
            : "opacity-0 max-h-0 pointer-events-none",
          HEADER_STYLE.collapsedBar,
        )}
        aria-hidden={!isCollapsed}
      >
        <div className="h-8 flex items-center px-3 gap-2">
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
