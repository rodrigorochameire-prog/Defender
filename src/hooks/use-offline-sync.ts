"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { offlineDb, getLastSyncAt, setLastSyncAt } from "@/lib/offline/db";
import { processSyncQueue, getPendingCount } from "@/lib/offline/sync-processor";

const SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes

interface SyncStatus {
  lastSyncAt: string | null;
  isSyncing: boolean;
  isHydrated: boolean;
  recordCount: number;
  pendingWrites: number;
  conflicts: number;
}

/**
 * Hook that manages offline data hydration and incremental sync.
 *
 * - On first mount (no lastSyncAt in IDB): triggers fullSync
 * - Every 15 minutes: triggers incrementalSync
 * - When coming back online: triggers incrementalSync
 */
export function useOfflineSync(enabled = true) {
  const [status, setStatus] = useState<SyncStatus>({
    lastSyncAt: null,
    isSyncing: false,
    isHydrated: false,
    recordCount: 0,
    pendingWrites: 0,
    conflicts: 0,
  });
  const syncingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const utils = trpc.useUtils();
  const pushItemMutation = trpc.offline.pushItem.useMutation();

  // Full sync — called on first load
  const hydrateFromServer = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setStatus((s) => ({ ...s, isSyncing: true }));

    try {
      const data = await utils.offline.fullSync.fetch();

      // Clear existing data and bulk insert
      await offlineDb.transaction("rw", [
        offlineDb.assistidos,
        offlineDb.processos,
        offlineDb.demandas,
        offlineDb.atendimentos,
        offlineDb.casos,
        offlineDb.syncMeta,
      ], async () => {
        await offlineDb.assistidos.clear();
        await offlineDb.processos.clear();
        await offlineDb.demandas.clear();
        await offlineDb.atendimentos.clear();
        await offlineDb.casos.clear();

        if (data.assistidos.length > 0) await offlineDb.assistidos.bulkPut(data.assistidos as any);
        if (data.processos.length > 0) await offlineDb.processos.bulkPut(data.processos as any);
        if (data.demandas.length > 0) await offlineDb.demandas.bulkPut(data.demandas as any);
        if (data.atendimentos.length > 0) await offlineDb.atendimentos.bulkPut(data.atendimentos as any);
        if (data.casos.length > 0) await offlineDb.casos.bulkPut(data.casos as any);

        await setLastSyncAt(data.syncedAt);
      });

      const total =
        data.assistidos.length +
        data.processos.length +
        data.demandas.length +
        data.atendimentos.length +
        data.casos.length;

      setStatus((s) => ({
        ...s,
        lastSyncAt: data.syncedAt,
        isSyncing: false,
        isHydrated: true,
        recordCount: total,
      }));

      console.log(`[OfflineSync] Full sync complete: ${total} records`);
    } catch (error) {
      console.error("[OfflineSync] Full sync failed:", error);
      setStatus((s) => ({ ...s, isSyncing: false }));
    } finally {
      syncingRef.current = false;
    }
  }, [utils.offline.fullSync]);

  // Push offline writes — called before pulling new data
  const pushOfflineWrites = useCallback(async () => {
    const pending = await getPendingCount();
    if (pending === 0) return;

    console.log(`[OfflineSync] Pushing ${pending} offline writes...`);

    const result = await processSyncQueue((input) =>
      pushItemMutation.mutateAsync(input as any)
    );
    setStatus((s) => ({
      ...s,
      pendingWrites: 0,
      conflicts: s.conflicts + result.conflicts,
    }));

    // Invalidate queries to refresh with server data
    if (result.processed > 0) {
      utils.assistidos.list.invalidate();
      utils.processos.list.invalidate();
      utils.demandas.list.invalidate();
      utils.atendimentos.list.invalidate();
      utils.casos.list.invalidate();
    }
  }, [pushItemMutation, utils]);

  // Incremental sync — called periodically
  const syncIncremental = useCallback(async () => {
    if (syncingRef.current) return;

    const lastSync = await getLastSyncAt();
    if (!lastSync) {
      // No previous sync — do full hydration instead
      await hydrateFromServer();
      return;
    }

    syncingRef.current = true;
    setStatus((s) => ({ ...s, isSyncing: true }));

    try {
      const data = await utils.offline.incrementalSync.fetch({ since: lastSync });

      const hasUpdates =
        data.assistidos.length > 0 ||
        data.processos.length > 0 ||
        data.demandas.length > 0 ||
        data.atendimentos.length > 0 ||
        data.casos.length > 0;

      if (hasUpdates) {
        await offlineDb.transaction("rw", [
          offlineDb.assistidos,
          offlineDb.processos,
          offlineDb.demandas,
          offlineDb.atendimentos,
          offlineDb.casos,
          offlineDb.syncMeta,
        ], async () => {
          if (data.assistidos.length > 0) await offlineDb.assistidos.bulkPut(data.assistidos as any);
          if (data.processos.length > 0) await offlineDb.processos.bulkPut(data.processos as any);
          if (data.demandas.length > 0) await offlineDb.demandas.bulkPut(data.demandas as any);
          if (data.atendimentos.length > 0) await offlineDb.atendimentos.bulkPut(data.atendimentos as any);
          if (data.casos.length > 0) await offlineDb.casos.bulkPut(data.casos as any);

          await setLastSyncAt(data.syncedAt);
        });

        const total =
          data.assistidos.length +
          data.processos.length +
          data.demandas.length +
          data.atendimentos.length +
          data.casos.length;

        console.log(`[OfflineSync] Incremental sync: ${total} updated records`);
      }

      setStatus((s) => ({
        ...s,
        lastSyncAt: data.syncedAt,
        isSyncing: false,
        isHydrated: true,
      }));
    } catch (error) {
      console.error("[OfflineSync] Incremental sync failed:", error);
      setStatus((s) => ({ ...s, isSyncing: false }));
    } finally {
      syncingRef.current = false;
    }
  }, [hydrateFromServer, utils.offline.incrementalSync]);

  useEffect(() => {
    if (!enabled) return;

    // Initial sync check
    const init = async () => {
      const lastSync = await getLastSyncAt();
      if (lastSync) {
        setStatus((s) => ({ ...s, lastSyncAt: lastSync, isHydrated: true }));
        // Do incremental sync in background
        syncIncremental();
      } else {
        // First time — full hydration
        hydrateFromServer();
      }
    };

    init();

    // Periodic incremental sync
    intervalRef.current = setInterval(syncIncremental, SYNC_INTERVAL);

    // Sync when coming back online: push writes first, then pull updates
    const handleOnline = async () => {
      console.log("[OfflineSync] Back online — pushing writes then syncing...");
      await pushOfflineWrites();
      syncIncremental();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("online", handleOnline);
    };
  }, [enabled, hydrateFromServer, syncIncremental, pushOfflineWrites]);

  return status;
}
