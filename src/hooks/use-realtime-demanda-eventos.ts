"use client";

/**
 * Realtime subscription para mudanças em `public.demanda_eventos`.
 *
 * Usado pelo Kanban de demandas para atualizar automaticamente as linhas
 * "última providência" / "pendência" quando outro usuário (ou outra aba)
 * insere/atualiza/remove um evento.
 *
 * IMPORTANTE: para receber eventos em produção, a tabela `demanda_eventos`
 * precisa estar incluída na publication `supabase_realtime`. O script
 * `scripts/apply-demanda-eventos-migration.ts` adiciona essa tabela à
 * publication de forma idempotente. Caso a publication não exista (ex.: dev
 * local sem Supabase), o hook continua funcionando — apenas não recebe
 * eventos.
 *
 * Padrão espelhado de `use-realtime-file-status.ts` (mesmo codebase).
 */

import { useEffect, useMemo, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface DemandaEventoChange {
  demandaId: number;
  eventType: "INSERT" | "UPDATE" | "DELETE";
}

/**
 * Subscribe to changes (INSERT/UPDATE/DELETE) on `public.demanda_eventos` for
 * a set of demanda ids. Realtime postgres_changes does not support `IN(...)`
 * filters, so we subscribe without filter and gate inside the callback,
 * checking whether the row's `demanda_id` is in the watched set.
 *
 * @param demandaIds  list of demanda ids whose events should trigger callback
 * @param onChange    callback invoked once per relevant row change
 * @param enabled     toggle subscription (default true)
 */
export function useRealtimeDemandaEventos(
  demandaIds: number[] | undefined,
  onChange: (change: DemandaEventoChange) => void,
  enabled = true,
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  // Stable, deterministic key derived from sorted ids — drives both the
  // dependency array (so we resubscribe only when the id-set actually
  // changes) and the channel name (so multiple components watching different
  // sets do not collide).
  const stableKey = useMemo(() => {
    if (!demandaIds || demandaIds.length === 0) return "";
    return [...new Set(demandaIds)]
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b)
      .join(",");
  }, [demandaIds]);

  useEffect(() => {
    if (!enabled || !stableKey) return;

    const idSet = new Set(stableKey.split(",").map((s) => Number(s)));

    const supabase = getSupabaseClient();

    const channel = supabase
      .channel(`demanda-eventos-${stableKey}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "demanda_eventos",
        },
        (payload) => {
          const newRow = payload.new as Record<string, unknown> | null;
          const oldRow = payload.old as Record<string, unknown> | null;

          const rawId =
            (newRow?.demanda_id as number | undefined) ??
            (oldRow?.demanda_id as number | undefined) ??
            null;
          if (rawId == null) return;
          const demandaId = Number(rawId);
          if (!Number.isFinite(demandaId) || !idSet.has(demandaId)) return;

          callbackRef.current({
            demandaId,
            eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
          });
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [stableKey, enabled]);
}
