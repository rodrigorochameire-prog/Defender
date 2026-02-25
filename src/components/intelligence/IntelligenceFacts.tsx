"use client";

import { cn } from "@/lib/utils";
import {
  CircleDot,
  CircleCheck,
  HelpCircle,
  Scale,
  FileText,
} from "lucide-react";

interface Fact {
  id: number;
  titulo: string;
  descricao?: string | null;
  tipo?: string | null;
  tags?: string[] | null;
  severidade?: string | null;
  confidence?: number | null;
  dataFato?: string | null;
}

const TIPO_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; dotColor: string }
> = {
  controverso: {
    label: "Controverso",
    icon: HelpCircle,
    dotColor: "bg-amber-500",
  },
  incontroverso: {
    label: "Incontroverso",
    icon: CircleCheck,
    dotColor: "bg-emerald-500",
  },
  tese: { label: "Tese Defensiva", icon: Scale, dotColor: "bg-blue-500" },
  nulidade: {
    label: "Nulidade",
    icon: CircleDot,
    dotColor: "bg-rose-500",
  },
  acusacao: {
    label: "Acusacao",
    icon: FileText,
    dotColor: "bg-violet-500",
  },
  evento: {
    label: "Evento",
    icon: CircleDot,
    dotColor: "bg-zinc-400",
  },
  prova: {
    label: "Prova",
    icon: FileText,
    dotColor: "bg-cyan-500",
  },
};

const SEVERIDADE_BADGE: Record<string, string> = {
  alta: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400",
  media:
    "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
  baixa:
    "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

interface IntelligenceFactsProps {
  facts: Fact[];
  className?: string;
  filterTypes?: string[]; // Optional: only show certain types
}

export function IntelligenceFacts({
  facts,
  className,
  filterTypes,
}: IntelligenceFactsProps) {
  const filteredFacts = filterTypes
    ? facts.filter((f) => f.tipo && filterTypes.includes(f.tipo))
    : facts;

  if (filteredFacts.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400 dark:text-zinc-500 py-8 justify-center">
        <FileText className="h-4 w-4" />
        <span>Nenhum fato identificado.</span>
      </div>
    );
  }

  // Group by type
  const grouped = filteredFacts.reduce(
    (acc, f) => {
      const key = f.tipo || "outro";
      if (!acc[key]) acc[key] = [];
      acc[key].push(f);
      return acc;
    },
    {} as Record<string, Fact[]>,
  );

  const groupOrder = [
    "acusacao",
    "nulidade",
    "tese",
    "controverso",
    "incontroverso",
    "prova",
    "evento",
  ];

  return (
    <div className={cn("space-y-5", className)}>
      {groupOrder.map((tipo) => {
        const group = grouped[tipo];
        if (!group || group.length === 0) return null;
        const config = TIPO_CONFIG[tipo] || {
          label: tipo,
          icon: CircleDot,
          dotColor: "bg-zinc-400",
        };
        const Icon = config.icon;

        return (
          <div key={tipo}>
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              <span
                className={cn("w-2 h-2 rounded-full shrink-0", config.dotColor)}
              />
              {config.label}
              <span className="text-zinc-400">({group.length})</span>
            </h4>
            <div className="space-y-1.5">
              {group.map((fact) => (
                <div
                  key={fact.id}
                  className="py-2 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {fact.titulo}
                      </p>
                      {fact.descricao && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                          {fact.descricao}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {fact.severidade && SEVERIDADE_BADGE[fact.severidade] && (
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                            SEVERIDADE_BADGE[fact.severidade],
                          )}
                        >
                          {fact.severidade}
                        </span>
                      )}
                      {fact.confidence != null && fact.confidence > 0 && (
                        <span className="text-[10px] text-zinc-400 tabular-nums">
                          {Math.round(fact.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                  {fact.tags && fact.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {fact.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
