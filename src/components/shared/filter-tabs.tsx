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
        "group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
        "border overflow-hidden",
        selected
          ? "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-sm"
          : "bg-transparent border-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-700 dark:hover:text-zinc-300",
        className
      )}
    >
      {/* Indicador colorido à esquerda quando selecionado */}
      {selected && color && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-lg"
          style={{ backgroundColor: color }}
        />
      )}
      
      {/* Ícone */}
      {icon && (
        <span className={cn(
          "flex-shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5 transition-colors",
          selected ? "text-zinc-600 dark:text-zinc-300" : "text-zinc-400 dark:text-zinc-500"
        )}>
          {icon}
        </span>
      )}

      {/* Label */}
      <span className="whitespace-nowrap">{label}</span>

      {/* Count */}
      {count !== undefined && (
        <span className={cn(
          "flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[10px] font-semibold transition-all",
          selected 
            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" 
            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
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
        <label className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-1.5 py-1">
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
        "relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200",
        selected
          ? "bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900"
          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700",
        className
      )}
    >
      {/* Dot colorido */}
      {color && (
        <span 
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      
      <span>{label}</span>
      
      {count !== undefined && count > 0 && (
        <span className={cn(
          "text-[10px] font-bold",
          selected ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-400 dark:text-zinc-500"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}
