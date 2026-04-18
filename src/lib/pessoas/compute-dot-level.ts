import { PAPEIS_ROTATIVOS, INTEL_CONFIG } from "./intel-config";

export type DotLevel = "none" | "subtle" | "normal" | "emerald" | "amber" | "red";

export interface IntelSignal {
  pessoaId: number;
  totalCasos: number;
  casosRecentes6m: number;
  casosRecentes12m: number;
  papeisCount: Record<string, number>;
  papelPrimario: string | null;
  ladoAcusacao: number;
  ladoDefesa: number;
  lastSeenAt: Date | string | null;
  firstSeenAt: Date | string | null;
  sameComarcaCount: number;
  ambiguityFlag: boolean;
  contradicoesConhecidas: number;
  consistenciasDetectadas: number;
  highValueFlag: boolean;
}

/**
 * Papéis estáveis (juiz, promotor, servidor) nunca sinalizam em comarca única.
 * Rotativos ganham dot conforme thresholds INTEL_CONFIG.dot.
 */
export function computeDotLevel(s: IntelSignal): DotLevel {
  // Papéis estáveis sempre silenciosos (titularidade fixa = ruído)
  if (s.papelPrimario && !PAPEIS_ROTATIVOS.has(s.papelPrimario)) return "none";

  if (s.contradicoesConhecidas >= 1) return "amber";
  if (s.highValueFlag) return "red";

  const { emeraldCasosMin, emeraldConsistenciasMin, normalMin, subtleMin } = INTEL_CONFIG.dot;

  if (s.totalCasos >= emeraldCasosMin && s.consistenciasDetectadas >= emeraldConsistenciasMin) {
    return "emerald";
  }
  if (s.totalCasos >= normalMin) return "normal";
  if (s.totalCasos >= subtleMin) return "subtle";
  return "none";
}
