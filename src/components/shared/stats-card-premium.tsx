"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

/**
 * ==========================================
 * STATS CARD PREMIUM - Design Unificado
 * ==========================================
 * 
 * Combina:
 * - Visual clean do Dashboard
 * - Efeitos hover das Demandas
 * - Tamanho balanceado e responsivo
 */

export interface PremiumStatsCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  subtitle?: string;
  variant?: "default" | "success" | "danger" | "warning" | "info" | "primary";
  href?: string;
  onClick?: () => void;
  className?: string;
}

const variants = {
  default: {
    iconBg: "bg-zinc-100 dark:bg-zinc-800",
    iconColor: "text-zinc-600 dark:text-zinc-400",
    valueColor: "text-zinc-900 dark:text-zinc-50",
    hoverAccent: "group-hover:border-zinc-300 dark:group-hover:border-zinc-700",
  },
  primary: {
    iconBg: "bg-emerald-100 dark:bg-emerald-950/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    valueColor: "text-zinc-900 dark:text-zinc-50 group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
    hoverAccent: "group-hover:border-emerald-300 dark:group-hover:border-emerald-800",
  },
  success: {
    iconBg: "bg-emerald-100 dark:bg-emerald-950/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    valueColor: "text-emerald-700 dark:text-emerald-300",
    hoverAccent: "group-hover:border-emerald-300 dark:group-hover:border-emerald-800",
  },
  danger: {
    iconBg: "bg-rose-100 dark:bg-rose-950/40",
    iconColor: "text-rose-600 dark:text-rose-400",
    valueColor: "text-rose-700 dark:text-rose-300",
    hoverAccent: "group-hover:border-rose-300 dark:group-hover:border-rose-800",
  },
  warning: {
    iconBg: "bg-amber-100 dark:bg-amber-950/40",
    iconColor: "text-amber-600 dark:text-amber-400",
    valueColor: "text-amber-700 dark:text-amber-300",
    hoverAccent: "group-hover:border-amber-300 dark:group-hover:border-amber-800",
  },
  info: {
    iconBg: "bg-blue-100 dark:bg-blue-950/40",
    iconColor: "text-blue-600 dark:text-blue-400",
    valueColor: "text-blue-700 dark:text-blue-300",
    hoverAccent: "group-hover:border-blue-300 dark:group-hover:border-blue-800",
  },
};

export function PremiumStatsCard({
  label,
  value,
  icon: Icon,
  subtitle,
  variant = "primary",
  href,
  onClick,
  className,
}: PremiumStatsCardProps) {
  const styles = variants[variant];

  const CardContent = (
    <div
      className={cn(
        // Base - padding maior em mobile
        "p-5 sm:p-4 md:p-5 rounded-2xl md:rounded-2xl",
        "bg-white dark:bg-zinc-900",
        "border border-zinc-200/80 dark:border-zinc-800/80",
        // Hover effects - combina clean + efeitos
        "transition-all duration-300 ease-out",
        "hover:shadow-xl hover:shadow-zinc-200/50 dark:hover:shadow-black/20",
        "hover:-translate-y-0.5",
        styles.hoverAccent,
        // Cursor
        (href || onClick) && "cursor-pointer",
        // Group for child animations
        "group",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4 sm:gap-3">
        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-1">
          {/* Label - maior em mobile */}
          <p className="text-sm sm:text-xs md:text-sm font-semibold text-zinc-600 dark:text-zinc-400 truncate">
            {label}
          </p>
          
          {/* Value - maior em mobile */}
          <p className={cn(
            "text-3xl sm:text-2xl md:text-3xl font-bold tracking-tight transition-colors duration-300",
            styles.valueColor
          )}>
            {value}
          </p>
          
          {/* Subtitle - maior em mobile */}
          {subtitle && (
            <p className="text-xs sm:text-[10px] md:text-xs text-zinc-500 dark:text-zinc-500 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        {/* Icon - maior em mobile */}
        <div className={cn(
          "w-12 h-12 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0",
          "transition-all duration-300",
          "group-hover:scale-110",
          styles.iconBg
        )}>
          <Icon className={cn(
            "w-6 h-6 sm:w-5 sm:h-5 md:w-6 md:h-6",
            styles.iconColor
          )} strokeWidth={2} />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{CardContent}</Link>;
  }

  return CardContent;
}

/**
 * Grid de Stats Cards Premium
 */
export interface PremiumStatsGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function PremiumStatsGrid({ children, columns = 4, className }: PremiumStatsGridProps) {
  // 2 colunas em mobile
  return (
    <div
      className={cn(
        "grid gap-3 md:gap-4",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}
