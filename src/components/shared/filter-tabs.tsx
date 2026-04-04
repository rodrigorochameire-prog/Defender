"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

// ==========================================
// FILTER TABS - Filtros em estilo pills premium
// Design moderno, compacto e elegante
// ==========================================

interface FilterTabProps {
  label: string;
  value: string;
  selected?: boolean;
  onSelect?: (value: string) => void;
  icon?: ReactNode;
  count?: number;
  className?: string;
  color?: string; // Cor opcional para o indicador
}

export function FilterTab({
  label,
  value,
  selected = false,
  onSelect,
  icon,
  count,
  className,
  color,
}: FilterTabProps) {
  return (
    <button
      onClick={() => onSelect?.(value)}
      className={cn(
        "group relative flex items-center gap-1.5 rounded-full text-[13px] font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer",
        selected
          ? "px-3 py-1.5 bg-neutral-700 dark:bg-neutral-300 text-white dark:text-neutral-900 shadow-sm"
          : "px-2.5 py-1.5 text-neutral-400 dark:text-neutral-500",
        className
      )}
    >
      {icon && (
        <span className={cn(
          "flex-shrink-0 [&>svg]:w-[15px] [&>svg]:h-[15px] transition-colors",
          selected ? "text-white dark:text-neutral-900" : "text-neutral-400 dark:text-neutral-500"
        )}>
          {icon}
        </span>
      )}

      <span>{label}</span>

      {count !== undefined && (
        <span className={cn(
          "flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[9px] font-bold transition-all",
          selected
            ? "bg-white/20 dark:bg-black/15 text-white dark:text-neutral-900"
            : "text-neutral-400 dark:text-neutral-500"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

// ==========================================
// FILTER TABS GROUP - Container moderno
// ==========================================

interface FilterTabsGroupProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

export function FilterTabsGroup({ children, label, className }: FilterTabsGroupProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="inline-flex items-center gap-1 p-1 rounded-full bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60">
        {children}
      </div>
    </div>
  );
}

// ==========================================
// FILTER PILL - Alternativa mais compacta
// Para uso em espaços limitados
// ==========================================

interface FilterPillProps {
  label: string;
  value: string;
  selected?: boolean;
  onSelect?: (value: string) => void;
  count?: number;
  color?: string;
  className?: string;
}

export function FilterPill({
  label,
  value,
  selected = false,
  onSelect,
  count,
  color,
  className,
}: FilterPillProps) {
  return (
    <button
      onClick={() => onSelect?.(value)}
      className={cn(
        "relative flex items-center gap-1.5 rounded-full text-[12px] font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap",
        selected
          ? "px-3 py-1.5 bg-neutral-700 dark:bg-neutral-300 text-white dark:text-neutral-900 shadow-sm"
          : "px-2.5 py-1.5 text-neutral-400 dark:text-neutral-500",
        className
      )}
    >
      {color && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      )}

      <span>{label}</span>

      {count !== undefined && count > 0 && (
        <span className={cn(
          "text-[9px] font-bold tabular-nums",
          selected ? "text-white/70 dark:text-neutral-900/60" : "text-neutral-400 dark:text-neutral-500"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}
