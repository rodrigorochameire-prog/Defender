"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

// ==========================================
// FILTER TABS - Filtros em estilo tabs premium
// Design minimalista e funcional
// ==========================================

interface FilterTabProps {
  label: string;
  value: string;
  selected?: boolean;
  onSelect?: (value: string) => void;
  icon?: ReactNode;
  count?: number;
  className?: string;
}

export function FilterTab({
  label,
  value,
  selected = false,
  onSelect,
  icon,
  count,
  className,
}: FilterTabProps) {
  return (
    <button
      onClick={() => onSelect?.(value)}
      className={cn(
        "relative px-4 py-2.5 text-sm font-medium transition-all duration-200",
        "border-b-2 flex items-center gap-2",
        selected
          ? "text-primary border-b-primary font-semibold"
          : "text-muted-foreground border-b-transparent hover:text-foreground hover:border-b-border",
        className
      )}
    >
      {/* Ícone */}
      {icon && (
        <span className={cn(
          "flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4",
          selected ? "text-primary" : "text-muted-foreground"
        )}>
          {icon}
        </span>
      )}

      {/* Label */}
      <span>{label}</span>

      {/* Count */}
      {count !== undefined && (
        <span className={cn(
          "flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold",
          selected 
            ? "bg-primary/15 text-primary" 
            : "bg-muted text-muted-foreground"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

// ==========================================
// FILTER TABS GROUP - Container
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
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          {label}
        </label>
      )}
      <div className="flex flex-wrap border-b-2 border-border/50 bg-muted/10 -mx-4 px-4 pt-2 rounded-t-lg">
        {children}
      </div>
    </div>
  );
}
