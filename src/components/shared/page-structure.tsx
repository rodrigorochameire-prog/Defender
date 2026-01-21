"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

// ==========================================
// PAGE CONTAINER - Container principal da página
// ==========================================

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "default" | "wide" | "full";
}

export function PageContainer({ 
  children, 
  className,
  maxWidth = "default" 
}: PageContainerProps) {
  const widthStyles = {
    default: "max-w-7xl",
    wide: "max-w-[1600px]",
    full: "max-w-full",
  };

  return (
    <div className={cn(
      "mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8",
      widthStyles[maxWidth],
      className
    )}>
      {children}
    </div>
  );
}

// ==========================================
// PAGE SECTION - Seção da página com header
// ==========================================

interface PageSectionProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  description?: string;
  number?: number;
  icon?: ReactNode;
  action?: ReactNode;
  headerAction?: ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: "default" | "outlined" | "filled";
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function PageSection({
  children,
  title,
  subtitle,
  description,
  number,
  icon,
  action,
  headerAction,
  className,
  contentClassName,
  variant = "default",
  collapsible = false,
  defaultCollapsed = false,
}: PageSectionProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  const variantStyles = {
    default: "space-y-6",
    outlined: "border border-border rounded-xl p-6 space-y-6",
    filled: "bg-muted/30 border border-border/50 rounded-xl p-6 space-y-6",
  };

  const hasHeader = title || subtitle || number !== undefined || icon;

  return (
    <section className={cn(variantStyles[variant], className)}>
      {/* Header */}
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-border/40">
          <div className="flex items-start gap-4 flex-1">
            {/* Número ou Ícone */}
            {number !== undefined && (
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground font-bold font-mono text-lg flex-shrink-0">
                {number}
              </div>
            )}
            {icon && number === undefined && (
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
                {icon}
              </div>
            )}

            {/* Textos */}
            <div className="flex-1 min-w-0 space-y-1">
              {subtitle && (
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  {subtitle}
                </p>
              )}
              {title && (
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Header Action */}
          {(headerAction || collapsible) && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {headerAction}
              {collapsible && (
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="p-2 hover:bg-muted rounded-md transition-colors"
                >
                  <ChevronRight className={cn(
                    "w-5 h-5 transition-transform",
                    !isCollapsed && "rotate-90"
                  )} />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Bar (abaixo do header) */}
      {action && !isCollapsed && (
        <div className="flex items-center gap-2 flex-wrap">
          {action}
        </div>
      )}

      {/* Content */}
      {!isCollapsed && (
        <div className={cn(contentClassName)}>
          {children}
        </div>
      )}
    </section>
  );
}

// ==========================================
// CONTENT GRID - Grid responsivo para conteúdo
// ==========================================

interface ContentGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

export function ContentGrid({ 
  children, 
  columns = 3,
  gap = "md",
  className 
}: ContentGridProps) {
  const gapStyles = {
    sm: "gap-3",
    md: "gap-4",
    lg: "gap-6",
  };

  const columnStyles = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
  };

  return (
    <div className={cn(
      "grid",
      columnStyles[columns],
      gapStyles[gap],
      className
    )}>
      {children}
    </div>
  );
}

// ==========================================
// INFO BLOCK - Bloco de informação destacado
// ==========================================

interface InfoBlockProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  variant?: "default" | "info" | "warning" | "success" | "danger";
  className?: string;
}

export function InfoBlock({
  title,
  description,
  icon,
  children,
  variant = "default",
  className,
}: InfoBlockProps) {
  const variantStyles = {
    default: "bg-muted/30 border-border/50 text-foreground",
    info: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50 text-blue-900 dark:text-blue-100",
    warning: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-100",
    success: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-100",
    danger: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-rose-900 dark:text-rose-100",
  };

  return (
    <div className={cn(
      "rounded-lg border p-4",
      variantStyles[variant],
      className
    )}>
      <div className="flex gap-3">
        {icon && (
          <div className="flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1 space-y-1">
          {title && (
            <h4 className="text-sm font-semibold">
              {title}
            </h4>
          )}
          {description && (
            <p className="text-sm opacity-90">
              {description}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// DIVIDER - Separador de seções
// ==========================================

interface DividerProps {
  label?: string;
  className?: string;
  variant?: "default" | "strong";
}

export function Divider({ label, className, variant = "default" }: DividerProps) {
  const variantStyles = {
    default: "border-border/40",
    strong: "border-border",
  };

  if (label) {
    return (
      <div className={cn("relative", className)}>
        <div className={cn("absolute inset-0 flex items-center", variantStyles[variant])}>
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-4 text-muted-foreground font-medium tracking-wider">
            {label}
          </span>
        </div>
      </div>
    );
  }

  return <hr className={cn("border-t", variantStyles[variant], className)} />;
}

// ==========================================
// STAT BLOCK - Bloco de estatística
// ==========================================

interface StatBlockProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease";
  };
  icon?: ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  className?: string;
}

export function StatBlock({
  label,
  value,
  change,
  icon,
  variant = "default",
  className,
}: StatBlockProps) {
  const variantStyles = {
    default: "border-l-zinc-300 dark:border-l-zinc-600",
    primary: "border-l-primary",
    success: "border-l-emerald-500",
    warning: "border-l-amber-500",
    danger: "border-l-rose-500",
  };

  return (
    <div className={cn(
      "stat-card-enhanced border-l-[3px]",
      variantStyles[variant],
      className
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {value}
          </p>
          {change && (
            <p className={cn(
              "text-xs font-medium flex items-center gap-1",
              change.type === "increase" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            )}>
              {change.type === "increase" ? "↑" : "↓"} {Math.abs(change.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-muted">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// Importação do React no topo
import * as React from "react";
