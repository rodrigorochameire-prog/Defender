"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

// ==========================================
// STATS CARD - Componente padronizado para métricas
// Design System: Visual unificado com hover emerald
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
  onClick?: () => void;
  isActive?: boolean;
}

const sizeStyles = {
  sm: {
    container: "p-4",
    icon: "w-9 h-9",
    iconInner: "w-4 h-4",
    value: "text-xl font-semibold",
    label: "text-[10px]",
  },
  md: {
    container: "p-4",
    icon: "w-9 h-9",
    iconInner: "w-4 h-4",
    value: "text-xl font-semibold",
    label: "text-[10px]",
  },
  lg: {
    container: "p-5",
    icon: "w-10 h-10",
    iconInner: "w-5 h-5",
    value: "text-2xl font-bold",
    label: "text-xs",
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
  onClick,
  isActive,
}: StatsCardProps) {
  const sizes = sizeStyles[size];
  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={cn(
        "group relative text-left rounded-xl bg-white dark:bg-zinc-900 border transition-all duration-300",
        isActive 
          ? "border-emerald-200 dark:border-emerald-800/50 ring-2 ring-emerald-100 dark:ring-emerald-900/30" 
          : "border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30",
        onClick && "cursor-pointer hover:shadow-lg hover:shadow-emerald-500/[0.03] dark:hover:shadow-emerald-500/[0.05]",
        sizes.container,
        className
      )}
    >
      {/* Linha superior sutil no hover */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-300 rounded-t-xl" />
      
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <p className={cn(
            "font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide group-hover:text-emerald-600/70 dark:group-hover:text-emerald-400/70 transition-colors duration-300",
            sizes.label
          )}>
            {label}
          </p>
          <p className={cn("text-zinc-700 dark:text-zinc-300", sizes.value)}>
            {value}
          </p>
          {subtitle && (
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={cn(
                  "text-xs font-semibold",
                  trend.direction === "up" && "text-emerald-600",
                  trend.direction === "down" && "text-rose-600",
                  trend.direction === "neutral" && "text-zinc-500"
                )}
              >
                {trend.direction === "up" && "↑"}
                {trend.direction === "down" && "↓"}
                {trend.value}%
              </span>
              {trend.label && (
                <span className="text-[10px] text-zinc-400">{trend.label}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 border border-zinc-200 dark:border-zinc-700 group-hover:border-emerald-300/30 dark:group-hover:border-emerald-700/30 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-all duration-300",
            sizes.icon
          )}>
            <Icon className={cn(
              "text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300",
              sizes.iconInner
            )} />
          </div>
        )}
      </div>
    </Component>
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
