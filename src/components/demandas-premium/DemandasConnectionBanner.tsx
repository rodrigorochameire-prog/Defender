"use client";

import { WifiOff, Database } from "lucide-react";

interface DemandasConnectionBannerProps {
  /** Sem conexão — a lista veio do cache local (IDB). */
  isOffline?: boolean;
  /** Online, mas exibindo cache enquanto a query ainda não respondeu. */
  isFromCache?: boolean;
}

/**
 * Banner de conexão da lista de demandas (Fase 7.3 — estado contextual).
 * O useOfflineQuery degrada para cache local em erro/offline; aqui isso vira um
 * aviso honesto em vez de silêncio. Offline tem prioridade sobre cache.
 */
export function DemandasConnectionBanner({ isOffline, isFromCache }: DemandasConnectionBannerProps) {
  if (isOffline) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 ring-1 ring-amber-200/70 dark:ring-amber-900/50"
      >
        <WifiOff className="w-4 h-4 flex-shrink-0" />
        <span>Sem conexão — exibindo as demandas salvas localmente.</span>
      </div>
    );
  }

  if (isFromCache) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium bg-neutral-100 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300 ring-1 ring-neutral-200/70 dark:ring-neutral-700"
      >
        <Database className="w-4 h-4 flex-shrink-0" />
        <span>Exibindo dados em cache enquanto reconectamos.</span>
      </div>
    );
  }

  return null;
}
