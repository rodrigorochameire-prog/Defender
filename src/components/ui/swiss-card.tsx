/**
 * SwissCard - Componente de Card Padronizado INTELEX
 * 
 * Estilo "Papel sobre Mesa" para criar hierarquia visual.
 * Use este card para TUDO: Tabelas, Formulários, Listas, Widgets.
 * 
 * Design System Swiss - INTELEX v7.0
 */

import { cn } from "@/lib/utils";
import * as React from "react";

export interface SwissCardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SwissCard({ className, children, ...props }: SwissCardProps) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground",
        "border border-border/60",
        "rounded-xl",
        "overflow-hidden",
        "transition-all hover:shadow-md",
        className
      )}
      style={{
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export interface SwissCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SwissCardHeader({ className, children, ...props }: SwissCardHeaderProps) {
  return (
    <div
      className={cn(
        "px-6 py-5",
        "border-b border-border/40",
        "bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface SwissCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function SwissCardTitle({ className, children, ...props }: SwissCardTitleProps) {
  return (
    <h3
      className={cn(
        "text-lg md:text-xl font-semibold text-foreground",
        "tracking-tight leading-none",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export interface SwissCardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function SwissCardDescription({ className, children, ...props }: SwissCardDescriptionProps) {
  return (
    <p
      className={cn(
        "text-sm text-muted-foreground",
        "mt-1",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export interface SwissCardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SwissCardContent({ className, children, ...props }: SwissCardContentProps) {
  return (
    <div
      className={cn("px-6 py-6 space-y-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface SwissCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SwissCardFooter({ className, children, ...props }: SwissCardFooterProps) {
  return (
    <div
      className={cn(
        "px-6 py-4",
        "border-t border-border/40",
        "bg-muted/20",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
