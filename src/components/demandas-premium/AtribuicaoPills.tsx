"use client";

import React from "react";
import { X } from "lucide-react";
import { Gavel, Target, Home, Lock, RefreshCw, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { SOLID_COLOR_MAP } from "@/lib/config/atribuicoes";

// Ícones por atribuição
const ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  "Tribunal do Júri": Gavel,
  "Grupo Especial do Júri": Target,
  "Violência Doméstica": Home,
  "Execução Penal": Lock,
  "Substituição Criminal": RefreshCw,
  "Curadoria Especial": Shield,
};

// Re-export do master config para compatibilidade com consumers existentes
export const ATRIBUICAO_COLORS: Record<string, string> = {
  "Tribunal do Júri": SOLID_COLOR_MAP["Tribunal do Júri"] || SOLID_COLOR_MAP.JURI,
  "Grupo Especial do Júri": SOLID_COLOR_MAP["Grupo Especial do Júri"] || SOLID_COLOR_MAP.GRUPO_JURI,
  "Violência Doméstica": SOLID_COLOR_MAP["Violência Doméstica"] || SOLID_COLOR_MAP.VVD,
  "Execução Penal": SOLID_COLOR_MAP["Execução Penal"] || SOLID_COLOR_MAP.EXECUCAO,
  "Substituição Criminal": SOLID_COLOR_MAP.SUBSTITUICAO,
  "Curadoria Especial": SOLID_COLOR_MAP["Curadoria Especial"] || SOLID_COLOR_MAP.CURADORIA,
};

const DEFAULT_HEX = SOLID_COLOR_MAP.all || "#71717a";

interface AtribuicaoPillsProps {
  options: Array<{ value: string; label: string }>;
  selectedValues: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  /** Counts per atribuição label. Pass to show count badges. */
  counts?: Record<string, number>;
  /** Extra content appended after pills (e.g. deadline stats) */
  children?: React.ReactNode;
  /** Wrapper className override */
  className?: string;
  /**
   * Single-select mode: always exactly one selected.
   * Clicking another pill switches to it. No clear button.
   * Used in Kanban and Planilha tabs.
   */
  singleSelect?: boolean;
  /** Compact mode: no counts, labels hidden on small screens */
  compact?: boolean;
  /** Visual variant — "light" for white/neutral backgrounds, "dark" for charcoal headers */
  variant?: "light" | "dark";
}

export function AtribuicaoPills({
  options,
  selectedValues,
  onToggle,
  onClear,
  counts,
  children,
  className,
  singleSelect = false,
  compact = false,
  variant = "light",
}: AtribuicaoPillsProps) {
  const isDark = variant === "dark";
  const filtered = options.filter((o) => o.value !== "Todas");

  const handleClick = (value: string) => {
    if (singleSelect) {
      if (!selectedValues.includes(value)) {
        onToggle(value);
      }
    } else {
      onToggle(value);
    }
  };

  return (
    <div className={className ?? "flex items-center gap-1"}>
      {/* Switch container — segmented control style */}
      <div className={cn(
          "inline-flex items-center gap-0 p-[3px] rounded-full border",
          isDark
            ? "bg-white/[0.05] border-white/[0.06]"
            : "bg-neutral-200/60 dark:bg-neutral-800 border-neutral-300/70 dark:border-neutral-700/60"
        )}>
        {filtered.map((opt) => {
          const isActive = selectedValues.includes(opt.value);
          const hex = ATRIBUICAO_COLORS[opt.label] || DEFAULT_HEX;
          const Icon = ICONS[opt.label];
          const count = counts?.[opt.label];

          return (
            <button
              key={opt.value}
              onClick={() => handleClick(opt.value)}
              title={opt.label}
              className={cn(
                "flex items-center gap-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer",
                isActive
                  ? "px-3 py-1.5 shadow-sm text-white"
                  : "px-2 py-1.5"
              )}
              style={
                isActive
                  ? isDark
                    ? { backgroundColor: `${hex}40`, color: "white" }
                    : { backgroundColor: hex }
                  : { color: isDark ? "rgba(255,255,255,0.35)" : "#9ca3af" }
              }
            >
              {Icon && (
                <Icon
                  className="w-[16px] h-[16px] flex-shrink-0"
                  style={{ color: isActive ? "#fff" : isDark ? "rgba(255,255,255,0.35)" : "#71717a" }}
                />
              )}
              {isActive && <span className={compact ? "hidden sm:inline" : ""}>{opt.label}</span>}
              {!compact && count !== undefined && (
                <span
                  className="text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                  style={
                    isActive
                      ? { backgroundColor: "rgba(255,255,255,0.25)", color: isDark ? "rgba(255,255,255,0.6)" : "#fff" }
                      : { color: isDark ? "rgba(255,255,255,0.3)" : "#9ca3af" }
                  }
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Clear button — only in multi-select mode */}
      {!singleSelect && selectedValues.length > 0 && (
        <button
          onClick={onClear}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Slot for extra content (deadline stats, etc.) */}
      {children}
    </div>
  );
}
