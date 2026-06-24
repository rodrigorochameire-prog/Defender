// @ts-nocheck
"use client";

import { Calendar, Clock, History, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { InlineDatePicker } from "@/components/shared/inline-date-picker";
import { calcularPrazoBadge } from "../prazo-badge";
import type { Demanda } from "../types";

interface Props {
  demanda: Demanda;
  onPrazoChange: (id: string, prazo: string) => void;
}

export function CronologiaSecao({ demanda, onPrazoChange }: Props) {
  const prazoBadge = calcularPrazoBadge(demanda.prazo);

  return (
    // -mx-4 cancela o px-4 de conteúdo do CollapsibleSection p/ as rows ficarem
    // flush nas bordas. Se aquele padding mudar, ajustar este valor aqui.
    <div className="-mx-4 divide-y divide-neutral-200/40 dark:divide-neutral-800/40">
      {/* Expedição da intimação — data em que foi expedida no PJe.
          data_intimacao = expedicao + 10 dias (Lei 11.419/2006).
          Mostra formato relativo ("há 3 dias") com tooltip da data exata. */}
      {demanda.data && (
        <div className="flex items-center px-4 py-2.5 gap-3">
          <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
            <Calendar className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Expedição</span>
          <span
            className="flex-1 text-right text-xs text-neutral-500 dark:text-neutral-400 tabular-nums cursor-help"
            title={demanda.data}
          >
            {(() => {
              try {
                const [d, m, y] = demanda.data.split("/").map(Number);
                const date = new Date(y, m - 1, d);
                if (isNaN(date.getTime())) return demanda.data;
                const diff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
                if (diff === 0) return "Hoje";
                if (diff === 1) return "Ontem";
                if (diff < 30) return `há ${diff} dias`;
                if (diff < 365) return `há ${Math.floor(diff / 30)} mes${Math.floor(diff / 30) > 1 ? "es" : ""}`;
                return `há ${Math.floor(diff / 365)} ano${Math.floor(diff / 365) > 1 ? "s" : ""}`;
              } catch {
                return demanda.data;
              }
            })()}
          </span>
        </div>
      )}

      {/* Prazo row — editável + badge calculado. Row em destaque sutil quando
          o prazo aperta (vermelho/âmbar), já que é a métrica crítica da seção. */}
      <div
        className={cn(
          "flex items-center px-4 py-2.5 gap-3 transition-colors",
          prazoBadge?.cor === "red" && "bg-rose-50/40 dark:bg-rose-950/10",
          prazoBadge?.cor === "amber" && "bg-amber-50/40 dark:bg-amber-950/10",
        )}
      >
        <div className={cn(
          "w-5 h-5 rounded-md flex items-center justify-center shrink-0",
          prazoBadge?.cor === "red" ? "bg-rose-100 dark:bg-rose-950/40" : prazoBadge?.cor === "amber" ? "bg-amber-100 dark:bg-amber-950/40" : "bg-neutral-100 dark:bg-neutral-800",
        )}>
          <Clock className={cn(
            "w-3 h-3",
            prazoBadge?.cor === "red" ? "text-rose-500 dark:text-rose-400" : prazoBadge?.cor === "amber" ? "text-amber-500 dark:text-amber-400" : "text-neutral-400 dark:text-neutral-500",
          )} />
        </div>
        <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Prazo</span>
        <div className="flex-1 flex items-center justify-end gap-2" data-prazo-trigger={demanda.id}>
          {prazoBadge && prazoBadge.cor !== "none" && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums",
                prazoBadge.cor === "red" && "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400",
                prazoBadge.cor === "amber" && "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
                prazoBadge.cor === "green" && "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
                prazoBadge.cor === "gray" && "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400",
              )}
            >
              {prazoBadge.texto}
            </span>
          )}
          <InlineDatePicker
            value={demanda.prazo}
            onChange={(v) => onPrazoChange(demanda.id, v)}
          />
        </div>
      </div>

      {/* Importado — quando a demanda entrou no banco */}
      {demanda.dataInclusao && (
        <div className="flex items-center px-4 py-2.5 gap-3">
          <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
            <Calendar className="w-3 h-3 text-neutral-400" />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Importado</span>
          <span
            className="flex-1 text-right text-xs text-neutral-500 dark:text-neutral-400 tabular-nums cursor-help"
            title={(() => {
              try {
                const d = new Date(demanda.dataInclusao);
                if (isNaN(d.getTime())) return demanda.dataInclusao;
                return d.toLocaleString("pt-BR");
              } catch {
                return demanda.dataInclusao;
              }
            })()}
          >
            {(() => {
              try {
                const d = new Date(demanda.dataInclusao);
                if (isNaN(d.getTime())) return demanda.dataInclusao;
                return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
                  + " · " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
              } catch {
                return demanda.dataInclusao;
              }
            })()}
          </span>
        </div>
      )}

      {/* Atualizado — quando foi a última modificação */}
      {demanda.updatedAt && (
        <div className="flex items-center px-4 py-2.5 gap-3">
          <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
            <History className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Atualizado</span>
          <span className="flex-1 text-right text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
            {(() => {
              try {
                const d = new Date(demanda.updatedAt);
                const hoje = new Date();
                const diffDays = Math.floor((hoje.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays === 0) return `Hoje · ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
                if (diffDays === 1) return `Ontem · ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
                if (diffDays < 7) return `${diffDays} dias atrás`;
                return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
              } catch {
                return "—";
              }
            })()}
          </span>
        </div>
      )}

      {/* Providências preview — o que tem que ser feito (se houver) */}
      {demanda.providencias && (
        <div className="flex items-start px-4 py-2.5 gap-3">
          <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
            <CheckSquare className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0 mt-0.5">Providências</span>
          <p className="flex-1 text-right text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed line-clamp-2" title={demanda.providencias}>
            {demanda.providencias}
          </p>
        </div>
      )}
    </div>
  );
}
