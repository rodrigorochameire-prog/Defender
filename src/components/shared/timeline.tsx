"use client";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ReactNode } from "react";

export interface TimelineItem {
  id: string | number;
  date: Date;
  title: string;
  description?: string;
  icon?: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  metadata?: {
    label: string;
    value: string;
  }[];
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

const variantStyles = {
  default: {
    dot: "bg-zinc-400 dark:bg-zinc-500",
    line: "bg-border",
    icon: "text-zinc-500",
  },
  success: {
    dot: "bg-emerald-500",
    line: "bg-emerald-200 dark:bg-emerald-800",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    dot: "bg-amber-500",
    line: "bg-amber-200 dark:bg-amber-800",
    icon: "text-amber-600 dark:text-amber-400",
  },
  danger: {
    dot: "bg-rose-500",
    line: "bg-rose-200 dark:bg-rose-800",
    icon: "text-rose-600 dark:text-rose-400",
  },
  info: {
    dot: "bg-blue-500",
    line: "bg-blue-200 dark:bg-blue-800",
    icon: "text-blue-600 dark:text-blue-400",
  },
};

export function Timeline({ items, className }: TimelineProps) {
  if (!items.length) return null;

  return (
    <div className={cn("relative", className)}>
      {items.map((item, index) => {
        const styles = variantStyles[item.variant || "default"];
        const isLast = index === items.length - 1;

        return (
          <div key={item.id} className="relative flex gap-4 pb-8 last:pb-0">
            {/* Linha vertical */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-[11px] top-6 w-0.5 h-[calc(100%-24px)]",
                  styles.line
                )}
              />
            )}

            {/* Dot ou ícone */}
            <div className="relative flex-shrink-0 z-10">
              {item.icon ? (
                <div
                  className={cn(
                    "w-6 h-6 rounded-full bg-background border-2 border-current flex items-center justify-center",
                    styles.icon
                  )}
                >
                  {item.icon}
                </div>
              ) : (
                <div
                  className={cn(
                    "w-6 h-6 rounded-full border-4 border-background",
                    styles.dot
                  )}
                />
              )}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0 pt-0.5">
              {/* Data */}
              <time className="text-xs text-muted-foreground font-medium">
                {format(item.date, "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
              </time>

              {/* Título */}
              <h4 className="text-sm font-semibold text-foreground mt-1">
                {item.title}
              </h4>

              {/* Descrição */}
              {item.description && (
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {item.description}
                </p>
              )}

              {/* Metadata */}
              {item.metadata && item.metadata.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {item.metadata.map((meta, i) => (
                    <div key={i} className="text-xs">
                      <span className="text-muted-foreground">{meta.label}: </span>
                      <span className="font-medium text-foreground">{meta.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Versão compacta da timeline
export function TimelineCompact({ 
  items, 
  className,
  maxItems = 5 
}: TimelineProps & { maxItems?: number }) {
  const displayItems = items.slice(0, maxItems);
  const hasMore = items.length > maxItems;

  return (
    <div className={cn("space-y-3", className)}>
      {displayItems.map((item) => {
        const styles = variantStyles[item.variant || "default"];

        return (
          <div key={item.id} className="flex items-start gap-3">
            <div
              className={cn(
                "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                styles.dot
              )}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-foreground truncate">
                  {item.title}
                </span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {format(item.date, "dd/MM", { locale: ptBR })}
                </span>
              </div>
              {item.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
      
      {hasMore && (
        <p className="text-xs text-muted-foreground text-center pt-1">
          +{items.length - maxItems} eventos anteriores
        </p>
      )}
    </div>
  );
}
