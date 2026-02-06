"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  number?: number;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function SectionHeader({
  title,
  subtitle,
  number,
  icon,
  action,
  className,
  size = "md",
}: SectionHeaderProps) {
  const sizeStyles = {
    sm: {
      container: "mb-4",
      number: "w-6 h-6 text-sm",
      icon: "w-5 h-5",
      title: "text-base md:text-lg font-bold tracking-[-0.015em]",
      subtitle: "text-xs uppercase tracking-[0.05em]",
    },
    md: {
      container: "mb-5",
      number: "w-7 h-7 text-base",
      icon: "w-6 h-6",
      title: "text-lg md:text-xl font-bold tracking-[-0.02em]",
      subtitle: "text-xs uppercase tracking-[0.05em]",
    },
    lg: {
      container: "mb-6",
      number: "w-8 h-8 text-lg",
      icon: "w-7 h-7",
      title: "text-xl md:text-2xl font-bold tracking-[-0.025em]",
      subtitle: "text-xs uppercase tracking-[0.05em]",
    },
  };

  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        "flex items-center justify-between border-b-2 border-border/50 bg-muted/20 -mx-4 px-4 py-3 rounded-t-lg",
        styles.container,
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* Número da seção */}
        {number !== undefined && (
          <div
            className={cn(
              "flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold font-mono shadow-sm",
              styles.number
            )}
          >
            {number}
          </div>
        )}

        {/* Ícone */}
        {icon && number === undefined && (
          <div className={cn("text-primary", styles.icon)}>{icon}</div>
        )}

        {/* Textos */}
        <div>
          <h3 className={cn("text-foreground", styles.title)}>{title}</h3>
          {subtitle && (
            <p className={cn("text-muted-foreground font-semibold mt-1", styles.subtitle)}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Ação */}
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// Page Header com título e descrição
interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && <div className="mb-2">{breadcrumbs}</div>}

      {/* Header - COM FUNDO ORGANIZACIONAL */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 mb-5 border-b-2 border-border/70 bg-gradient-to-r from-muted/30 via-muted/10 to-transparent -mx-6 px-6 pt-4 rounded-t-xl">
        <div className="max-w-3xl space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// Defender Page Header - Padrão unificado
// ==========================================
interface DefenderPageHeaderProps {
  title: string;
  description: string;
  icon: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function DefenderPageHeader({
  title,
  description,
  icon,
  actions,
  className,
}: DefenderPageHeaderProps) {
  return (
    <div className={cn(
      "px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
            <span className="text-white dark:text-zinc-900 [&>svg]:w-5 [&>svg]:h-5">
              {icon}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              {title}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-1.5">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
