/**
 * sync-engine.ts
 *
 * Core sync engine for bidirectional sync between the database (OMBUDS) and
 * Google Sheets (planilha). Handles change detection, conflict registration,
 * conflict resolution, and sync logging.
 */

import { db } from "@/lib/db";
import { demandas, processos, assistidos, syncLog } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

// ==========================================
// TYPES
// ==========================================

export type ChangeType =
  | "NO_CHANGE"
  | "BANCO_CHANGED"
  | "PLANILHA_CHANGED"
  | "CONFLICT";

export type SyncDirection = "BIDIRECTIONAL" | "BANCO_TO_SHEET";

export interface SyncFieldState {
  valorBanco: string | null | undefined;
  valorPlanilha: string | null | undefined;
  bancoUpdatedAt: Date;
  planilhaUpdatedAt: Date;
  syncedAt: Date;
}

// ==========================================
// FIELD CLASSIFICATION
// ==========================================

/**
 * Fields that sync in both directions (user can edit in DB or in Sheets).
 */
const BIDIRECTIONAL_FIELDS = new Set([
  "status",
  "substatus",
  "providencias",
  "delegadoPara",
  "prazo",
  "reuPreso",
]);

/**
 * Fields that only flow from the DB to the sheet (read-only in Sheets).
 */
const BANCO_TO_SHEET_FIELDS = new Set([
  "assistidoNome",
  "numeroAutos",
  "ato",
  "dataEntrada",
]);

/**
 * Classify how a given campo (field name) should be synced.
 *
 * @param campo - camelCase field name
 * @returns SyncDirection
 */
export function classifySync(campo: string): SyncDirection {
  if (BIDIRECTIONAL_FIELDS.has(campo)) return "BIDIRECTIONAL";
  if (BANCO_TO_SHEET_FIELDS.has(campo)) return "BANCO_TO_SHEET";
  // Default: treat unknown fields as banco-to-sheet (safe default)
  return "BANCO_TO_SHEET";
}

// ==========================================
// CHANGE DETECTION
// ==========================================

/**
 * Pure function: given the state of a single field, determine what changed
 * since the last sync point.
 *
 * Logic:
 *  - bancoChenged  = bancoUpdatedAt  > syncedAt
 *  - planilhaChanged = planilhaUpdatedAt > syncedAt
 *
 *  | banco | planilha | values equal | result            |
 *  |-------|----------|--------------|-------------------|
 *  | true  | false    | any          | BANCO_CHANGED     |
 *  | false | true     | any          | PLANILHA_CHANGED  |
 *  | true  | true     | yes          | NO_CHANGE         |
 *  | true  | true     | no           | CONFLICT          |
 *  | false | false    | any          | NO_CHANGE         |
 */
export function detectChange(state: SyncFieldState): ChangeType {
  const { valorBanco, valorPlanilha, bancoUpdatedAt, planilhaUpdatedAt, syncedAt } = state;

  const bancoChanged = bancoUpdatedAt > syncedAt;
  const planilhaChanged = planilhaUpdatedAt > syncedAt;

  // Neither changed
  if (!bancoChanged && !planilhaChanged) return "NO_CHANGE";

  // Both changed
  if (bancoChanged && planilhaChanged) {
    // If they converged on the same value, no real conflict
    if (valorBanco === valorPlanilha) return "NO_CHANGE";
    return "CONFLICT";
  }

  // Only one side changed
  if (bancoChanged) return "BANCO_CHANGED";
  return "PLANILHA_CHANGED";
}

// ==========================================
// CONFLICT REGISTRATION
// ==========================================

/**
 * Insert a conflict record into sync_log and return the new row id.
 */
export async function registerConflict(
  demandaId: number,
  campo: string,
  valorBanco: string | null,
  valorPlanilha: string | null,
  bancoUpdatedAt: Date,
  planilhaUpdatedAt: Date,
): Promise<number> {
  const [row] = await db
    .insert(syncLog)
    .values({
      demandaId,
      campo,
      valorBanco,
      valorPlanilha,
      bancoUpdatedAt,
      planilhaUpdatedAt,
      origem: "CONFLITO_RESOLVIDO", // pending; will be resolved later
      conflito: true,
    })
    .returning({ id: syncLog.id });

  return row.id;
}

