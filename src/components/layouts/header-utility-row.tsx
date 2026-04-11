"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CommandPalette } from "@/components/shared/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsPopover } from "@/components/notifications-popover";
import { ConflictBadge } from "@/components/conflict-badge";
import { chatPanelActions } from "@/hooks/use-chat-panel";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderUtilityRowProps {
  variant: "standalone" | "embedded";
  chatToggle?: () => void;
}

export function HeaderUtilityRow({ variant, chatToggle }: HeaderUtilityRowProps) {
  const handleChatToggle = chatToggle ?? (() => chatPanelActions.toggle());

  const content = (
    <div className="flex h-8 shrink-0 items-center w-full">
      {/* Left: Toggle + Breadcrumbs */}
      <div className="flex items-center gap-3 px-3 flex-1 min-w-0">
        <SidebarTrigger className="h-6 w-6 rounded-md text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-all duration-200 shrink-0" />

        {/* Separator */}
        <div className="h-4 w-px bg-white/[0.08] shrink-0" />

        {/* Breadcrumbs */}
        <Breadcrumbs />

        {/* Slot for page-injected content */}
        <div id="header-slot" className="flex items-center" />
      </div>

      {/* Right: Indicator + Date + Controls */}
      <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3">
        {/* Online indicator */}
        <div className="hidden md:flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-white/40 font-medium">Online</span>
        </div>

        {/* Separator */}
        <div className="hidden md:block h-4 w-px bg-white/[0.08]" />

        {/* Date */}
        <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-white/40">
          <span className="capitalize">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "short",
            })}
          </span>
        </div>

        {/* Separator */}
        <div className="hidden lg:block h-4 w-px bg-white/[0.08]" />

        {/* Conflict badge */}
        <ConflictBadge />

        {/* Controls — scale down para caber na barra compacta */}
        <div className="flex items-center gap-0.5 [&>*]:scale-[0.78] [&>*]:origin-center">
          <CommandPalette />
          <ThemeToggle />
          <NotificationsPopover />
          <button
            onClick={handleChatToggle}
            title="Assistente OMBUDS"
            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  if (variant === "standalone") {
    return (
      <header
        className={cn(
          "sticky top-0 z-30 shrink-0",
          "bg-[#38383e] border-b border-white/[0.08]"
        )}
      >
        {content}
      </header>
    );
  }

  return content;
}
