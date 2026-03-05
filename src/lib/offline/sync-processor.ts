import { offlineDb } from "./db";

// ==========================================
// SYNC QUEUE PROCESSOR
// Processes pending offline writes when back online
// Uses offline.pushItem tRPC mutation via callback
// ==========================================

const MAX_ATTEMPTS = 3;

type PushItemFn = (input: {
  table: string;
  operation: string;
  data: Record<string, unknown>;
  expectedUpdatedAt?: string;
}) => Promise<{ success: boolean; id: number; conflict: boolean }>;

/**
 * Process all pending items in the sync queue.
 * @param pushItem — function that calls offline.pushItem mutation
 */
export async function processSyncQueue(
  pushItem: PushItemFn,
): Promise<{ processed: number; failed: number; conflicts: number }> {
  const pending = await offlineDb.syncQueue
    .where("status")
    .equals("pending")
    .sortBy("createdAt");

  if (pending.length === 0) return { processed: 0, failed: 0, conflicts: 0 };

  console.log(`[SyncProcessor] Processing ${pending.length} queued items...`);

  let processed = 0;
  let failed = 0;
  let conflicts = 0;

  for (const item of pending) {
    try {
      await offlineDb.syncQueue.update(item.id!, { status: "syncing" });

      const result = await pushItem({
        table: item.table,
        operation: item.operation,
        data: item.data,
        expectedUpdatedAt: item.expectedUpdatedAt,
      });

      if (result.conflict) {
        await offlineDb.conflictQueue.add({
          table: item.table,
          recordId: item.recordId as number,
          localData: item.data,
          serverData: {},
          localTimestamp: item.createdAt,
          serverTimestamp: new Date().toISOString(),
        });
        await offlineDb.syncQueue.update(item.id!, { status: "conflict" });
        conflicts++;
        continue;
      }

      // For creates: update temp ID in IDB with real server ID
      if (item.operation === "create" && typeof item.recordId === "number" && item.recordId < 0) {
        const tableName = item.table as "assistidos" | "processos" | "demandas" | "atendimentos" | "casos";
        const idbTable = offlineDb[tableName];
        const localRecord = await idbTable.get(item.recordId);
        if (localRecord) {
          await idbTable.delete(item.recordId);
          await idbTable.put({ ...localRecord, id: result.id } as any);
        }
      }

      await offlineDb.syncQueue.delete(item.id!);
      processed++;
    } catch (err) {
      const newAttempts = (item.attempts || 0) + 1;
      const errorMsg = err instanceof Error ? err.message : String(err);

      if (newAttempts >= MAX_ATTEMPTS) {
        await offlineDb.syncQueue.update(item.id!, {
          status: "failed",
          attempts: newAttempts,
          lastError: errorMsg,
        });
        console.error(`[SyncProcessor] Item ${item.id} permanently failed:`, errorMsg);
      } else {
        await offlineDb.syncQueue.update(item.id!, {
          status: "pending",
          attempts: newAttempts,
          lastError: errorMsg,
        });
      }
      failed++;
    }
  }

  console.log(`[SyncProcessor] Done: ${processed} ok, ${failed} failed, ${conflicts} conflicts`);
  return { processed, failed, conflicts };
}

/** Get count of pending sync items */
export async function getPendingCount(): Promise<number> {
  return offlineDb.syncQueue.where("status").anyOf(["pending", "failed"]).count();
}
