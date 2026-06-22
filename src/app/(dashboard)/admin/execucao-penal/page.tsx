"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { AlertTriangle, Scale, Clock, Sparkles } from "lucide-react";

const NIVEL_TEXT: Record<string, string> = {
  red: "text-rose-600 dark:text-rose-400",
  amber: "text-amber-600 dark:text-amber-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
};

const SITUACAO_LABEL: Record<string, string> = {
  preso: "Preso",
  domiciliar: "Domiciliar",
  "livramento-condicional": "Livramento condicional",
  monitoramento: "Monitoramento",
  solto: "Solto",
  foragido: "Foragido",
};

export default function ExecucaoPenalPage() {
  const [apenasComAlerta, setApenasComAlerta] = useState(false);
  const { data = [], isLoading } = trpc.execucao.listComAlertas.useQuery({ apenasComAlerta });

  const comAlerta = data.filter((e) => e.prescricao);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-neutral-500" />
          <h1 className="text-lg font-semibold">Execução penal ({data.length})</h1>
        </div>
        <label className="flex items-center gap-2 text-xs text-neutral-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={apenasComAlerta}
            onChange={(e) => setApenasComAlerta(e.target.checked)}
            className="cursor-pointer"
          />
          Só com alerta de prescrição
        </label>
      </div>

      {comAlerta.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 px-4 py-2 text-sm text-rose-700 dark:text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {comAlerta.length} execução{comAlerta.length !== 1 ? "ões" : ""} com prescrição executória iminente — verificar extinção da punibilidade.
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-lg border bg-neutral-50 dark:bg-neutral-900/40 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && data.length === 0 && (
        <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-neutral-500">
          Nenhuma execução penal cadastrada ainda.
        </div>
      )}

      <div className="space-y-2">
        {data.map((e) => {
          const p = e.prescricao;
          const beneficios = e.beneficios ?? [];
          const temRed = p?.nivel === "red" || beneficios.some((b) => b.nivel === "red");
          const temAmber = p?.nivel === "amber" || beneficios.some((b) => b.nivel === "amber");
          const corBorda = temRed
            ? "border-rose-300 dark:border-rose-900/50"
            : temAmber
              ? "border-amber-300 dark:border-amber-900/50"
              : beneficios.some((b) => b.nivel === "emerald")
                ? "border-emerald-300 dark:border-emerald-900/50"
                : "border-neutral-200 dark:border-neutral-800";
          return (
            <Link
              key={e.id}
              href={`/admin/processos/${e.processoId}`}
              className={`block rounded-lg border ${corBorda} bg-white dark:bg-neutral-900 px-4 py-3 shadow-sm transition-colors hover:border-emerald-400`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {e.assistidoNome ?? "Assistido não vinculado"}
                  </div>
                  <div className="truncate text-xs text-neutral-500 font-mono">
                    {e.processoNumero ?? `Processo #${e.processoId}`}
                  </div>
                </div>
                <span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                  {SITUACAO_LABEL[e.situacao] ?? e.situacao}
                </span>
              </div>

              {p && (
                <div className={`mt-2 flex items-start gap-1.5 text-xs font-medium ${NIVEL_TEXT[p.nivel]}`}>
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{p.motivo}</span>
                </div>
              )}

              {beneficios.map((b) => (
                <div
                  key={b.tipo}
                  className={`mt-1.5 flex items-start gap-1.5 text-xs font-medium ${NIVEL_TEXT[b.nivel]}`}
                >
                  {b.nivel === "emerald" ? (
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>{b.motivo}</span>
                </div>
              ))}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
