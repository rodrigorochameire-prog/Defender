"use client";

import { useCallback, useRef } from "react";
import { offlineDb } from "@/lib/offline/db";
import type { SyncQueueItem } from "@/lib/offline/db";

// ==========================================
// useOfflineMutation — Queues writes when offline
// Wraps tRPC mutation + IDB write + syncQueue
// ==========================================

type TableName = "assistidos" | "processos" | "demandas" | "atendimentos" | "casos";
type Operation = "create" | "update" | "delete";

interface OfflineMutationOptions<TInput, TOutput> {
  /** The tRPC mutation hook result */
  mutation: {
    mutate: (input: TInput) => void;
    mutateAsync: (input: TInput) => Promise<TOutput>;
    isPending: boolean;
  };
  /** IDB table to write to */
  table: TableName;
  /** Operation type */
  operation: Operation;
  /** Called on success (both online and offline) */
  onSuccess?: (data: TOutput | null) => void;
  /** Called on error (online only — offline never errors) */
  onError?: (error: unknown) => void;
  /** Extract the record ID from the input (for update/delete) */
  getRecordId?: (input: TInput) => number;
}

/**
 * Wraps a tRPC mutation with offline support.
 *
 * - Online: calls tRPC mutation normally
 * - Offline: writes to IDB + adds to syncQueue, calls onSuccess immediately
 *
 * Usage:
 * ```
 * const trpcMutation = trpc.demandas.update.useMutation({ ... });
 * const { mutate } = useOfflineMutation({
 *   mutation: trpcMutation,
 *   table: "demandas",
 *   operation: "update",
 *   getRecordId: (input) => input.id,
 *   onSuccess: () => { toast.success("Salvo!"); },
 * });
 * ```
 */
export function useOfflineMutation<TInput extends Record<string, unknown>, TOutput = unknown>({
  mutation,
  table,
  operation,
  onSuccess,
  onError,
  getRecordId,
}: OfflineMutationOptions<TInput, TOutput>) {
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const mutate = useCallback(
    async (input: TInput) => {
      const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

      if (isOnline) {
        // Online — use tRPC mutation normally
        try {
          mutation.mutate(input);
        } catch {
          // mutate doesn't throw — errors go through onError in useMutation config
        }
        return;
      }

      // Offline — write to IDB + syncQueue
      try {
        const recordId = getRecordId?.(input) ?? 0;
        const idbTable = offlineDb[table];

        if (operation === "update" && recordId) {
          // Get current record for expectedUpdatedAt
          const current = await idbTable.get(recordId);
          const expectedUpdatedAt = (current as any)?.updatedAt;

          // Apply update locally in IDB
          await idbTable.update(recordId, {
            ...input,
            updatedAt: new Date().toISOString(),
          } as any);

          // Add to sync queue
          await offlineDb.syncQueue.add({
            table,
            operation: "update",
            recordId,
            data: input as Record<string, unknown>,
            expectedUpdatedAt,
            status: "pending",
            createdAt: new Date().toISOString(),
            attempts: 0,
          } satisfies Omit<SyncQueueItem, "id">);
        } else if (operation === "create") {
          // Generate temporary negative ID
          const tempId = -Date.now();
          const newRecord = {
            ...input,
            id: tempId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await idbTable.add(newRecord as any);

          await offlineDb.syncQueue.add({
            table,
            operation: "create",
            recordId: tempId,
            data: input as Record<string, unknown>,
            status: "pending",
            createdAt: new Date().toISOString(),
            attempts: 0,
          } satisfies Omit<SyncQueueItem, "id">);
        } else if (operation === "delete" && recordId) {
          // Soft delete in IDB
          await idbTable.update(recordId, {
            deletedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as any);

          await offlineDb.syncQueue.add({
            table,
            operation: "delete",
            recordId,
            data: { id: recordId },
            status: "pending",
            createdAt: new Date().toISOString(),
            attempts: 0,
          } satisfies Omit<SyncQueueItem, "id">);
        }

        // Call onSuccess optimistically
        onSuccessRef.current?.(null);

        console.log(`[OfflineMutation] Queued ${operation} on ${table} (offline)`);
      } catch (err) {
        console.error(`[OfflineMutation] Failed to queue ${operation}:`, err);
        onErrorRef.current?.(err);
      }
    },
    [mutation, table, operation, getRecordId],
  );

  // mutateAsync — same logic but returns a promise
  const mutateAsync = useCallback(
    async (input: TInput): Promise<TOutput | null> => {
      const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

      if (isOnline) {
        return mutation.mutateAsync(input);
      }

      // Offline — delegate to mutate (which queues)
      await mutate(input);
      return null;
    },
    [mutation, mutate],
  );

  return {
    mutate,
    mutateAsync,
    isPending: mutation.isPending,
  };
}
