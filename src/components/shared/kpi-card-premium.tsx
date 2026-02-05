"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp } from "lucide-react";

// ==========================================
// KPI CARD PREMIUM - Design refinado para métricas
// Baseado no design da página de processos
// ==========================================

const GRADIENT_CONFIGS = {
  emerald: {
    bg: "from-emerald-500/10 via-emerald-500/5 to-transparent",
    border: "border-emerald-200/50 dark:border-emerald-800/30",
    icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    text: "text-emerald-600 dark:text-emerald-400",
    glow: "group-hover:shadow-emerald-500/10",
  },
  blue: {
    bg: "from-blue-500/10 via-blue-500/5 to-transparent",
    border: "border-blue-200/50 dark:border-blue-800/30",
    icon: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    text: "text-blue-600 dark:text-blue-400",
    glow: "group-hover:shadow-blue-500/10",
  },
  amber: {
    bg: "from-amber-500/10 via-amber-500/5 to-transparent",
    border: "border-amber-200/50 dark:border-amber-800/30",
    icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    text: "text-amber-600 dark:text-amber-400",
    glow: "group-hover:shadow-amber-500/10",
  },
  rose: {
    bg: "from-rose-500/10 via-rose-500/5 to-transparent",
    border: "border-rose-200/50 dark:border-rose-800/30",
    icon: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    text: "text-rose-600 dark:text-rose-400",
    glow: "group-hover:shadow-rose-500/10",
  },
  violet: {
    bg: "from-violet-500/10 via-violet-500/5 to-transparent",
    border: "border-violet-200/50 dark:border-violet-800/30",
    icon: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    text: "text-violet-600 dark:text-violet-400",
    glow: "group-hover:shadow-violet-500/10",
  },
  zinc: {
    bg: "from-zinc-500/10 via-zinc-500/5 to-transparent",
    border: "border-zinc-200/50 dark:border-zinc-700/50",
    icon: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
    text: "text-zinc-600 dark:text-zinc-400",
    glow: "group-hover:shadow-zinc-500/10",
  },
};

type GradientType = keyof typeof GRADIENT_CONFIGS;

interface KPICardPremiumProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: { value: number; label?: string };
  gradient?: GradientType;
  onClick?: () => void;
  active?: boolean;
  href?: string;
  size?: "sm" | "md";
  className?: string;
}

export function KPICardPremium({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  gradient = "zinc",
  onClick,
  active,
  href,
  size = "md",
  className,
}: KPICardPremiumProps) {
  const config = GRADIENT_CONFIGS[gradient];

  const sizeStyles = {
    sm: {
      container: "p-3",
      icon: "w-8 h-8",
      iconInner: "w-3.5 h-3.5",
      value: "text-xl font-bold",
      title: "text-[9px]",
      subtitle: "text-[9px]",
    },
    md: {
      container: "p-4",
      icon: "w-10 h-10",
      iconInner: "w-4 h-4",
      value: "text-2xl font-bold",
      title: "text-[10px]",
      subtitle: "text-[10px]",
    },
  };

  const styles = sizeStyles[size];

  const content = (
    <div
      onClick={onClick}
      className={cn(
        "group relative rounded-xl bg-white dark:bg-zinc-900 border overflow-hidden transition-all duration-300",
        onClick && "cursor-pointer",
        href && "cursor-pointer",
        active ? config.border : "border-zinc-100 dark:border-zinc-800",
        "hover:shadow-lg",
        config.glow,
        styles.container,
        className
      )}
    >
      {/* Gradient Background */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        config.bg
      )} />

      {/* Top accent line */}
      <div className={cn(
        "absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-100 transition-opacity",
        config.text
      )} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <p className={cn(
            "font-medium uppercase tracking-wider transition-colors",
            active ? config.text : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300",
            styles.title
          )}>
            {title}
          </p>
          <p className={cn("text-zinc-800 dark:text-zinc-100", styles.value)}>{value}</p>
          {subtitle && (
            <p className={cn("text-zinc-400", styles.subtitle)}>{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-medium",
              trend.value >= 0 ? "text-emerald-600" : "text-rose-600"
            )}>
              <TrendingUp className={cn("w-3 h-3", trend.value < 0 && "rotate-180")} />
              <span>{trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "rounded-xl flex items-center justify-center transition-all duration-300",
            config.icon,
            styles.icon
          )}>
            <Icon className={styles.iconInner} />
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    // Importar Link dinamicamente não funciona bem, então retornar div com data attribute
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }

  return content;
}

// Grid container para KPI cards
interface KPIGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export function KPIGrid({ children, columns = 4, className }: KPIGridProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
  };

  return (
    <div className={cn("grid gap-3", gridCols[columns], className)}>
      {children}
    </div>
  );
}
