"use client";

import React from "react";
import { X } from "lucide-react";
import { Gavel, Target, Home, Lock, RefreshCw, Shield } from "lucide-react";

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
      // In single-select: always switch to the clicked one (don't toggle off)
      if (!selectedValues.includes(value)) {
        onToggle(value);
      }
    } else {
      onToggle(value);
    }
  };

  return (
    <div className={className ?? "flex items-center gap-1.5 overflow-x-auto scrollbar-none"}>
      {filtered.map((opt) => {
        const isActive = selectedValues.includes(opt.value);
        const color = ATRIBUICAO_COLORS[opt.label] || "#71717a";
        const Icon = ICONS[opt.label];
        const count = counts?.[opt.label];

        return (
          <button
            key={opt.value}
            onClick={() => handleClick(opt.value)}
            title={opt.label}
            className={`flex items-center gap-1.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all duration-200 border cursor-pointer ${
              isActive ? "px-2.5 shadow-sm" : "px-1.5 hover:shadow-sm"
            }`}
            style={
              isActive
                ? { backgroundColor: `${color}12`, borderColor: `${color}50`, color }
                : { backgroundColor: "transparent", borderColor: "transparent", color: `${color}99` }
            }
          >
            {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
            {/* Label visible only when selected */}
            {isActive && <span>{opt.label}</span>}
            {/* Count badge */}
            {count !== undefined && (
              <span className="text-[9px] font-mono tabular-nums opacity-50">{count}</span>
            )}
          </button>
        );
      })}

      {/* Clear button — only in multi-select mode */}
      {!singleSelect && selectedValues.length > 0 && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 px-1.5 py-1 rounded-lg text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Slot for extra content (deadline stats, etc.) */}
      {children}
    </div>
  );
}
