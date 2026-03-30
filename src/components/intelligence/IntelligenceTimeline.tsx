"use client";

import { cn } from "@/lib/utils";
import { Calendar, CircleDot, Clock } from "lucide-react";

interface TimelineEvent {
  id: number;
  titulo: string;
  descricao?: string | null;
  dataFato?: string | null;
  severidade?: string | null;
  tipo?: string | null;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Data desconhecida";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

const RELEVANCIA_COLOR: Record<string, string> = {
  alta: "border-rose-400 dark:border-rose-500",
  media: "border-amber-400 dark:border-amber-500",
  baixa: "border-border",
};

const DOT_COLOR: Record<string, string> = {
  alta: "bg-rose-500",
  media: "bg-amber-500",
  baixa: "bg-muted-foreground",
};

interface IntelligenceTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export function IntelligenceTimeline({
  events,
  className,
}: IntelligenceTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <Calendar className="h-4 w-4" />
        <span>Nenhum evento na cronologia.</span>
      </div>
    );
  }

  // Sort by date (known dates first, then unknown)
  const sorted = [...events].sort((a, b) => {
    if (!a.dataFato && !b.dataFato) return 0;
    if (!a.dataFato) return 1;
    if (!b.dataFato) return -1;
    return a.dataFato.localeCompare(b.dataFato);
  });

  return (
    <div className={cn("relative", className)}>
      {/* Vertical line */}
      <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

      <div className="space-y-0">
        {sorted.map((event, idx) => {
          const sev = event.severidade || "baixa";
          const dotColor = DOT_COLOR[sev] || DOT_COLOR.baixa;

          return (
            <div key={event.id} className="relative flex gap-3 py-2">
              {/* Dot */}
              <div
                className={cn(
                  "relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-background",
                )}
              >
                <span
                  className={cn("w-2.5 h-2.5 rounded-full", dotColor)}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                    {formatDate(event.dataFato)}
                  </span>
                  {event.severidade === "alta" && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-400 font-medium uppercase">
                      Importante
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground mt-0.5">
                  {event.titulo}
                </p>
                {event.descricao && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {event.descricao}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
