/**
 * Ações em lote do preview de importação PJe. Funções puras.
 */

import type { PjeReviewRow } from "@/components/demandas-premium/pje-review-table";
import { calcularPrazoParaAto } from "./pje-review-row";
import { converterISOParaBR } from "./prazo-calculator";

export interface LoteUpdates {
  ato?: string;
  status?: string;
  estadoPrisional?: string;
  prazoIso?: string; // YYYY-MM-DD
}

/**
 * Aplica updates às linhas alvo (por ordemOriginal). Alvo vazio = todas as
 * não-excluídas (comportamento legado do "p/ todos"). Linhas excluídas nunca
 * são tocadas. Ato recalcula prazo, exceto quando prazoManual. Prazo em lote
 * marca prazoManual.
 */
export function aplicarLote(
  rows: PjeReviewRow[],
  alvo: Set<number>,
  updates: LoteUpdates,
): PjeReviewRow[] {
  return rows.map((row) => {
    if (row.excluded) return row;
    if (alvo.size > 0 && !alvo.has(row.ordemOriginal)) return row;

    const next: PjeReviewRow = { ...row };
    if (updates.ato !== undefined) {
      next.ato = updates.ato;
      if (!row.prazoManual) {
        next.prazo = calcularPrazoParaAto(row.dataExpedicao, updates.ato);
      }
    }
    if (updates.status !== undefined) next.status = updates.status;
    if (updates.estadoPrisional !== undefined) next.estadoPrisional = updates.estadoPrisional;
    if (updates.prazoIso !== undefined) {
      next.prazo = converterISOParaBR(updates.prazoIso);
      next.prazoManual = true;
    }
    return next;
  });
}

/**
 * Próxima linha pendente (sem ato, não excluída) na ordem visível, após o
 * índice (original) atual. null quando não há mais pendentes à frente.
 */
export function proximaLinhaPendente(
  rows: PjeReviewRow[],
  ordemVisivel: number[],
  aposIndex: number,
): number | null {
  const pos = ordemVisivel.indexOf(aposIndex);
  for (let i = pos + 1; i < ordemVisivel.length; i++) {
    const idx = ordemVisivel[i];
    const row = rows[idx];
    if (row && !row.excluded && !row.ato) return idx;
  }
  return null;
}
