"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Radio } from "lucide-react";

const STORAGE_KEY = "radar_last_seen_count";

/**
 * Componente invisível que faz polling de matches pendentes do Radar Criminal
 * e exibe um toast quando novos matches aparecem.
 * Montado no layout principal (admin-sidebar).
 *
 * Usa localStorage para persistir a contagem entre reloads de página.
 */
export function RadarMatchesToast() {
  const router = useRouter();
  // null = não inicializado ainda (aguarda primeira carga)
  const lastCountRef = useRef<number | null>(null);

  const { data } = trpc.radar.matchesPendentesCount.useQuery(undefined, {
    refetchInterval: 2 * 60 * 1000, // a cada 2 minutos
    refetchIntervalInBackground: false, // só quando a aba está ativa
  });

  useEffect(() => {
    if (data === undefined) return;

    const currentCount = Number(data.count ?? 0);

    // Primeira carga da sessão: restaurar do localStorage
    if (lastCountRef.current === null) {
      const stored = typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_KEY)
        : null;
      const storedCount = stored !== null ? parseInt(stored, 10) : null;

      lastCountRef.current = storedCount ?? currentCount;

      // Se há mais matches do que o último valor salvo, notificar imediatamente
      if (storedCount !== null && currentCount > storedCount) {
        const newMatches = currentCount - storedCount;
        showToast(newMatches, router);
      }

      // Atualizar localStorage com valor atual
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, String(currentCount));
      }
      lastCountRef.current = currentCount;
      return;
    }

    // Polls subsequentes: comparar com valor anterior
    if (currentCount > lastCountRef.current) {
      const newMatches = currentCount - lastCountRef.current;
      showToast(newMatches, router);
    }

    lastCountRef.current = currentCount;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, String(currentCount));
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Componente invisível — não renderiza nada
  return null;
}

function showToast(newMatches: number, router: ReturnType<typeof useRouter>) {
  const plural = newMatches > 1;
  toast.info(
    `${newMatches} novo${plural ? "s" : ""} match${plural ? "es" : ""} no Radar Criminal`,
    {
      description: "Novos registros criminais correspondem aos seus assistidos",
      duration: 8_000,
      icon: <Radio className="h-4 w-4 text-emerald-500" />,
      action: {
        label: "Ver Radar",
        onClick: () => router.push("/admin/radar?tab=matches"),
      },
    }
  );
}
