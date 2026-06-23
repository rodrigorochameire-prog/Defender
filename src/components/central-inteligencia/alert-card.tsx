"use client";

import Link from "next/link";
import { AlertTriangle, AlertOctagon, Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlertaUnificado, SeveridadeAlerta } from "./ordenar";

// ==========================================
// Configuração visual por severidade (Padrão Defender: zinc neutro + acento)
// ==========================================

const SEVERIDADE_CONFIG: Record<
  SeveridadeAlerta,
  {
    border: string;
    iconWrap: string;
    icon: typeof AlertTriangle;
    label: string;
  }
> = {
  red: {
    border: "border-l-rose-500",
    iconWrap: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    icon: AlertOctagon,
    label: "Risco",
  },
  amber: {
    border: "border-l-amber-500",
    iconWrap: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    icon: AlertTriangle,
    label: "Atenção",
  },
  emerald: {
    border: "border-l-emerald-500",
    iconWrap: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    icon: Sparkles,
    label: "Oportunidade",
  },
};

const TIPO_BADGE: Record<AlertaUnificado["tipo"], string> = {
  Execução: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  Prazo: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Cronologia: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  VVD: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export function AlertCard({ alerta }: { alerta: AlertaUnificado }) {
  const cfg = SEVERIDADE_CONFIG[alerta.severidade];
  const Icon = cfg.icon;

  const inner = (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-xl border border-l-4 bg-white dark:bg-neutral-900",
        "border-neutral-200/80 dark:border-neutral-800/80",
        cfg.border,
        "px-3.5 py-3 shadow-sm transition-all duration-200",
        alerta.href && "cursor-pointer hover:shadow-md hover:-translate-y-px hover:border-emerald-300/60 dark:hover:border-emerald-700/40",
      )}
    >
      {/* Ícone de severidade */}
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          cfg.iconWrap,
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        {/* Tags: tipo de fonte + rótulo do sinal */}
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              TIPO_BADGE[alerta.tipo],
            )}
          >
            {alerta.tipo}
          </span>
          <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
            {alerta.rotulo}
          </span>
        </div>

        {/* Motivo (título) */}
        <p className="text-[13px] font-medium leading-snug text-neutral-800 dark:text-neutral-100">
          {alerta.titulo}
        </p>

        {/* Assistido + processo */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
          {alerta.assistidoNome && (
            <span className="truncate font-medium text-neutral-600 dark:text-neutral-300">
              {alerta.assistidoNome}
            </span>
          )}
          {alerta.assistidoNome && alerta.processoNumero && (
            <span className="text-neutral-300 dark:text-neutral-600">·</span>
          )}
          {alerta.processoNumero && (
            <span className="font-mono tabular-nums">{alerta.processoNumero}</span>
          )}
        </div>
      </div>

      {alerta.href && (
        <ChevronRight className="mt-1.5 h-4 w-4 shrink-0 text-neutral-300 transition-colors group-hover:text-emerald-500 dark:text-neutral-600" />
      )}
    </div>
  );

  if (alerta.href) {
    return (
      <Link href={alerta.href} prefetch={false} className="block">
        {inner}
      </Link>
    );
  }

  return inner;
}
