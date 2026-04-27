/**
 * Ranking de relevância dos tipos de ato — usado para agrupar demandas
 * dentro de cada coluna/status do Kanban e da planilha.
 *
 * Reaproveita o `ATO_PRIORITY` mantido em `src/config/atos-por-atribuicao.ts`,
 * que tem 8 grupos granulares cobrindo todas as atribuições (Júri, VVD, EP,
 * Substituição, Curadoria, Criminal Geral):
 *
 *   1-8    Atos processuais urgentes (HC, MS, RA, Apelação, AF, Memoriais, RESE, Contestação)
 *   10-16  Recursos e razões (razões/contrarrazões, ED, Agravo)
 *   20-26  Prisão e liberdade (revogação, relaxamento, MPU, monitoramento, substituição cautelar)
 *   30-36  Execução penal (progressão, justificação, admonitória, transferência, indulto)
 *   40-55  Atos intermediários (diligências, quesitos, testemunhas, ofício, petição intermediária, ANPP)
 *   85-95  Ciências
 *   98     Outros / sem categoria
 */

import { ATO_PRIORITY } from "@/config/atos-por-atribuicao";

const CIENCIA_FALLBACK = 95;
const UNKNOWN_FALLBACK = 98;

export function getAtoRelevanceRank(ato: string | null | undefined): number {
  if (!ato) return UNKNOWN_FALLBACK;
  const trimmed = ato.trim();
  if (!trimmed) return UNKNOWN_FALLBACK;

  const direct = ATO_PRIORITY[trimmed];
  if (direct !== undefined) return direct;

  // Catch-all: variações de ciência não mapeadas (PJe gera nomes inconsistentes)
  if (/^ci[êe]ncia\b/i.test(trimmed)) return CIENCIA_FALLBACK;

  return UNKNOWN_FALLBACK;
}

export type AtoCategory =
  | "urgentes"
  | "recursos"
  | "liberdade"
  | "execucao"
  | "diligencias"
  | "intermediarias"
  | "ciencias"
  | "outros";

export interface AtoCategoryMeta {
  key: AtoCategory;
  label: string;
  /** Ordem de exibição no Kanban (menor = topo) */
  order: number;
  /** Categoria começa colapsada por padrão (info de baixa prioridade) */
  collapsedByDefault: boolean;
}

export const ATO_CATEGORIES: Record<AtoCategory, AtoCategoryMeta> = {
  urgentes:        { key: "urgentes",        label: "Peças urgentes",        order: 1, collapsedByDefault: false },
  liberdade:       { key: "liberdade",       label: "Liberdade",             order: 2, collapsedByDefault: false },
  recursos:        { key: "recursos",        label: "Recursos",              order: 3, collapsedByDefault: false },
  execucao:        { key: "execucao",        label: "Execução penal",        order: 4, collapsedByDefault: false },
  diligencias:     { key: "diligencias",     label: "Diligências",           order: 5, collapsedByDefault: false },
  intermediarias:  { key: "intermediarias",  label: "Petições intermediárias", order: 6, collapsedByDefault: false },
  ciencias:        { key: "ciencias",        label: "Ciências",              order: 7, collapsedByDefault: true },
  outros:          { key: "outros",          label: "Outros",                order: 8, collapsedByDefault: true },
};

/**
 * Mapeia o rank numérico do ATO_PRIORITY para uma categoria visual.
 *
 *   1-9    → urgentes
 *   10-19  → recursos
 *   20-29  → liberdade
 *   30-39  → execucao
 *   40-49  → diligencias
 *   50-79  → intermediarias
 *   80-95  → ciencias
 *   96+    → outros
 */
export function getAtoCategory(ato: string | null | undefined): AtoCategory {
  const rank = getAtoRelevanceRank(ato);
  if (rank < 10) return "urgentes";
  if (rank < 20) return "recursos";
  if (rank < 30) return "liberdade";
  if (rank < 40) return "execucao";
  if (rank < 50) return "diligencias";
  if (rank < 80) return "intermediarias";
  if (rank < 96) return "ciencias";
  return "outros";
}
