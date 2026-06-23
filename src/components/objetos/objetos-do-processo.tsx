"use client";

import { trpc } from "@/lib/trpc/client";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { objetoIconFor, objetoLabelFor } from "./objeto-icon";

const DESTINO_LABEL: Record<string, string> = {
  pendente: "Pendente",
  devolvido: "Devolvido",
  periciado: "Periciado",
  incinerado: "Incinerado",
  "em-custodia": "Em custódia",
};

interface ObjetosDoProcessoProps {
  processoId: number;
}

/**
 * Objetos apreendidos vinculados a um processo, com flags de prova (amber) e
 * ação rápida "marcar periciado" (setDestino). Fase V — pró-defesa.
 */
export function ObjetosDoProcesso({ processoId }: ObjetosDoProcessoProps) {
  const utils = trpc.useUtils();
  const { data = [], isLoading } = trpc.objetos.listByProcesso.useQuery({ processoId });
  const setDestino = trpc.objetos.setDestino.useMutation({
    onSuccess: () => {
      utils.objetos.listByProcesso.invalidate({ processoId });
    },
  });

  if (isLoading) {
    return <p className="text-sm text-neutral-400 italic">Carregando objetos...</p>;
  }
  if (data.length === 0) {
    return (
      <p className="text-sm text-neutral-400 italic">
        Nenhum objeto apreendido vinculado.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((item) => {
        const o = item.objeto;
        const Icon = objetoIconFor(o.tipo);
        const ident = o.numeroSerie || o.placa || o.descricaoLivre;
        return (
          <div
            key={item.participacaoId}
            className="rounded-lg border dark:border-neutral-800 px-3 py-2.5"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">
                  {objetoLabelFor(o.tipo)}
                  {ident && (o.numeroSerie || o.placa) ? (
                    <span className="font-mono text-xs text-neutral-500 ml-2">
                      {o.numeroSerie || o.placa}
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  {item.papel} · {DESTINO_LABEL[item.destino ?? "pendente"] ?? item.destino}
                </div>
              </div>
              {item.destino !== "periciado" && (
                <button
                  onClick={() =>
                    setDestino.mutate({
                      participacaoId: item.participacaoId,
                      destino: "periciado",
                    })
                  }
                  disabled={setDestino.isPending}
                  className="px-2.5 py-1 rounded border text-xs flex items-center gap-1 cursor-pointer hover:border-emerald-400 disabled:opacity-50 dark:border-neutral-700 shrink-0"
                >
                  <ShieldCheck className="w-3 h-3" /> Marcar periciado
                </button>
              )}
            </div>

            {item.flags.length > 0 && (
              <ul className="mt-2 space-y-1">
                {item.flags.map((f) => (
                  <li
                    key={f.tipo}
                    className="flex items-start gap-1.5 text-[12px] text-amber-700 dark:text-amber-400"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                    <span>{f.motivo}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
