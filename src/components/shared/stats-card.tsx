"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

// ==========================================
// STATS CARD - Componente padronizado para métricas
// Design System: tipografia consistente, elevação, cores funcionais
// ==========================================

interface StatsCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  variant?: "default" | "highlight" | "warning" | "danger" | "success" | "info";
  trend?: {
    value: number;
    label?: string;
    direction: "up" | "down" | "neutral";
  };
  subtitle?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const variantStyles = {
  default: {
    container: "bg-card border-border",
    icon: "text-muted-foreground bg-muted",
    value: "text-foreground",
    label: "text-muted-foreground",
  },
  highlight: {
    container: "bg-card border-l-4 border-l-primary border-t-0 border-r-0 border-b-0",
    icon: "text-primary bg-primary/10",
    value: "text-primary",
    label: "text-muted-foreground",
  },
  warning: {
    container: "bg-amber-50/50 dark:bg-amber-950/20 border-l-4 border-l-amber-500 border-t-0 border-r-0 border-b-0",
    icon: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30",
    value: "text-amber-700 dark:text-amber-400",
    label: "text-amber-600/80 dark:text-amber-400/80",
  },
  danger: {
    container: "bg-rose-50/50 dark:bg-rose-950/20 border-l-4 border-l-rose-500 border-t-0 border-r-0 border-b-0",
    icon: "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30",
    value: "text-rose-700 dark:text-rose-400",
    label: "text-rose-600/80 dark:text-rose-400/80",
  },
  success: {
    container: "bg-emerald-50/50 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500 border-t-0 border-r-0 border-b-0",
    icon: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30",
    value: "text-emerald-700 dark:text-emerald-400",
    label: "text-emerald-600/80 dark:text-emerald-400/80",
  },
  info: {
    container: "bg-blue-50/50 dark:bg-blue-950/20 border-l-4 border-l-blue-500 border-t-0 border-r-0 border-b-0",
    icon: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30",
    value: "text-blue-700 dark:text-blue-400",
    label: "text-blue-600/80 dark:text-blue-400/80",
  },
};

const sizeStyles = {
  sm: {
    container: "p-4",
    icon: "w-9 h-9",
    iconInner: "w-5 h-5",
    value: "text-2xl md:text-3xl font-bold",
    label: "text-xs md:text-sm",
  },
  md: {
    container: "p-6 md:p-7",
    icon: "w-12 h-12 md:w-14 md:h-14",
    iconInner: "w-6 h-6 md:w-7 md:h-7",
    value: "text-4xl md:text-5xl font-bold",
    label: "text-base md:text-lg",
  },
  lg: {
    container: "p-7 md:p-8",
    icon: "w-14 h-14 md:w-16 md:h-16",
    iconInner: "w-7 h-7 md:w-8 md:h-8",
    value: "text-5xl md:text-6xl font-bold",
    label: "text-lg md:text-xl",
  },
};

export function StatsCard({
  label,
  value,
  icon: Icon,
  variant = "default",
  trend,
  subtitle,
  className,
  size = "md",
}: StatsCardProps) {
  const styles = variantStyles[variant];
  const sizes = sizeStyles[size];

  return (
    <div
      className={cn(
        "rounded-xl border-2 shadow-sm transition-all duration-200 hover:shadow-lg hover:scale-[1.02]",
        styles.container,
        sizes.container,
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <p className={cn("font-sans font-bold tabular-nums tracking-tight leading-none", sizes.value, styles.value)}>
            {value}
          </p>
          <p className={cn("uppercase tracking-[0.06em] font-semibold", sizes.label, styles.label)}>
            {label}
          </p>
          {subtitle && (
            <p className="text-xs md:text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={cn(
                  "text-sm md:text-base font-semibold",
                  trend.direction === "up" && "text-emerald-600",
                  trend.direction === "down" && "text-rose-600",
                  trend.direction === "neutral" && "text-muted-foreground"
                )}
              >
                {trend.direction === "up" && "↑"}
                {trend.direction === "down" && "↓"}
                {trend.value}%
              </span>
              {trend.label && (
                <span className="text-xs md:text-sm text-muted-foreground">{trend.label}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "rounded-xl flex items-center justify-center flex-shrink-0",
              sizes.icon,
              styles.icon
            )}
          >
            <Icon className={sizes.iconInner} />
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// STATS GRID - Container para métricas
// ==========================================

interface StatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6 | 8;
  className?: string;
}

export function StatsGrid({ children, columns = 4, className }: StatsGridProps) {
  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
    8: "grid-cols-2 md:grid-cols-4 lg:grid-cols-8",
  };

  return (
    <div className={cn("grid gap-4 md:gap-5 lg:gap-6", gridCols[columns], className)}>
      {children}
    </div>
  );
}

// ==========================================
// STAT ROW - Para estatísticas horizontais compactas
// ==========================================

interface StatRowProps {
  items: Array<{
    label: string;
    value: number | string;
    icon?: LucideIcon;
    variant?: "default" | "warning" | "danger" | "success";
  }>;
  className?: string;
}

export function StatRow({ items, className }: StatRowProps) {
  return (
    <div className={cn("flex items-center gap-5 flex-wrap", className)}>
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={index}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border-2",
              item.variant === "warning" && "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
              item.variant === "danger" && "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800",
              item.variant === "success" && "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
              !item.variant && "bg-muted border-border"
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  "w-5 h-5 md:w-6 md:h-6",
                  item.variant === "warning" && "text-amber-600",
                  item.variant === "danger" && "text-rose-600",
                  item.variant === "success" && "text-emerald-600",
                  !item.variant && "text-muted-foreground"
                )}
              />
            )}
            <span
              className={cn(
                "font-bold text-lg md:text-xl",
                item.variant === "warning" && "text-amber-700 dark:text-amber-400",
                item.variant === "danger" && "text-rose-700 dark:text-rose-400",
                item.variant === "success" && "text-emerald-700 dark:text-emerald-400",
                !item.variant && "text-foreground"
              )}
            >
              {item.value}
            </span>
            <span className="text-sm md:text-base text-muted-foreground font-medium">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
