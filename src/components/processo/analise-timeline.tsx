// src/components/processo/analise-timeline.tsx
"use client";

import { TYPO } from "@/lib/config/design-tokens";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Evento {
  data: string;
  evento: string;
  fonte?: string;
}

interface AnaliseTimelineProps {
  cronologia: Evento[];
}

export function AnaliseTimeline({ cronologia }: AnaliseTimelineProps) {
  const sorted = [...cronologia].sort((a, b) => a.data.localeCompare(b.data));
  const now = new Date().toISOString().split("T")[0];

  if (sorted.length === 0) {
    return (
      <p className={TYPO.body + " text-muted-foreground text-center py-8"}>
        Nenhum evento na cronologia. Execute uma análise para extrair a timeline.
      </p>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Linha vertical */}
      <div className="absolute left-2.5 top-2 bottom-2 w-px bg-zinc-200 dark:bg-zinc-700" />

      <div className="space-y-4">
        {sorted.map((ev, i) => {
          const futuro = ev.data > now;
          return (
            <div key={i} className="relative flex items-start gap-4">
              {/* Dot */}
              <div className={`absolute -left-3.5 top-1.5 w-2.5 h-2.5 rounded-full border-2 ${
                futuro
                  ? "border-amber-400 bg-amber-100 dark:bg-amber-900"
                  : "border-emerald-400 bg-emerald-100 dark:bg-emerald-900"
              }`} />

              {/* Content */}
              <div>
                <p className={TYPO.small + " text-muted-foreground font-mono"}>
                  {format(new Date(ev.data + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                  {futuro && <span className="ml-2 text-amber-500">(futuro)</span>}
                </p>
                <p className={TYPO.body + (futuro ? " text-muted-foreground italic" : "")}>{ev.evento}</p>
                {ev.fonte && <p className={TYPO.caption}>{ev.fonte}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
