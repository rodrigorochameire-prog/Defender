"use client";

import { useEffect, useState, useRef, useSyncExternalStore } from "react";

// ==========================================
// useOfflineQuery — Fallback para IDB quando offline
// Wraps tRPC query result + IDB fallback function
// ==========================================

interface TrpcQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: unknown;
}

interface OfflineQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isOffline: boolean;
  isFromCache: boolean;
}

// SSR-safe online status
function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

function useOnlineStatus() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Wraps a tRPC query with IndexedDB fallback.
 *
 * Usage:
 * ```
 * const query = trpc.assistidos.list.useQuery({ limit: 100 });
 * const { data, isLoading, isOffline, isFromCache } = useOfflineQuery(
 *   query,
 *   () => getOfflineAssistidos()
 * );
 * ```
 */
export function useOfflineQuery<T>(
  trpcQuery: TrpcQueryResult<T>,
  idbFallback: () => Promise<any>,
): OfflineQueryResult<T> {
  const isOnline = useOnlineStatus();
  const [idbData, setIdbData] = useState<T | undefined>(undefined);
  const [idbLoading, setIdbLoading] = useState(false);
  const loadedRef = useRef(false);
  const fallbackRef = useRef(idbFallback);
  fallbackRef.current = idbFallback;

  // Load IDB data when offline or when tRPC query fails
  const needsFallback = !isOnline || (!!trpcQuery.error && !trpcQuery.data);

  useEffect(() => {
    if (needsFallback && !loadedRef.current) {
      loadedRef.current = true;
      setIdbLoading(true);
      fallbackRef.current()
        .then(setIdbData)
        .catch((err) => console.error("[OfflineQuery] IDB fallback failed:", err))
        .finally(() => setIdbLoading(false));
    }

    // Reset when back online and tRPC has data
    if (isOnline && trpcQuery.data) {
      loadedRef.current = false;
    }
  }, [needsFallback, isOnline, trpcQuery.data]);

  const usingCache = !trpcQuery.data && !!idbData;

  return {
    data: trpcQuery.data ?? idbData,
    isLoading: (trpcQuery.isLoading && !idbData) || idbLoading,
    isOffline: !isOnline,
    isFromCache: usingCache,
  };
}
