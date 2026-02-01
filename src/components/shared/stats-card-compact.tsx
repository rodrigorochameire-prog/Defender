"use client";

import { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatsCardCompactProps {
  label: string;
  value: string | number;
  change?: string;
  changeLabel?: string;
  icon: LucideIcon;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * Card de estatísticas compacto padronizado
 * Segue o padrão visual de Demandas/Dashboard
 */
export function StatsCardCompact({
  label,
  value,
  change,
  changeLabel,
  icon: Icon,
  loading = false,
  className,
  onClick,
}: StatsCardCompactProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800",
        "hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-300",
        "hover:shadow-lg hover:shadow-emerald-500/[0.03] dark:hover:shadow-emerald-500/[0.05]",
        onClick && "cursor-pointer",
        className
      )}
    >
      {/* Linha superior sutil no hover */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-300 rounded-t-xl" />
      
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide group-hover:text-emerald-600/70 dark:group-hover:text-emerald-400/70 transition-colors duration-300">
            {label}
          </p>
          {loading ? (
            <Skeleton className="h-6 w-14" />
          ) : (
            <p className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
              {value}
            </p>
          )}
          {(change || changeLabel) && (
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
              {change && (
                <span className="text-emerald-600 dark:text-emerald-500 font-medium">
                  {change}
                </span>
              )}{" "}
              {changeLabel}
            </p>
          )}
        </div>
        <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 border border-zinc-200 dark:border-zinc-700 group-hover:border-emerald-300/30 dark:group-hover:border-emerald-700/30 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-all duration-300">
          <Icon className="w-4 h-4 text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300" />
        </div>
      </div>
    </div>
  );
}

interface StatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

export function StatsGrid({ children, columns = 4 }: StatsGridProps) {
  const colsClass = {
    2: "grid-cols-2",
    3: "grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-3", colsClass[columns])}>
      {children}
    </div>
  );
}
