"use client";

import React from "react";
import { X } from "lucide-react";
import { Gavel, Target, Home, Lock, RefreshCw, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

// Ícones por atribuição
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Tribunal do Júri": Gavel,
  "Grupo Especial do Júri": Target,
  "Violência Doméstica": Home,
  "Execução Penal": Lock,
  "Substituição Criminal": RefreshCw,
  "Curadoria Especial": Shield,
};

// Cores HEX por atribuição
export const ATRIBUICAO_COLORS: Record<string, string> = {
  "Tribunal do Júri": "#22c55e",
  "Grupo Especial do Júri": "#f97316",
  "Violência Doméstica": "#f59e0b",
  "Execução Penal": "#3b82f6",
  "Substituição Criminal": "#8b5cf6",
  "Curadoria Especial": "#71717a",
};

const DEFAULT_HEX = "#71717a";

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
}: AtribuicaoPillsProps) {
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
      {/* Switch container */}
      <div className="flex items-center gap-0.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60">
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
                "flex items-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all duration-200 cursor-pointer border",
                isActive
                  ? "px-2.5 shadow-sm"
                  : "px-1.5 hover:shadow-sm"
              )}
              style={
                isActive
                  ? { backgroundColor: `${hex}18`, borderColor: `${hex}40`, color: hex }
                  : { backgroundColor: "transparent", borderColor: "transparent", color: `${hex}80` }
              }
            >
              {Icon && (
                <Icon
                  className="w-3.5 h-3.5 flex-shrink-0 transition-colors"
                  style={{ color: isActive ? hex : undefined }}
                />
              )}
              {/* Label expande quando selecionado */}
              {isActive && <span>{opt.label}</span>}
              {/* Count badge */}
              {count !== undefined && (
                <span
                  className="text-[9px] font-semibold tabular-nums px-1 py-0.5 rounded-full min-w-[18px] text-center"
                  style={
                    isActive
                      ? { backgroundColor: `${hex}20`, color: hex }
                      : { backgroundColor: `${hex}15`, color: `${hex}90` }
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
          className="flex items-center justify-center w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Slot for extra content (deadline stats, etc.) */}
      {children}
    </div>
  );
}
