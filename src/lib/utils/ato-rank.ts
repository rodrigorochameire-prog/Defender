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
