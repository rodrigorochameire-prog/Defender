"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Timer } from "lucide-react";

/**
 * Componente invisível que faz polling de demandas com prazo se aproximando
 * e exibe um toast proativo uma vez por dia quando há prazos nos próximos 3 dias.
 *
 * Prioridade: prazos vencendo HOJE emitem warning, próximos 3 dias emitem info.
 * Alerta apenas uma vez por dia (usa ref — sem persistência entre sessões).
 * Montado no layout principal (admin-sidebar).
 */
export function PrazoAlertToast() {
  const router = useRouter();
  // Guarda a data em que o último alerta foi exibido ("Mon Mar 16 2026" etc.)
  const lastAlertedDateRef = useRef<string>('');

  const { data } = trpc.demandas.prazosProximos.useQuery(
    { dias: 3 },
    {
      refetchInterval: 30 * 60 * 1000, // a cada 30 minutos
      refetchIntervalInBackground: false, // só quando a aba está ativa
    }
  );

  useEffect(() => {
    if (!data || data.length === 0) return;

    const today = new Date().toDateString();

    // Notificar apenas uma vez por dia
    if (lastAlertedDateRef.current === today) return;
    lastAlertedDateRef.current = today;

    const hojeStr = new Date().toISOString().split('T')[0];

    const vencendoHoje = data.filter(d => d.prazo === hojeStr);
    const proximos = data.filter(d => d.prazo !== hojeStr);

    if (vencendoHoje.length > 0) {
      const plural = vencendoHoje.length > 1;
      toast.warning(
        `${vencendoHoje.length} prazo${plural ? 's' : ''} vence${plural ? 'm' : ''} HOJE`,
        {
          description: vencendoHoje
            .slice(0, 3)
            .map(d => `${d.assistido} — ${d.ato}`)
            .join('\n'),
          duration: 10_000,
          icon: <Timer className="h-4 w-4 text-amber-500" />,
          action: {
            label: 'Ver Demandas',
            onClick: () => router.push('/admin/demandas?filter=prazo'),
          },
        }
      );
    } else if (proximos.length > 0) {
      const plural = proximos.length > 1;
      toast.info(
        `${proximos.length} prazo${plural ? 's' : ''} vence${plural ? 'm' : ''} nos próximos 3 dias`,
        {
          description: proximos
            .slice(0, 3)
            .map(d => `${d.assistido} — ${d.ato} (${d.prazo})`)
            .join('\n'),
          duration: 8_000,
          icon: <Timer className="h-4 w-4 text-blue-500" />,
          action: {
            label: 'Ver Demandas',
            onClick: () => router.push('/admin/demandas?filter=prazo'),
          },
        }
      );
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Componente invisível — não renderiza nada
  return null;
}
