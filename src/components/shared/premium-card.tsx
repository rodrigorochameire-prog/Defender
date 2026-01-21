"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

// ==========================================
// PREMIUM CARD - Estilo Linear
// Bordas sutis, hover refinado, sem sombras pesadas
// ==========================================

interface PremiumCardProps {
  children: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  hoverable?: boolean;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingStyles = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export function PremiumCard({
  children,
  onClick,
  selected = false,
  hoverable = true,
  padding = "md",
  className,
}: PremiumCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border bg-card transition-all duration-150",
        // Bordas estilo Linear - Ultra sutis
        "border-border/50",
        // Hover state
        hoverable && "hover:border-border hover:shadow-card-hover",
        // Selected state
        selected && "border-primary/50 shadow-sm bg-primary/[0.02]",
        // Cursor
        onClick && "cursor-pointer",
        // Padding
        paddingStyles[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

// ==========================================
// PREMIUM CARD HEADER
// ==========================================

interface PremiumCardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PremiumCardHeader({
  title,
  subtitle,
  icon,
  actions,
  className,
}: PremiumCardHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3 mb-4", className)}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {icon && (
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground [&>svg]:w-5 [&>svg]:h-5">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground tracking-tight truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

// ==========================================
// PREMIUM CARD CONTENT
// ==========================================

export function PremiumCardContent({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {children}
    </div>
  );
}

// ==========================================
// PREMIUM CARD FOOTER
// ==========================================

export function PremiumCardFooter({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <div className={cn("mt-4 pt-4 border-t border-border/30 flex items-center justify-between", className)}>
      {children}
    </div>
  );
}

// ==========================================
// CARD GROUP - Grupo de cards relacionados
// ==========================================

interface CardGroupProps {
  children: ReactNode;
  title?: string;
  columns?: 1 | 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

export function CardGroup({ 
  children, 
  title,
  columns = 3,
  gap = "md",
  className 
}: CardGroupProps) {
  const columnStyles = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  const gapStyles = {
    sm: "gap-3",
    md: "gap-4",
    lg: "gap-6",
  };

  return (
    <div className={cn("space-y-4", className)}>
      {title && (
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
      )}
      <div className={cn("grid", columnStyles[columns], gapStyles[gap])}>
        {children}
      </div>
    </div>
  );
}
