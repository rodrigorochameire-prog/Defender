"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { CriarCasoButton } from "./criar-caso-button";

export interface CriarCasoFromProcessoButtonProps {
  /** Assistido dono do processo órfão (resolvido no wiring da página). */
  assistidoId?: number | null;
  /** Processo atual — após o agrupamento ganha casoId e a página redireciona. */
  processoId?: number;
  className?: string;
}

/**
 * CriarCasoFromProcessoButton — CTA do cockpit do processo órfão.
 *
 * Reusa o fluxo canônico de agrupamento (casos.aplicarAgrupamento), que cria
 * o(s) caso(s) e vincula os processos soltos do assistido. Só renderiza quando
 * há de fato algo a agrupar (sugerirAgrupamento retorna grupos). Em sucesso,
 * invalida as queries — o processo passa a ter casoId e a página leva o
 * defensor à vista do caso.
 */
export function CriarCasoFromProcessoButton({
  assistidoId,
  processoId,
  className,
}: CriarCasoFromProcessoButtonProps) {
  const utils = trpc.useUtils();

  const { data: grupos } = trpc.casos.sugerirAgrupamento.useQuery(
    { assistidoId: assistidoId ?? 0 },
    { enabled: !!assistidoId, staleTime: 30_000 },
  );

  const aplicar = trpc.casos.aplicarAgrupamento.useMutation({
    onSuccess: (r) => {
      toast.success(
        r.casosCriados > 0
          ? `${r.casosCriados} caso(s) criado(s), ${r.processosVinculados} processo(s) vinculado(s).`
          : "Nenhum caso criado.",
      );
      if (assistidoId) {
        utils.assistidos.getById.invalidate({ id: assistidoId });
        utils.casos.getCasosDoAssistido.invalidate({ assistidoId });
        utils.casos.sugerirAgrupamento.invalidate({ assistidoId });
      }
      if (processoId) utils.processos.getById.invalidate({ id: processoId });
    },
    onError: (e) => toast.error(e.message),
  });

  // Nada a agrupar (sem assistido ou todos os processos já têm caso) → não renderiza.
  if (!assistidoId || !grupos || grupos.length === 0) return null;

  return (
    <CriarCasoButton
      onCriar={() => aplicar.mutate({ assistidoId })}
      isPending={aplicar.isPending}
      className={className}
    />
  );
}
