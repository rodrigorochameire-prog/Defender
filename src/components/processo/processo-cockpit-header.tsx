"use client";

import type { ReactNode } from "react";
import { CalendarClock, MapPin, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ATRIBUICAO_COLORS } from "@/lib/config/atribuicoes";

const MS_DIA = 86_400_000;

export type UrgenciaNivel = "tranquilo" | "atencao" | "urgente";

export interface Urgencia {
  nivel: UrgenciaNivel;
  /** Dias inteiros até a data (negativo = passada). */
  dias: number;
}

/**
 * urgenciaPrazo — classifica a proximidade de uma data em uma escala contínua.
 * `now` é injetável para testes determinísticos.
 *  - <= 2 dias (ou passada) → urgente
 *  - <= 7 dias               → atenção
 *  - >  7 dias               → tranquilo
 * Retorna null quando não há data válida (o chip deve ser omitido).
 */
export function urgenciaPrazo(
  data: Date | string | null | undefined,
  now: Date = new Date(),
): Urgencia | null {
  if (!data) return null;
  const d = typeof data === "string" ? new Date(data) : data;
  if (Number.isNaN(d.getTime())) return null;
  const dias = Math.ceil((d.getTime() - now.getTime()) / MS_DIA);
  const nivel: UrgenciaNivel = dias <= 2 ? "urgente" : dias <= 7 ? "atencao" : "tranquilo";
  return { nivel, dias };
}

/** Frase curta de prazo: "hoje", "amanhã", "em 8 dias", "há 3 dias". */
export function rotuloPrazo(dias: number): string {
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias < 0) return `há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}`;
  return `em ${dias} dias`;
}

/** Humaniza um enum UPPER_SNAKE em texto legível (sem acento). Fallback. */
export function humanizar(s?: string | null): string {
  if (!s) return "—";
  return s
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Rótulo de área com acento, reusando os labels canônicos de atribuições. */
export function areaLabel(area?: string | null): string {
  if (!area) return "—";
  const cfg = (ATRIBUICAO_COLORS as Record<string, { label?: string }>)[area];
  return cfg?.label ?? humanizar(area);
}

const URGENCIA_CHIP: Record<UrgenciaNivel, string> = {
  urgente:
    "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300",
  atencao:
    "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300",
  tranquilo:
    "bg-neutral-50 dark:bg-white/[0.04] border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300",
};

const URGENCIA_DOT: Record<UrgenciaNivel, string> = {
  urgente: "bg-rose-500",
  atencao: "bg-amber-500",
  tranquilo: "bg-emerald-500",
};

export interface ProcessoCockpitHeaderProps {
  numeroAutos?: string | null;
  area?: string | null;
  vara?: string | null;
  fase?: string | null;
  proximaAudiencia?: {
    dataAudiencia: Date | string;
    tipo?: string | null;
    local?: string | null;
  } | null;
  /** Slot de ações (ex.: CTA "Criar caso" — preenchido na Fase 3). */
  actions?: ReactNode;
  /** Injetável para testes determinísticos. */
  now?: Date;
  className?: string;
}

/**
 * ProcessoCockpitHeader — faixa de cabeçalho do cockpit do processo.
 * Responde em 2s "em que pé está": identidade + fase + próxima audiência + urgência.
 */
export function ProcessoCockpitHeader({
  numeroAutos,
  area,
  vara,
  fase,
  proximaAudiencia,
  actions,
  now,
  className,
}: ProcessoCockpitHeaderProps) {
  const urg = proximaAudiencia ? urgenciaPrazo(proximaAudiencia.dataAudiencia, now ?? new Date()) : null;
  const dataAud = proximaAudiencia
    ? typeof proximaAudiencia.dataAudiencia === "string"
      ? new Date(proximaAudiencia.dataAudiencia)
      : proximaAudiencia.dataAudiencia
    : null;
  const dataValida = dataAud && !Number.isNaN(dataAud.getTime());

  return (
    <div
      className={cn(
        "rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 font-mono truncate">
            {numeroAutos ?? "—"}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
            {areaLabel(area)}
            {vara ? <span className="text-neutral-400 dark:text-neutral-500"> · {vara}</span> : null}
          </p>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        {fase && (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200 dark:border-neutral-700 px-2 py-1 text-xs text-neutral-700 dark:text-neutral-300">
            <GitBranch className="w-3 h-3 text-neutral-400" />
            {humanizar(fase)}
          </span>
        )}

        {dataValida && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
              urg ? URGENCIA_CHIP[urg.nivel] : URGENCIA_CHIP.tranquilo,
            )}
          >
            {urg && <span className={cn("w-1.5 h-1.5 rounded-full", URGENCIA_DOT[urg.nivel])} />}
            <CalendarClock className="w-3 h-3" />
            <span>
              {format(dataAud as Date, "dd MMM", { locale: ptBR })}
              {urg ? ` — ${rotuloPrazo(urg.dias)}` : ""}
            </span>
            {proximaAudiencia?.local && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] opacity-80">
                <MapPin className="w-2.5 h-2.5" />
                {proximaAudiencia.local}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
