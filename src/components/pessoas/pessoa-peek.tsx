"use client";

import { User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { IntelSignal } from "@/lib/pessoas/compute-dot-level";

interface Props {
  nome: string;
  signal: IntelSignal | null;
}

export function PessoaPeek({ nome, signal }: Props) {
  if (!signal) return null;

  const dataFormatada = signal.lastSeenAt
    ? format(new Date(signal.lastSeenAt), "MMM/yy", { locale: ptBR })
    : null;

  const total = signal.totalCasos;

  return (
    <div
      role="tooltip"
      className="w-60 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-md p-3 text-xs"
    >
      <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
        <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-neutral-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold truncate">{nome}</div>
          {signal.papelPrimario && (
            <div className="text-[10px] text-neutral-500">{signal.papelPrimario.replace(/-/g, " ")}</div>
          )}
        </div>
      </div>

      <div className="pt-2 space-y-1 leading-relaxed">
        <div>
          <strong className="text-neutral-800 dark:text-neutral-200">{total} caso{total !== 1 ? "s" : ""}</strong>
          {(signal.ladoAcusacao > 0 || signal.ladoDefesa > 0) && (
            <span className="text-neutral-500">
              {" · "}
              {signal.ladoAcusacao > 0 && `${signal.ladoAcusacao} acusação`}
              {signal.ladoAcusacao > 0 && signal.ladoDefesa > 0 && ", "}
              {signal.ladoDefesa > 0 && `${signal.ladoDefesa} defesa`}
            </span>
          )}
        </div>
        {dataFormatada && (
          <div className="text-neutral-500">Última: <strong className="text-neutral-700 dark:text-neutral-300">{dataFormatada}</strong></div>
        )}
        {signal.sameComarcaCount > 0 && (
          <div className="text-emerald-600 dark:text-emerald-400 font-medium">
            ✦ {signal.sameComarcaCount} caso{signal.sameComarcaCount !== 1 ? "s" : ""} na mesma comarca
          </div>
        )}
        {signal.ambiguityFlag && (
          <div className="text-amber-600 dark:text-amber-400 pt-1">
            ? Possível duplicata — ver merge-queue
          </div>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[10px] text-blue-600 dark:text-blue-400">
        Clique para abrir dossiê →
      </div>
    </div>
  );
}
