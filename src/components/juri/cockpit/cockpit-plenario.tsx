"use client";

import type { ReactNode } from "react";
import { Maximize2, Minimize2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// F2-A — Modo plenário (full-screen focus mode)
//
// Opt-in overlay: the cockpit opens normally (inside the AdminSidebar chrome).
// Activating "modo plenário" promotes the EXISTING content container to a
// fixed full-screen overlay that covers the sidebar/header. No routing or
// layout changes — purely additive classes toggled on the live content tree.
// Theme tokens (bg-background / text-foreground) keep it light/dark aware.
// ---------------------------------------------------------------------------

/**
 * Classes to merge onto the cockpit's MAIN content container.
 * When `modoPlenario` is true the container becomes a full-screen overlay
 * sitting above the global sidebar/header (z-50), scrolling internally.
 *
 * Pure function — easy to unit-test and reuse.
 */
export function plenarioContainerClass(modoPlenario: boolean): string {
  return modoPlenario
    ? "fixed inset-0 z-50 overflow-auto bg-background text-foreground"
    : "";
}

// ---------------------------------------------------------------------------
// Entrar em modo plenário — opt-in trigger (shown in normal view)
// ---------------------------------------------------------------------------

interface EntrarModoPlenarioButtonProps {
  onEntrar: () => void;
  className?: string;
}

export function EntrarModoPlenarioButton({
  onEntrar,
  className,
}: EntrarModoPlenarioButtonProps) {
  return (
    <button
      type="button"
      onClick={onEntrar}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 min-h-[36px] text-[11px] font-semibold",
        "bg-white/[0.08] text-white/80 ring-1 ring-white/[0.05]",
        "hover:bg-white/[0.14] hover:text-white transition-all duration-150 cursor-pointer",
        className,
      )}
    >
      <Maximize2 className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Entrar em modo plenário</span>
      <span className="sm:hidden">Modo plenário</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Barra mínima — only rendered WHILE in modo plenário
//
// Slim sticky bar: session name + cronômetro + (red) Encerrar Sessão + the
// "Auto-salvo" indicator + "Sair do modo". Nothing else.
//
// IMPORTANT (exit safety): "Sair do modo" only calls `onSairModo` — it NEVER
// ends the session. The destructive Encerrar keeps its own confirmation,
// passed in as `encerrarSlot`.
// ---------------------------------------------------------------------------

interface CockpitPlenarioBarProps {
  /** Nome da sessão / processo em julgamento. */
  sessaoNome: string;
  /** Cronômetro já formatado pelo cockpit (ReactNode para reusar a fonte mono). */
  cronometro: ReactNode;
  /** Botão Encerrar Sessão existente (mantém a própria confirmação). */
  encerrarSlot: ReactNode;
  /** Indicador "Auto-salvo" visível também no modo. */
  autoSalvo?: boolean;
  /** Sai do modo plenário — NÃO encerra a sessão. */
  onSairModo: () => void;
}

export function CockpitPlenarioBar({
  sessaoNome,
  cronometro,
  encerrarSlot,
  autoSalvo = false,
  onSairModo,
}: CockpitPlenarioBarProps) {
  return (
    <div
      role="banner"
      aria-label="Barra do modo plenário"
      className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      {/* Esquerda: nome da sessão */}
      <div className="min-w-0 flex items-center gap-3">
        <span className="truncate text-sm font-semibold text-foreground">
          {sessaoNome}
        </span>
        {autoSalvo && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-500 shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            Auto-salvo
          </span>
        )}
      </div>

      {/* Centro: cronômetro */}
      <div className="flex items-center font-mono tabular-nums text-lg font-bold text-foreground shrink-0">
        {cronometro}
      </div>

      {/* Direita: Encerrar + Sair do modo */}
      <div className="flex items-center gap-2 shrink-0">
        {encerrarSlot}
        <button
          type="button"
          onClick={onSairModo}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 min-h-[44px] text-xs font-semibold",
            "border border-border bg-muted/40 text-muted-foreground",
            "hover:bg-muted hover:text-foreground transition-all duration-150 cursor-pointer",
          )}
        >
          <Minimize2 className="w-4 h-4" />
          <span className="hidden sm:inline">Sair do modo</span>
        </button>
      </div>
    </div>
  );
}
