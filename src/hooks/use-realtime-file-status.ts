"use client";

import { useEffect, useRef, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface FileStatusUpdate {
  id: number;
  drive_file_id: string;
  enrichment_status: string;
  name: string;
}

/**
 * Subscribes to Supabase Realtime changes on drive_files for a given assistido.
 * Replaces heavy polling (re-fetching entire assistido every 5s) with lightweight
 * push notifications when enrichment_status changes.
 *
 * @param assistidoId - assistido to watch
 * @param onStatusChange - callback when a file's enrichment_status changes
 * @param enabled - whether to subscribe (e.g., only when files are processing)
 */
export function useRealtimeFileStatus(
  assistidoId: number | undefined,
  onStatusChange: (update: FileStatusUpdate) => void,
  enabled = true,
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(onStatusChange);
  callbackRef.current = onStatusChange;

  useEffect(() => {
    if (!assistidoId || !enabled) return;

    const supabase = getSupabaseClient();

    // Subscribe to UPDATE events on drive_files where assistido_id matches
    const channel = supabase
      .channel(`drive-files-status-${assistidoId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "drive_files",
          filter: `assistido_id=eq.${assistidoId}`,
        },
        (payload) => {
          const newRow = payload.new as Record<string, unknown>;
          const oldRow = payload.old as Record<string, unknown>;

          // Only fire callback when enrichment_status actually changed
          if (newRow.enrichment_status !== oldRow.enrichment_status) {
            callbackRef.current({
              id: newRow.id as number,
              drive_file_id: newRow.drive_file_id as string,
              enrichment_status: newRow.enrichment_status as string,
              name: newRow.name as string,
            });
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [assistidoId, enabled]);
}
