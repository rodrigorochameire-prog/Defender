"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePageHeader } from "@/components/layouts/page-header-context";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CommandPalette } from "@/components/shared/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsPopover } from "@/components/notifications-popover";
import { ConflictBadge } from "@/components/conflict-badge";
import { chatPanelActions } from "@/hooks/use-chat-panel";
import { MessageSquare } from "lucide-react";
import { HEADER_GLASS } from "@/lib/config/design-tokens";

interface EntityPageHeaderProps {
  /** Avatar/identidade visual à esquerda (ex.: AssistidoAvatar). */
  avatar?: ReactNode;
  /** Nome serifado da entidade — assinatura do OMBUDS, preservada na variante B. */
  name: string;
  /**
   * Metadados horizontais ao lado do nome (CPF, status, contato). São dispostos
   * na MESMA faixa do nome (não empilhados como banner).
   */
  metadata?: ReactNode;
  /** Ações primárias da entidade (WhatsApp, Atendimento). Alinhadas à direita. */
  actions?: ReactNode;
  /**
   * Faixa secundária opcional renderada logo abaixo da identidade, dentro do
   * mesmo bloco charcoal (ex.: a nav de abas do perfil).
   */
  belowBand?: ReactNode;
  className?: string;
}

/**
 * Header de **entidade** (variante B) — irmão do `GlassHeaderShell` (variante A,
 * matriz "Demandas"). Migrado ao idioma glass no Lote E: mesma faixa utilitária
 * (SidebarTrigger/Breadcrumbs/#header-slot/data/ConflictBadge/CommandPalette/
 * ThemeToggle/NotificationsPopover/chat) + faixa de trabalho própria, só que aqui
 * a "work row" é a identidade da entidade (avatar + nome serifado + CPF/status)
 * disposta HORIZONTALMENTE — não como banner empilhado — para que a transição
 * lista→entidade pareça contínua e a faixa "Atenção Imediata" ganhe protagonismo
 * logo abaixo. Contrato externo (props) preservado — `assistidos/[id]/layout.tsx`
 * não muda.
 */
export function EntityPageHeader({
  avatar,
  name,
  metadata,
  actions,
  belowBand,
  className,
}: EntityPageHeaderProps) {
  const { setHasPageHeader } = usePageHeader();
  const [dateLabel, setDateLabel] = useState("");

  // Registra presença de page header (mesma semântica do GlassHeaderShell).
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

  return (
    <div className={cn(HEADER_GLASS.wrapper, className)}>
      <div className={HEADER_GLASS.shell}>
        {/* ── Faixa utilitária (idêntica ao GlassHeaderShell) ── */}
        <div className={cn(HEADER_GLASS.utilityRow, "h-10")}>
          <SidebarTrigger
            title="Abrir/fechar menu lateral (⌘B)"
            className="hidden md:inline-flex h-7 w-7 rounded-md text-white/50 hover:text-white/85 hover:bg-white/[0.10] transition-all duration-200 shrink-0"
          />
          <div className="h-4 w-px bg-white/[0.08] shrink-0" />
          <Breadcrumbs />
          {/* Slot p/ conteúdo injetado pela página */}
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

        {/* ── Faixa de identidade (work row) — avatar + nome serifado + metadata/actions ── */}
        <div data-entity-identity-row className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 sm:px-5 py-3">
          {avatar && <div className="shrink-0">{avatar}</div>}

          {/* Nome serifado + metadados, todos na MESMA faixa horizontal. */}
          <div className="flex flex-1 min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="font-serif text-[17px] font-semibold tracking-tight truncate text-white">
              {name}
            </h1>
            {metadata}
          </div>

          {actions && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </div>

        {belowBand}
      </div>
    </div>
  );
}
