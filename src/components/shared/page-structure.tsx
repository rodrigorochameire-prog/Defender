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
  /** Use the unified background style (bg-zinc-100 dark:bg-[#0f0f11]) */
  unifiedBackground?: boolean;
}

export function PageContainer({ 
  children, 
  className,
  maxWidth = "default",
  unifiedBackground = true 
}: PageContainerProps) {
  const widthStyles = {
    default: "max-w-7xl",
    wide: "max-w-[1600px]",
    full: "max-w-full",
  };

  return (
    <div className={cn(
      "min-h-screen",
      unifiedBackground && "bg-zinc-100 dark:bg-[#0f0f11]"
    )}>
      <div className={cn(
        "mx-auto w-full",
        widthStyles[maxWidth],
        className
      )}>
        {children}
      </div>
    </div>
  );
}

// ==========================================
// PAGE SUB-HEADER - Sub-header unificado (padrão Demandas/Dashboard)
// ==========================================

interface PageSubHeaderProps {
  icon?: React.ReactNode;
  subtitle: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageSubHeader({
  icon,
  subtitle,
  actions,
  className,
}: PageSubHeaderProps) {
  return (
    <div className={cn(
      "px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {icon && (
            <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
              {icon}
            </div>
          )}
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            {subtitle}
          </span>
        </div>
        
        {actions && (
          <div className="flex items-center gap-0.5">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// PAGE CONTENT - Wrapper para conteúdo principal
// ==========================================

interface PageContentProps {
  children: ReactNode;
  className?: string;
}

export function PageContent({ children, className }: PageContentProps) {
  return (
    <div className={cn("p-4 md:p-6 space-y-4 md:space-y-6", className)}>
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
    default: "space-y-5",
    outlined: "border-2 border-border rounded-xl p-5 md:p-6 space-y-5",
    filled: "bg-muted/30 border-2 border-border/50 rounded-xl p-5 md:p-6 space-y-5",
  };

  const hasHeader = title || subtitle || number !== undefined || icon;

  return (
    <section className={cn(variantStyles[variant], className)}>
      {/* Header */}
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 pb-3 mb-4 border-b-2 border-border/50 bg-muted/20 -mx-4 px-4 py-3 rounded-t-lg">
          <div className="flex items-start gap-3 flex-1">
            {/* Número ou Ícone */}
            {number !== undefined && (
              <div className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-lg bg-primary text-primary-foreground font-bold font-mono text-base md:text-lg flex-shrink-0 shadow-sm">
                {number}
              </div>
            )}
            {icon && number === undefined && (
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
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
                <h2 className="text-lg md:text-xl font-bold text-foreground tracking-tight leading-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-3xl">
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
    sm: "gap-3 md:gap-4",
    md: "gap-4 md:gap-5",
    lg: "gap-6 md:gap-8",
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
      "rounded-xl border-2 p-5 md:p-6",
      variantStyles[variant],
      className
    )}>
      <div className="flex gap-4">
        {icon && (
          <div className="flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1 space-y-2">
          {title && (
            <h4 className="text-base md:text-lg font-bold">
              {title}
            </h4>
          )}
          {description && (
            <p className="text-sm md:text-base opacity-90 leading-relaxed">
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
    strong: "border-border/70",
  };

  if (label) {
    return (
      <div className={cn("relative my-6", className)}>
        <div className={cn("absolute inset-0 flex items-center")}>
          <div className={cn("w-full border-t-2", variantStyles[variant])} />
        </div>
        <div className="relative flex justify-center text-xs md:text-sm uppercase">
          <span className="bg-muted/50 px-5 py-1 rounded-full text-muted-foreground font-semibold tracking-wider border-2 border-border/50">
            {label}
          </span>
        </div>
      </div>
    );
  }

  return <hr className={cn("border-t-2 my-6", variantStyles[variant], className)} />;
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
      "stat-card-enhanced border-l-[3px] border-2 border-border/60 hover:shadow-md hover:scale-[1.01]",
      variantStyles[variant],
      className
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs md:text-sm text-muted-foreground font-semibold uppercase tracking-wider">
            {label}
          </p>
          <p className="text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-none">
            {value}
          </p>
          {change && (
            <p className={cn(
              "text-xs md:text-sm font-semibold flex items-center gap-1",
              change.type === "increase" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            )}>
              {change.type === "increase" ? "↑" : "↓"} {Math.abs(change.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-primary/10">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// Importação do React no topo
import * as React from "react";
