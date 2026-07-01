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
