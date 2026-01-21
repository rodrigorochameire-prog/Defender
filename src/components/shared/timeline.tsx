"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Circle, CheckCircle2 } from "lucide-react";

// ==========================================
// TIMELINE - Linha do tempo vertical premium
// Estilo Linear com ícones e conexões visuais
// ==========================================

interface TimelineProps {
  children: ReactNode;
  className?: string;
}

export function Timeline({ children, className }: TimelineProps) {
  return (
    <div className={cn("relative space-y-6", className)}>
      {children}
    </div>
  );
}

// ==========================================
// TIMELINE ITEM - Item individual
// ==========================================

interface TimelineItemProps {
  children: ReactNode;
  icon?: ReactNode;
  completed?: boolean;
  current?: boolean;
  side?: "left" | "right" | "center";
  timestamp?: string;
  className?: string;
}

export function TimelineItem({
  children,
  icon,
  completed = false,
  current = false,
  side = "center",
  timestamp,
  className,
}: TimelineItemProps) {
  return (
    <div className={cn("relative flex items-start gap-4", className)}>
      {/* Linha vertical conectora */}
      <div className="absolute left-[15px] top-8 bottom-0 w-[2px] -mb-6 bg-border/50" />

      {/* Ícone ou dot */}
      <div
        className={cn(
          "relative z-10 flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center",
          completed && "bg-emerald-500 border-emerald-500",
          current && "bg-primary border-primary animate-pulse-slow",
          !completed && !current && "bg-card border-border/50"
        )}
      >
        {completed ? (
          <CheckCircle2 className="w-4 h-4 text-white" />
        ) : icon ? (
          <span className={cn(
            "text-muted-foreground [&>svg]:w-4 [&>svg]:h-4",
            current && "text-primary-foreground"
          )}>
            {icon}
          </span>
        ) : (
          <Circle className={cn(
            "w-2 h-2 fill-current",
            current ? "text-primary-foreground" : "text-muted-foreground"
          )} />
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0 pb-6">
        {timestamp && (
          <time className="text-xs text-muted-foreground font-mono mb-1 block">
            {timestamp}
          </time>
        )}
        <div className={cn(
          "rounded-lg border border-border/50 bg-card p-4",
          current && "border-primary/50 shadow-sm"
        )}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// TIMELINE DUAL - Timeline com dois lados
// Defesa (esquerda) vs Acusação (direita)
// ==========================================

interface TimelineDualItemProps {
  children: ReactNode;
  side: "left" | "right";
  timestamp?: string;
  icon?: ReactNode;
  label?: string;
  className?: string;
}

export function TimelineDual({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative space-y-6", className)}>
      {/* Linha central */}
      <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-border/50 -translate-x-1/2" />
      {children}
    </div>
  );
}

export function TimelineDualItem({
  children,
  side,
  timestamp,
  icon,
  label,
  className,
}: TimelineDualItemProps) {
  const isLeft = side === "left";

  return (
    <div className={cn("relative flex items-center", className)}>
      {/* Conteúdo esquerdo */}
      {isLeft && (
        <div className="w-1/2 pr-6 text-right">
          {label && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 block">
              {label}
            </span>
          )}
          {timestamp && (
            <time className="text-xs text-muted-foreground font-mono mb-2 block">
              {timestamp}
            </time>
          )}
          <div className="rounded-lg border border-emerald-200/50 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 p-4">
            {children}
          </div>
        </div>
      )}

      {/* Ícone central */}
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 z-10",
          "w-8 h-8 rounded-full border-2 flex items-center justify-center",
          isLeft 
            ? "bg-emerald-500 border-emerald-500" 
            : "bg-rose-500 border-rose-500"
        )}
      >
        {icon ? (
          <span className="text-white [&>svg]:w-4 [&>svg]:h-4">
            {icon}
          </span>
        ) : (
          <Circle className="w-2 h-2 fill-current text-white" />
        )}
      </div>

      {/* Conteúdo direito */}
      {!isLeft && (
        <div className="w-1/2 pl-6 text-left ml-auto">
          {label && (
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1 block">
              {label}
            </span>
          )}
          {timestamp && (
            <time className="text-xs text-muted-foreground font-mono mb-2 block">
              {timestamp}
            </time>
          )}
          <div className="rounded-lg border border-rose-200/50 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 p-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
