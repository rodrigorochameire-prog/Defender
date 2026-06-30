"use client";

import { cn } from "@/lib/utils";
import type { DepoenteV2 } from "@/components/agenda/sheet/depoente-card-v2";

function intimacaoLabel(status?: string): { text: string; color: string } | null {
  switch (status) {
    case "INTIMADA":         return { text: "Intimada",                       color: "text-emerald-600 dark:text-emerald-400" };
    case "ARROLADA":         return { text: "Não intimada",                   color: "text-rose-600 dark:text-rose-400" };
    case "NAO_LOCALIZADA":   return { text: "Não intimada — não localizada",  color: "text-rose-600 dark:text-rose-400" };
    case "CARTA_PRECATORIA": return { text: "Carta precatória expedida",      color: "text-amber-600 dark:text-amber-400" };
    case "DESISTIDA":        return { text: "Desistência comunicada",         color: "text-neutral-400 dark:text-neutral-500" };
    default:                 return null;
  }
}

export function IntimacoesSecao({ depoentes }: { depoentes: DepoenteV2[] }) {
  if (depoentes.length === 0) {
    return (
      <p className="text-xs text-neutral-400 italic py-2">
        Nenhum depoente arrolado.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {depoentes.map((d, i) => {
        const lbl = intimacaoLabel(d.status);
        return (
          <div key={d.id ?? i} className="flex items-center justify-between text-xs py-1 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
            <span className="font-medium text-neutral-700 dark:text-neutral-200 truncate max-w-[55%]">
              {d.nome}
            </span>
            {lbl ? (
              <span className={cn("text-[10px] font-medium", lbl.color)}>{lbl.text}</span>
            ) : (
              <span className="text-[10px] text-neutral-400 italic">—</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
