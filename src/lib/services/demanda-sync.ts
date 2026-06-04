/**
 * Helper compartilhado para montar o payload de sincronização de uma demanda
 * com a planilha do Google Sheets (DemandaParaSync).
 *
 * Usado pelos routers tRPC (demandas, registros) em side-effects
 * fire-and-forget após mutações que afetam a linha da planilha — inclusive a
 * célula "Providências" (resumo dos registros, ver registros-summary.ts).
 */

import { db } from "@/lib/db";
import { demandas, processos, assistidos, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  pushDemanda,
  removeDemanda,
  moveDemanda,
  withSheetsAuth,
  type DemandaParaSync,
} from "@/lib/services/google-sheets";
import { getUserSheetsContext } from "@/lib/services/google-sheets-peruser";
import { buildProvidenciasCell } from "@/lib/services/registros-summary";

/**
 * Monta o objeto DemandaParaSync buscando dados relacionados.
 * Retorna null se a demanda não existe.
 */
export async function buildDemandaSync(demandaId: number): Promise<DemandaParaSync | null> {
  const result = await db
    .select({
      id: demandas.id,
      status: demandas.status,
      substatus: demandas.substatus,
      reuPreso: demandas.reuPreso,
      dataEntrada: demandas.dataEntrada,
      dataExpedicao: demandas.dataExpedicao,
      ato: demandas.ato,
      prazo: demandas.prazo,
      defensorId: demandas.defensorId,
      assistidoNome: assistidos.nome,
      numeroAutos: processos.numeroAutos,
      atribuicao: processos.atribuicao,
      delegadoNome: users.name,
    })
    .from(demandas)
    .leftJoin(assistidos, eq(demandas.assistidoId, assistidos.id))
    .leftJoin(processos, eq(demandas.processoId, processos.id))
    .leftJoin(users, eq(demandas.delegadoParaId, users.id))
    .where(eq(demandas.id, demandaId))
    .limit(1);

  const row = result[0];
  if (!row) return null;

  return {
    id: row.id,
    status: row.status,
    substatus: row.substatus ?? null,
    reuPreso: row.reuPreso,
    dataEntrada: row.dataEntrada,
    dataExpedicao: row.dataExpedicao,
    ato: row.ato,
    prazo: row.prazo,
    providencias: await buildProvidenciasCell(row.id),
    assistidoNome: row.assistidoNome ?? "",
    numeroAutos: row.numeroAutos ?? "",
    atribuicao: row.atribuicao ?? "SUBSTITUICAO",
    delegadoNome: row.delegadoNome ?? null,
    defensorId: row.defensorId,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Fan-out: master (service account) + planilha pessoal do defensor
// ──────────────────────────────────────────────────────────────────────
//
// Cada destino é best-effort e isolado: falha em um não impede o outro.
// A planilha per-user só é alcançada quando o defensor da demanda tem
// Google vinculado + planilha criada + sync ativo (getUserSheetsContext).

/** Push para a master e para a planilha pessoal do defensor (se houver). */
export async function syncDemandaToSheets(demanda: DemandaParaSync): Promise<void> {
  await pushDemanda(demanda).catch(console.error);
  if (!demanda.defensorId) return;
  const ctx = await getUserSheetsContext(demanda.defensorId);
  if (!ctx) return;
  await withSheetsAuth(ctx, () => pushDemanda(demanda)).catch((err) =>
    console.error(`[Sheets] FAIL push per-user demanda=${demanda.id} user=${demanda.defensorId}:`, err),
  );
}

/** Remove a linha da master e da planilha pessoal do defensor (se houver). */
export async function removeDemandaFromSheets(
  demandaId: number,
  atribuicao: string,
  defensorId: number | null | undefined,
): Promise<void> {
  await removeDemanda(demandaId, atribuicao).catch(console.error);
  if (!defensorId) return;
  const ctx = await getUserSheetsContext(defensorId);
  if (!ctx) return;
  await withSheetsAuth(ctx, () => removeDemanda(demandaId, atribuicao)).catch((err) =>
    console.error(`[Sheets] FAIL remove per-user demanda=${demandaId} user=${defensorId}:`, err),
  );
}

/** Move de aba (atribuição mudou) na master e na planilha pessoal. */
export async function moveDemandaInSheets(
  demanda: DemandaParaSync,
  atribuicaoAntiga: string,
): Promise<void> {
  await moveDemanda(demanda, atribuicaoAntiga).catch(console.error);
  if (!demanda.defensorId) return;
  const ctx = await getUserSheetsContext(demanda.defensorId);
  if (!ctx) return;
  await withSheetsAuth(ctx, () => moveDemanda(demanda, atribuicaoAntiga)).catch((err) =>
    console.error(`[Sheets] FAIL move per-user demanda=${demanda.id} user=${demanda.defensorId}:`, err),
  );
}
