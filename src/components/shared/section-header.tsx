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
      container: "pb-2 mb-3",
      number: "w-5 h-5 text-xs",
      icon: "w-4 h-4",
      title: "text-sm font-semibold",
      subtitle: "text-xs",
    },
    md: {
      container: "pb-3 mb-4",
      number: "w-7 h-7 text-sm",
      icon: "w-5 h-5",
      title: "text-base font-semibold",
      subtitle: "text-sm",
    },
    lg: {
      container: "pb-4 mb-6",
      number: "w-9 h-9 text-base",
      icon: "w-6 h-6",
      title: "text-lg font-bold",
      subtitle: "text-sm",
    },
  };

  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-border/50",
        styles.container,
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* Número da seção */}
        {number !== undefined && (
          <div
            className={cn(
              "flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold",
              styles.number
            )}
          >
            {number}
          </div>
        )}

        {/* Ícone */}
        {icon && number === undefined && (
          <div className={cn("text-muted-foreground", styles.icon)}>{icon}</div>
        )}

        {/* Textos */}
        <div>
          <h3 className={cn("text-foreground", styles.title)}>{title}</h3>
          {subtitle && (
            <p className={cn("text-muted-foreground mt-0.5", styles.subtitle)}>
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
    <div className={cn("space-y-4", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && <div className="mb-2">{breadcrumbs}</div>}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-sm sm:text-base text-muted-foreground mt-1.5">
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
