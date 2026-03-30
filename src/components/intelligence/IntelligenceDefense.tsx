"use client";

import { cn } from "@/lib/utils";
import { Scale, AlertOctagon, Shield, BookOpen } from "lucide-react";

interface Tese {
  id: number;
  titulo: string;
  descricao?: string | null;
  confidence?: number | null;
}

interface Nulidade {
  id: number;
  titulo: string;
  descricao?: string | null;
  severidade?: string | null;
  tags?: string[] | null; // fundamentacao stored here
}

const SEVERIDADE_CONFIG: Record<
  string,
  { label: string; className: string; barColor: string }
> = {
  alta: {
    label: "Alta",
    className:
      "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400",
    barColor: "bg-rose-500",
  },
  media: {
    label: "Media",
    className:
      "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    barColor: "bg-amber-500",
  },
  baixa: {
    label: "Baixa",
    className:
      "bg-muted text-muted-foreground",
    barColor: "bg-muted-foreground",
  },
};

interface IntelligenceDefenseProps {
  teses: Tese[];
  nulidades: Nulidade[];
  className?: string;
}

export function IntelligenceDefense({
  teses,
  nulidades,
  className,
}: IntelligenceDefenseProps) {
  const hasTeses = teses.length > 0;
  const hasNulidades = nulidades.length > 0;

  if (!hasTeses && !hasNulidades) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <Scale className="h-4 w-4" />
        <span>Nenhuma tese ou nulidade identificada.</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Nulidades */}
      {hasNulidades && (
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            <AlertOctagon className="h-3.5 w-3.5 text-rose-500" />
            Nulidades Processuais
            <span className="text-muted-foreground">({nulidades.length})</span>
          </h4>
          <div className="space-y-2">
            {nulidades
              .sort((a, b) => {
                const order: Record<string, number> = {
                  alta: 0,
                  media: 1,
                  baixa: 2,
                };
                return (
                  (order[a.severidade || "baixa"] || 2) -
                  (order[b.severidade || "baixa"] || 2)
                );
              })
              .map((nulidade) => {
                const sev =
                  SEVERIDADE_CONFIG[nulidade.severidade || "media"] ||
                  SEVERIDADE_CONFIG.media;

                return (
                  <div
                    key={nulidade.id}
                    className={cn(
                      "relative rounded-lg border border-border p-3 pl-4",
                      "bg-card",
                    )}
                  >
                    {/* Severity bar */}
                    <div
                      className={cn(
                        "absolute left-0 top-0 bottom-0 w-1 rounded-l-lg",
                        sev.barColor,
                      )}
                    />
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-foreground">
                            {nulidade.titulo}
                          </p>
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                              sev.className,
                            )}
                          >
                            {sev.label}
                          </span>
                        </div>
                        {nulidade.descricao && (
                          <p className="text-xs text-muted-foreground">
                            {nulidade.descricao}
                          </p>
                        )}
                        {nulidade.tags && nulidade.tags.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            <BookOpen className="h-3 w-3 inline mr-1" />
                            {nulidade.tags.join("; ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Teses Defensivas */}
      {hasTeses && (
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            <Shield className="h-3.5 w-3.5 text-blue-500" />
            Teses Defensivas
            <span className="text-muted-foreground">({teses.length})</span>
          </h4>
          <div className="space-y-2">
            {teses.map((tese) => (
              <div
                key={tese.id}
                className="rounded-lg border border-border p-3 bg-card"
              >
                <div className="flex items-start gap-2">
                  <Scale className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {tese.titulo}
                    </p>
                    {tese.descricao && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {tese.descricao}
                      </p>
                    )}
                  </div>
                  {tese.confidence != null && tese.confidence > 0 && (
                    <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                      {Math.round(tese.confidence * 100)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
