"use client";

import { cn } from "@/lib/utils";
import {
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";

interface AnalysisData {
  resumo?: string;
  achadosChave?: string[];
  recomendacoes?: string[];
  inconsistencias?: string[];
}

interface IntelligenceOverviewProps {
  data: AnalysisData;
  className?: string;
}

export function IntelligenceOverview({
  data,
  className,
}: IntelligenceOverviewProps) {
  return (
    <div className={cn("space-y-5", className)}>
      {/* Resumo do Caso */}
      {data.resumo && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Resumo do Caso
          </h4>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {data.resumo}
          </p>
        </div>
      )}

      {/* Achados-Chave */}
      {data.achadosChave && data.achadosChave.length > 0 && (
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
            Achados-Chave
          </h4>
          <ul className="space-y-1.5">
            {data.achadosChave.map((achado, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-foreground/80"
              >
                <span className="text-amber-500 mt-0.5 shrink-0">
                  &bull;
                </span>
                <span>{achado}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recomendacoes */}
      {data.recomendacoes && data.recomendacoes.length > 0 && (
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Recomendacoes Estrategicas
          </h4>
          <ol className="space-y-1.5">
            {data.recomendacoes.map((rec, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-foreground/80"
              >
                <span className="text-emerald-500 font-semibold text-xs mt-0.5 shrink-0 w-4 text-right">
                  {i + 1}.
                </span>
                <span>{rec}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Inconsistencias */}
      {data.inconsistencias && data.inconsistencias.length > 0 && (
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
            Inconsistencias Identificadas
          </h4>
          <ul className="space-y-1.5">
            {data.inconsistencias.map((inc, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-foreground/80"
              >
                <XCircle className="h-3.5 w-3.5 text-rose-400 mt-0.5 shrink-0" />
                <span>{inc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty state for overview */}
      {!data.resumo &&
        (!data.achadosChave || data.achadosChave.length === 0) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Info className="h-4 w-4" />
            <span>Sem dados de analise ainda.</span>
          </div>
        )}
    </div>
  );
}
