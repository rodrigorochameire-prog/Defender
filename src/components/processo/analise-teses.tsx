// src/components/processo/analise-teses.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Scale, AlertTriangle, Swords } from "lucide-react";
import { TYPO, CARD_STYLE, COLORS } from "@/lib/config/design-tokens";

interface Nulidade {
  tipo: string;
  descricao: string;
  severidade: "alta" | "media" | "baixa";
  fundamentacao?: string;
}

interface MatrizItem {
  ponto: string;
  tipo: "forte" | "fraco";
  categoria?: string;
}

interface AnaliseTesesProps {
  teses: { principal?: string; subsidiarias?: string[] } | string[] | null;
  nulidades: Nulidade[];
  matrizGuerra: MatrizItem[];
}

export function AnaliseTeses({ teses, nulidades, matrizGuerra }: AnaliseTesesProps) {
  const teseLista = Array.isArray(teses)
    ? teses
    : teses
    ? [teses.principal, ...(teses.subsidiarias ?? [])].filter(Boolean) as string[]
    : [];

  return (
    <div className="space-y-6">
      {/* Teses */}
      {teseLista.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Scale className="h-5 w-5 text-blue-500" />
            <h3 className={TYPO.h2}>Teses Defensivas</h3>
          </div>
          <div className="space-y-3">
            {teseLista.map((tese, i) => (
              <div key={i} className={CARD_STYLE.base}>
                <div className="flex items-start gap-3">
                  <span className="text-blue-500 font-bold text-lg shrink-0">{i + 1}.</span>
                  <div>
                    <p className={TYPO.body}>{tese}</p>
                    {i === 0 && <Badge variant="default" className="text-xs mt-1">Principal</Badge>}
                    {i > 0 && <Badge variant="outline" className="text-xs mt-1">Subsidiária</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nulidades */}
      {nulidades.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className={TYPO.h2}>Nulidades / Ilegalidades</h3>
          </div>
          <div className="space-y-3">
            {nulidades.map((n, i) => (
              <div key={i} className={`${CARD_STYLE.highlight} ${
                n.severidade === "alta" ? "border-l-red-500 " + COLORS.danger.bg :
                n.severidade === "media" ? "border-l-amber-500 " + COLORS.warning.bg :
                "border-l-zinc-300 " + COLORS.neutral.bg
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={n.severidade === "alta" ? "danger" : n.severidade === "media" ? "warning" : "default"} className="text-xs">
                    {n.severidade}
                  </Badge>
                  <span className={TYPO.h3}>{n.tipo}</span>
                </div>
                <p className={TYPO.body + " text-muted-foreground"}>{n.descricao}</p>
                {n.fundamentacao && (
                  <p className={TYPO.caption + " italic mt-1"}>{n.fundamentacao}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matriz de Guerra */}
      {matrizGuerra.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Swords className="h-5 w-5 text-violet-500" />
            <h3 className={TYPO.h2}>Matriz de Guerra</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className={TYPO.label + " mb-2 text-emerald-600"}>Pontos Fortes</p>
              <ul className="space-y-1.5">
                {matrizGuerra.filter(m => m.tipo === "forte").map((m, i) => (
                  <li key={i} className={`flex items-start gap-2 ${TYPO.body}`}>
                    <span className="text-emerald-500 shrink-0">✓</span>
                    <span className="text-muted-foreground">{m.ponto}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className={TYPO.label + " mb-2 text-red-600"}>Pontos Fracos</p>
              <ul className="space-y-1.5">
                {matrizGuerra.filter(m => m.tipo === "fraco").map((m, i) => (
                  <li key={i} className={`flex items-start gap-2 ${TYPO.body}`}>
                    <span className="text-red-500 shrink-0">✗</span>
                    <span className="text-muted-foreground">{m.ponto}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {teseLista.length === 0 && nulidades.length === 0 && matrizGuerra.length === 0 && (
        <p className={TYPO.body + " text-muted-foreground text-center py-8"}>
          Nenhuma tese ou nulidade identificada. Execute uma análise para extrair argumentos defensivos.
        </p>
      )}
    </div>
  );
}
