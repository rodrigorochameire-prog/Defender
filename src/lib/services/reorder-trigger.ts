/**
 * Dispara o Inngest `sheets/reorder.requested` (debounce 15s) para reordenar
 * a aba afetada após uma mutação de demanda. Fire-and-forget — nunca bloqueia
 * o caller. Usado por todos os pontos que fazem `db.insert(demandas)` ou
 * alteram status/atribuição.
 */

import { inngest } from "@/lib/inngest/client";
import { getSheetName } from "@/lib/services/google-sheets";

export function triggerReorder(
  atribuicao: string | null | undefined,
  reason: string,
  demandaId?: number,
): void {
  const sheetName = atribuicao ? getSheetName(atribuicao) : "__all__";
  inngest
    .send({
      name: "sheets/reorder.requested",
      data: { sheetName, reason, demandaId },
    })
    .catch((err) => console.error("[reorder-trigger] falha ao enfileirar:", err));
}
