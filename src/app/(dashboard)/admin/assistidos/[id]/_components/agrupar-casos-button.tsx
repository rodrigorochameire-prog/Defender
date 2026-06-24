"use client";

import { useState } from "react";
import { Layers, Scale, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const CONF_LABEL: Record<string, { label: string; cls: string }> = {
  alta: { label: "alta", cls: "text-emerald-600 dark:text-emerald-400" },
  media: { label: "média", cls: "text-amber-600 dark:text-amber-400" },
  baixa: { label: "baixa", cls: "text-neutral-400" },
};

/**
 * Sugere e aplica o agrupamento dos processos SOLTOS do assistido em casos
 * (1 principal + associados). Fluxo preview→aplicar — não cria nada sem
 * confirmação. Só aparece quando há processos sem caso.
 */
export function AgruparCasosButton({ assistidoId }: { assistidoId: number }) {
  const [aberto, setAberto] = useState(false);
  const utils = trpc.useUtils();

  const { data: grupos, isLoading } = trpc.casos.sugerirAgrupamento.useQuery(
    { assistidoId },
    { staleTime: 30_000 },
  );

  const aplicar = trpc.casos.aplicarAgrupamento.useMutation({
    onSuccess: (r) => {
      toast.success(
        r.casosCriados > 0
          ? `${r.casosCriados} caso(s) criado(s), ${r.processosVinculados} processo(s) vinculado(s).`
          : "Nenhum caso criado.",
      );
      setAberto(false);
      utils.assistidos.getById.invalidate({ id: assistidoId });
      utils.casos.getCasosDoAssistido.invalidate({ assistidoId });
      utils.casos.sugerirAgrupamento.invalidate({ assistidoId });
      utils.analise.getCasosDoAssistido.invalidate({ assistidoId });
    },
    onError: (e) => toast.error(e.message),
  });

  // Nada a agrupar (todos os processos já têm caso) → não renderiza.
  if (isLoading || !grupos || grupos.length === 0) return null;

  const totalProcessos = grupos.reduce((n, g) => n + g.processoIds.length, 0);

  return (
    <div className="mt-2 border-t border-neutral-100 dark:border-neutral-800 pt-2">
      {!aberto ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
        >
          <Layers className="w-3 h-3" />
          Agrupar {totalProcessos} processo{totalProcessos !== 1 ? "s" : ""} em caso{grupos.length !== 1 ? "s" : ""}
        </button>
      ) : (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-neutral-400">
            {grupos.length} caso(s) sugerido(s)
          </p>
          {grupos.map((g) => {
            const principal = g.processos.find((p) => p.isPrincipal) ?? g.processos[0];
            const associados = g.processos.filter((p) => !p.isPrincipal);
            const conf = CONF_LABEL[g.confianca] ?? CONF_LABEL.baixa;
            return (
              <div
                key={g.chave}
                className="rounded-lg border border-neutral-200/70 dark:border-white/[0.06] bg-neutral-50/50 dark:bg-white/[0.03] px-2.5 py-1.5"
              >
                <div className="flex items-center gap-1.5">
                  <Scale className="h-3 w-3 shrink-0 text-emerald-500" />
                  <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-neutral-800 dark:text-neutral-200">
                    {g.tituloSugerido}
                  </span>
                  <span className={cn("shrink-0 text-[9.5px] font-medium", conf.cls)} title={g.motivos.join("; ")}>
                    {conf.label}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1 pl-[18px]">
                  {principal && (
                    <span className="rounded bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-px text-[9px] font-medium text-emerald-700 dark:text-emerald-400">
                      {principal.tipoLabel} · principal
                    </span>
                  )}
                  {associados.map((p) => (
                    <span
                      key={p.id}
                      className="rounded bg-neutral-200/70 dark:bg-white/[0.08] px-1.5 py-px text-[9px] font-medium text-neutral-600 dark:text-neutral-300"
                    >
                      {p.tipoEfetivo}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => aplicar.mutate({ assistidoId })}
              disabled={aplicar.isPending}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {aplicar.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
              Aplicar agrupamento
            </button>
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="text-[11px] text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer"
            >
              cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
