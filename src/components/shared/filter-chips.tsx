"use client";

import { cn } from "@/lib/utils";
import { X, Check } from "lucide-react";
import { ReactNode } from "react";

// ==========================================
// FILTER CHIP - Individual
// ==========================================

interface FilterChipProps {
  label: string;
  value: string;
  selected?: boolean;
  onSelect?: (value: string) => void;
  onRemove?: (value: string) => void;
  icon?: ReactNode;
  count?: number;
  variant?: "default" | "outline" | "solid";
  size?: "sm" | "md";
  removable?: boolean;
  className?: string;
}

export function FilterChip({
  label,
  value,
  selected = false,
  onSelect,
  onRemove,
  icon,
  count,
  variant = "default",
  size = "md",
  removable = false,
  className,
}: FilterChipProps) {
  const handleClick = () => {
    if (removable && selected) {
      onRemove?.(value);
    } else {
      onSelect?.(value);
    }
  };

  const sizeStyles = {
    sm: "h-7 text-xs px-2.5 gap-1.5",
    md: "h-8 text-sm px-3 gap-2",
  };

  const variantStyles = {
    default: selected
      ? "bg-primary text-primary-foreground border-primary"
      : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground",
    outline: selected
      ? "bg-primary/10 text-primary border-primary/50"
      : "bg-transparent text-muted-foreground border-border hover:border-primary/30 hover:text-foreground",
    solid: selected
      ? "bg-foreground text-background border-foreground"
      : "bg-muted text-muted-foreground border-muted hover:bg-muted/80",
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "inline-flex items-center rounded-full border font-medium transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
    >
      {/* Check icon quando selecionado */}
      {selected && !icon && (
        <Check className="w-3.5 h-3.5 flex-shrink-0" />
      )}
      
      {/* Custom icon */}
      {icon && (
        <span className="flex-shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5">
          {icon}
        </span>
      )}

      {/* Label */}
      <span className="truncate">{label}</span>

      {/* Count badge */}
      {count !== undefined && (
        <span className={cn(
          "flex-shrink-0 rounded-full text-xs font-semibold min-w-[1.25rem] text-center",
          selected 
            ? "bg-primary-foreground/20 text-primary-foreground px-1.5" 
            : "bg-muted-foreground/20 px-1.5"
        )}>
          {count}
        </span>
      )}

      {/* Remove button */}
      {removable && selected && (
        <X 
          className="w-3.5 h-3.5 flex-shrink-0 hover:text-destructive transition-colors" 
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.(value);
          }}
        />
      )}
    </button>
  );
}

// ==========================================
// FILTER CHIP GROUP - Container
// ==========================================

interface FilterChipGroupProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

export function FilterChipGroup({ children, label, className }: FilterChipGroupProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  );
}

// ==========================================
// ACTIVE FILTERS BAR - Shows active filters
// ==========================================

interface ActiveFilter {
  key: string;
  label: string;
  value: string;
}

interface ActiveFiltersBarProps {
  filters: ActiveFilter[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function ActiveFiltersBar({ 
  filters, 
  onRemove, 
  onClearAll,
  className 
}: ActiveFiltersBarProps) {
  if (filters.length === 0) return null;

  return (
    <div className={cn(
      "flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50",
      className
    )}>
      <span className="text-xs font-medium text-muted-foreground flex-shrink-0">
        Filtros ativos:
      </span>
      
      <div className="flex flex-wrap gap-1.5 flex-1">
        {filters.map((filter) => (
          <span
            key={filter.key}
            className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md bg-primary/10 text-primary text-xs font-medium"
          >
            <span className="text-primary/70">{filter.label}:</span>
            <span>{filter.value}</span>
            <button
              onClick={() => onRemove(filter.key)}
              className="hover:text-destructive transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      <button
        onClick={onClearAll}
        className="text-xs text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
      >
        Limpar todos
      </button>
    </div>
  );
}
