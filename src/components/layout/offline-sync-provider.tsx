"use client";

import { useOfflineSync } from "@/hooks/use-offline-sync";

/**
 * Invisible component that runs offline sync in the background.
 * Place inside any client component tree that has tRPC context.
 */
export function OfflineSyncProvider() {
  useOfflineSync();
  return null;
}
