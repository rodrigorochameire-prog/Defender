// src/components/processo/analise-depoimentos.tsx
"use client";

import { AlertTriangle, MessageSquare } from "lucide-react";
import { TYPO, CARD_STYLE, COLORS } from "@/lib/config/design-tokens";
import { Badge } from "@/components/ui/badge";

interface Depoimento {
  nome: string;
  tipo: string;
  resumo: string;
  favoravel_defesa: boolean | null;
  contradicoes: string[];
  perguntas_sugeridas?: string[];
}

interface AnaliseDepoimentosProps {
  depoimentos: Depoimento[];
}

export function AnaliseDepoimentos({ depoimentos }: AnaliseDepoimentosProps) {
  if (depoimentos.length === 0) {
    return (
      <p className={TYPO.body + " text-muted-foreground text-center py-8"}>
        Nenhum depoimento analisado. Execute uma análise para extrair depoimentos.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {depoimentos.map((dep, i) => (
        <div key={i} className={CARD_STYLE.base + " space-y-3"}>
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={TYPO.h3}>{dep.nome}</span>
            <Badge variant="default" className="text-xs capitalize">{dep.tipo}</Badge>
            {dep.favoravel_defesa === true && <Badge variant="success" className="text-xs">Favorável</Badge>}
            {dep.favoravel_defesa === false && <Badge variant="danger" className="text-xs">Desfavorável</Badge>}
          </div>

          {/* Resumo */}
          <p className={TYPO.body + " text-muted-foreground"}>{dep.resumo}</p>

          {/* Contradições */}
          {dep.contradicoes.length > 0 && (
            <div className={`rounded-lg p-3 ${COLORS.warning.bg} space-y-1.5`}>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className={TYPO.h3 + " text-amber-700 dark:text-amber-400"}>Contradições</span>
              </div>
              {dep.contradicoes.map((c, j) => (
                <p key={j} className={TYPO.body + " text-amber-800 dark:text-amber-300"}>• {c}</p>
              ))}
            </div>
          )}

          {/* Perguntas sugeridas */}
          {dep.perguntas_sugeridas && dep.perguntas_sugeridas.length > 0 && (
            <div className={`rounded-lg p-3 ${COLORS.info.bg} space-y-1.5`}>
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <span className={TYPO.h3 + " text-blue-700 dark:text-blue-400"}>Perguntas Sugeridas</span>
              </div>
              <ol className="list-decimal list-inside space-y-1">
                {dep.perguntas_sugeridas.map((q, j) => (
                  <li key={j} className={TYPO.body + " text-blue-800 dark:text-blue-300"}>{q}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
