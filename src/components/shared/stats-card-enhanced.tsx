"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

/**
 * ==========================================
 * STATS CARDS PADRONIZADOS
 * Design Premium - Defensoria Pública
 * ==========================================
 * 
 * Cards de estatísticas com visual sofisticado
 * e consistente em toda a aplicação.
 */

export interface StatsCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  variant?: "default" | "success" | "danger" | "warning" | "info";
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  onClick?: () => void;
  className?: string;
}

export function StatsCard({
  label,
  value,
  icon: Icon,
  variant = "default",
  trend,
  onClick,
  className,
}: StatsCardProps) {
  const variants = {
    default: {
      bg: "bg-card",
      iconBg: "bg-muted",
      iconColor: "text-muted-foreground",
      valueColor: "text-foreground",
    },
    success: {
      bg: "bg-card",
      iconBg: "bg-emerald-100 dark:bg-emerald-950/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      valueColor: "text-emerald-700 dark:text-emerald-300",
    },
    danger: {
      bg: "bg-card",
      iconBg: "bg-rose-100 dark:bg-rose-950/30",
      iconColor: "text-rose-600 dark:text-rose-400",
      valueColor: "text-rose-700 dark:text-rose-300",
    },
    warning: {
      bg: "bg-card",
      iconBg: "bg-amber-100 dark:bg-amber-950/30",
      iconColor: "text-amber-600 dark:text-amber-400",
      valueColor: "text-amber-700 dark:text-amber-300",
    },
    info: {
      bg: "bg-card",
      iconBg: "bg-blue-100 dark:bg-blue-950/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      valueColor: "text-blue-700 dark:text-blue-300",
    },
  };

  const variantStyles = variants[variant];

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border border-border/60 p-5 shadow-card transition-all duration-200",
        variantStyles.bg,
        onClick && "cursor-pointer hover:shadow-card-hover hover:border-border",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg",
            variantStyles.iconBg
          )}
        >
          <Icon className={cn("w-5 h-5", variantStyles.iconColor)} />
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md",
              trend.direction === "up"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                : "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
            )}
          >
            {trend.direction === "up" ? "↑" : "↓"} {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p
          className={cn(
            "text-3xl font-bold tracking-tight",
            variantStyles.valueColor
          )}
        >
          {value}
        </p>
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
      </div>
    </div>
  );
}

/**
 * Grid de Stats Cards
 */
export interface StatsGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export function StatsGrid({ children, columns = 4, className }: StatsGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        columns === 5 && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
        columns === 6 && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Stats Card Compacto (para sidebar, dashboards condensados)
 */
export interface CompactStatsCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  variant?: "default" | "success" | "danger" | "warning";
  onClick?: () => void;
}

export function CompactStatsCard({
  label,
  value,
  icon: Icon,
  variant = "default",
  onClick,
}: CompactStatsCardProps) {
  const variants = {
    default: "text-muted-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    danger: "text-rose-600 dark:text-rose-400",
    warning: "text-amber-600 dark:text-amber-400",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card",
        "transition-all duration-200",
        onClick && "cursor-pointer hover:bg-muted/50 hover:border-border"
      )}
    >
      <Icon className={cn("w-4 h-4 flex-shrink-0", variants[variant])} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={cn("text-lg font-bold", variants[variant])}>{value}</p>
      </div>
    </div>
  );
}
