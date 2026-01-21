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
    sm: "h-8 text-sm px-3 gap-1.5",
    md: "h-10 md:h-12 text-sm md:text-base px-5 gap-2.5",
  };

  const variantStyles = {
    default: selected
      ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
      : "bg-card text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground hover:border-border",
    outline: selected
      ? "bg-primary/10 text-primary border-primary shadow-md scale-[1.02]"
      : "bg-transparent text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground hover:bg-primary/5",
    solid: selected
      ? "bg-foreground text-background border-foreground shadow-md scale-[1.02]"
      : "bg-muted text-muted-foreground border-muted hover:bg-muted/80",
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "inline-flex items-center rounded-xl border-2 font-semibold transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "hover:shadow-lg",
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
    >
      {/* Check icon quando selecionado */}
      {selected && !icon && (
        <Check className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
      )}
      
      {/* Custom icon */}
      {icon && (
        <span className="flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4 md:[&>svg]:w-5 md:[&>svg]:h-5">
          {icon}
        </span>
      )}

      {/* Label */}
      <span className="truncate">{label}</span>

      {/* Count badge */}
      {count !== undefined && (
        <span className={cn(
          "flex-shrink-0 rounded-full text-xs md:text-sm font-bold min-w-[1.75rem] h-6 md:h-7 flex items-center justify-center px-2",
          selected 
            ? "bg-primary-foreground/20 text-primary-foreground" 
            : "bg-muted text-muted-foreground"
        )}>
          {count}
        </span>
      )}

      {/* Remove button */}
      {removable && selected && (
        <X 
          className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 hover:text-destructive transition-colors" 
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
    <div className={cn("space-y-3", className)}>
      {label && (
        <label className="text-sm md:text-base font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-3">
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
      "flex items-center gap-3 p-5 rounded-xl bg-primary/5 border-2 border-primary/30",
      className
    )}>
      <span className="text-sm md:text-base font-semibold text-primary flex-shrink-0">
        Filtros ativos:
      </span>
      
      <div className="flex flex-wrap gap-2 flex-1">
        {filters.map((filter) => (
          <span
            key={filter.key}
            className="inline-flex items-center gap-2 h-8 md:h-9 px-3 rounded-lg bg-primary/10 text-primary text-sm md:text-base font-semibold border-2 border-primary/20"
          >
            <span className="text-primary/70">{filter.label}:</span>
            <span>{filter.value}</span>
            <button
              onClick={() => onRemove(filter.key)}
              className="hover:text-destructive transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </span>
        ))}
      </div>

      <button
        onClick={onClearAll}
        className="text-sm md:text-base font-medium text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 px-3"
      >
        Limpar todos
      </button>
    </div>
  );
}
