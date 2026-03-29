// src/components/processo/analise-partes.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { User, MessageSquare, AlertTriangle } from "lucide-react";
import { TYPO, CARD_STYLE } from "@/lib/config/design-tokens";

interface Pessoa {
  nome: string;
  tipo: string;
  papel: string;
  preso?: boolean | null;
  perguntas_sugeridas?: string[];
  contradicoes?: string[];
}

interface AnalisePartesProps {
  pessoas: Pessoa[];
}

const GRUPO_ORDER = ["REU", "VITIMA", "TESTEMUNHA", "FAMILIAR", "PERITO"];
const GRUPO_LABELS: Record<string, string> = {
  REU: "Acusados",
  VITIMA: "Vítimas",
  TESTEMUNHA: "Testemunhas",
  FAMILIAR: "Familiares",
  PERITO: "Peritos",
};

export function AnalisePartes({ pessoas }: AnalisePartesProps) {
  const grupos = GRUPO_ORDER
    .map(tipo => ({
      tipo,
      label: GRUPO_LABELS[tipo] ?? tipo,
      items: pessoas.filter(p => p.tipo?.toUpperCase() === tipo),
    }))
    .filter(g => g.items.length > 0);

  return (
    <div className="space-y-6">
      {grupos.map((grupo) => (
        <div key={grupo.tipo}>
          <h3 className={TYPO.label + " mb-3"}>{grupo.label}</h3>
          <div className="space-y-3">
            {grupo.items.map((p, i) => (
              <div key={i} className={CARD_STYLE.base + " space-y-2"}>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className={TYPO.h3}>{p.nome}</span>
                  {p.preso === true && <Badge variant="danger" className="text-xs">Preso</Badge>}
                  {p.preso === false && <Badge variant="success" className="text-xs">Solto</Badge>}
                </div>
                {p.papel && <p className={TYPO.body + " text-muted-foreground"}>{p.papel}</p>}
                {p.perguntas_sugeridas && p.perguntas_sugeridas.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                    <span className={TYPO.small + " text-blue-600"}>{p.perguntas_sugeridas.length} perguntas sugeridas</span>
                  </div>
                )}
                {p.contradicoes && p.contradicoes.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <span className={TYPO.small + " text-amber-600"}>{p.contradicoes.length} contradição(ões)</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {pessoas.length === 0 && (
        <p className={TYPO.body + " text-muted-foreground text-center py-8"}>
          Nenhuma pessoa identificada. Execute uma análise para extrair partes do caso.
        </p>
      )}
    </div>
  );
}
