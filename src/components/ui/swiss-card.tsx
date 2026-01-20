/**
 * SwissCard - Componente de Card Padronizado
 * 
 * Estilo "Papel sobre Mesa" para criar hierarquia visual.
 * Use este card para TUDO: Tabelas, Formulários, Listas, Widgets.
 * 
 * Baseado no Design System Swiss/Stone do Defender.
 */

import { cn } from "@/lib/utils";
import * as React from "react";

export interface SwissCardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SwissCard({ className, children, ...props }: SwissCardProps) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-zinc-900",
        "border border-stone-200 dark:border-zinc-800",
        "shadow-sm",
        "rounded-xl",
        "overflow-hidden",
        className
      )}
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
        "px-6 py-4",
        "border-b border-stone-200 dark:border-zinc-800",
        "bg-stone-50/50 dark:bg-zinc-900/50",
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
        "text-lg font-semibold text-foreground",
        "tracking-tight",
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
      className={cn("px-6 py-5", className)}
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
        "border-t border-stone-200 dark:border-zinc-800",
        "bg-stone-50/30 dark:bg-zinc-900/30",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