// ==========================================
// CONFLICT RESOLUTION
// ==========================================

/**
 * Resolve a conflict: update the sync_log entry and optionally apply the
 * resolved value back to the demandas table.
 *
 * @param conflictId   - sync_log.id
 * @param resolvedValue - the winning value
 * @param resolvedBy   - identifier of the resolver (user email / "auto")
 * @param applyTo      - where to write back: "BANCO" | "PLANILHA" | "BOTH"
 */
export async function resolveConflict(
  conflictId: number,
  resolvedValue: string,
  resolvedBy: string,
  applyTo: "BANCO" | "PLANILHA" | "BOTH",
): Promise<void> {
  // Fetch the conflict row so we know which demanda and campo to update
  const [conflict] = await db
    .select()
    .from(syncLog)
    .where(eq(syncLog.id, conflictId))
    .limit(1);

  if (!conflict) throw new Error(`Conflito #${conflictId} não encontrado`);

  // Mark as resolved in sync_log
  await db
    .update(syncLog)
    .set({
      resolvidoEm: new Date(),
      resolvidoPor: resolvedBy,
      resolvidoValor: resolvedValue,
      conflito: false,
      origem: "CONFLITO_RESOLVIDO",
    })
    .where(eq(syncLog.id, conflictId));

  // Apply value back to demandas when applyTo includes BANCO
  if ((applyTo === "BANCO" || applyTo === "BOTH") && conflict.demandaId) {
    const campo = conflict.campo as keyof typeof demandas.$inferInsert;
    await db
      .update(demandas)
      .set({
        [campo]: resolvedValue,
        syncedAt: new Date(),
        updatedAt: new Date(),
      } as Partial<typeof demandas.$inferInsert>)
      .where(eq(demandas.id, conflict.demandaId));
  }
}

// ==========================================
// PENDING CONFLICTS
// ==========================================

/**
 * Count unresolved conflicts in sync_log.
 */
export async function countPendingConflicts(): Promise<number> {
  const rows = await db
    .select({ id: syncLog.id })
    .from(syncLog)
    .where(and(eq(syncLog.conflito, true), isNull(syncLog.resolvidoEm)));

  return rows.length;
}

/**
 * List unresolved conflicts joined with demanda, processo and assistido context.
 */
export async function listPendingConflicts() {
  const rows = await db
    .select({
      conflictId: syncLog.id,
      demandaId: syncLog.demandaId,
      campo: syncLog.campo,
      valorBanco: syncLog.valorBanco,
      valorPlanilha: syncLog.valorPlanilha,
      bancoUpdatedAt: syncLog.bancoUpdatedAt,
      planilhaUpdatedAt: syncLog.planilhaUpdatedAt,
      createdAt: syncLog.createdAt,
      // demanda
      demandaStatus: demandas.status,
      // processo
      processoId: processos.id,
      numeroAutos: processos.numeroAutos,
      // assistido
      assistidoId: assistidos.id,
      assistidoNome: assistidos.nome,
    })
    .from(syncLog)
    .leftJoin(demandas, eq(syncLog.demandaId, demandas.id))
    .leftJoin(processos, eq(demandas.processoId, processos.id))
    .leftJoin(assistidos, eq(demandas.assistidoId, assistidos.id))
    .where(and(eq(syncLog.conflito, true), isNull(syncLog.resolvidoEm)))
    .orderBy(syncLog.createdAt);

  return rows;
}

// ==========================================
// SYNC ACTION LOG
// ==========================================

/**
 * Log a successful sync action (non-conflict) to sync_log for audit trail.
 */
export async function logSyncAction(
  demandaId: number,
  campo: string,
  valorBanco: string | null,
  valorPlanilha: string | null,
  origem: "BANCO" | "PLANILHA" | "MOVE",
): Promise<void> {
  await db.insert(syncLog).values({
    demandaId,
    campo,
    valorBanco,
    valorPlanilha,
    origem,
    conflito: false,
  });
}
