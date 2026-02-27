"use client";

import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Mic } from "lucide-react";

/**
 * Componente invisível que faz polling de gravações pendentes
 * e mostra toast quando uma nova chega.
 * Montar no layout principal (ex: admin layout).
 */
export function PlaudArrivalToast() {
  const lastCountRef = useRef<number | null>(null);

  const { data: recordings } = trpc.atendimentos.pendingRecordings.useQuery(undefined, {
    refetchInterval: 30_000, // Poll a cada 30s
    refetchIntervalInBackground: false, // Só quando tab ativa
  });

  useEffect(() => {
    if (!recordings) return;

    const currentCount = recordings.length;

    // Primeira carga: apenas salvar a contagem
    if (lastCountRef.current === null) {
      lastCountRef.current = currentCount;
      return;
    }

    // Se aumentou, mostrar toast
    if (currentCount > lastCountRef.current) {
      const newest = recordings[0]; // Mais recente primeiro (orderBy DESC)
      if (newest) {
        toast.info(
          `Nova gravação Plaud: "${newest.title || "Sem título"}"`,
          {
            description: "Clique para revisar e aprovar",
            duration: 10_000,
            icon: <Mic className="h-4 w-4 text-purple-600" />,
            action: {
              label: "Revisar",
              onClick: () => {
                // Navegar para a tab de gravações
                window.location.href = "/admin/integracoes?tab=gravacoes";
              },
            },
          }
        );
      }
    }

    lastCountRef.current = currentCount;
  }, [recordings]);

  // Componente invisível — não renderiza nada
  return null;
}
