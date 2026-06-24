"use client";

// Primitivos semânticos do módulo Atendimentos (Fase 1 do redesign).
// Régua: 1 badge FORTE (status) + 1 SUTIL opcional (readiness) + resto em texto.
// Cor só para pendência, falha e ação — área/tipo descem para `MetadataLine`.

import * as React from "react";
import { CalendarClock, CheckCircle2, Clock, Sparkles, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  resolveReadiness,
  resolveStatusAtendimento,
  ATENDIMENTO_STATUS_CONFIG,
  metadataLine,
  type AtendimentoStatusSemantico,
} from "./atendimento-semantica";
import type { DossieAtendimento } from "./config";

const STATUS_ICON: Record<AtendimentoStatusSemantico, React.ElementType> = {
  a_registrar: Clock,
  agendado: CalendarClock,
  realizado: CheckCircle2,
  cancelado: XCircle,
};

const PILL = "inline-flex items-center gap-1 rounded px-1.5 py-px text-[11px] font-medium leading-tight";

/**
 * O único badge forte do item: o status operacional. Um agendado vencido é
 * resolvido para "A registrar" automaticamente. Marca-se com `data-status-badge`
 * para garantir (em teste) que não há competição de badges fortes.
 */
export function AtendimentoStatusBadge({
  status,
  dataRegistro,
  now,
  showIcon = true,
  className,
}: {
  status: string | null | undefined;
  dataRegistro: Date | string;
  now?: Date;
  showIcon?: boolean;
  className?: string;
}) {
  const semantico = resolveStatusAtendimento({ status, dataRegistro }, now);
  const info = ATENDIMENTO_STATUS_CONFIG[semantico];
  const Icon = STATUS_ICON[semantico];
  return (
    <span data-status-badge className={cn(PILL, info.badge, className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {info.label}
    </span>
  );
}

/**
 * Badge sutil opcional: prontidão de contexto jurídico. Some quando não há
 * dossiê — nada de placeholder vazio.
 */
export function ReadinessBadge({
  dossieAtendimento,
  className,
}: {
  dossieAtendimento: Pick<DossieAtendimento, "fonte"> | null | undefined;
  className?: string;
}) {
  const readiness = resolveReadiness({ dossieAtendimento });
  if (!readiness) return null;
  return (
    <span
      className={cn(
        PILL,
        "bg-transparent px-0 text-violet-600 dark:text-violet-400 font-normal",
        className,
      )}
      title={readiness.label}
    >
      <Sparkles className="h-3 w-3" />
      {readiness.label}
    </span>
  );
}

/**
 * Área e tipo como texto secundário (ex.: "Violência Doméstica · Inicial").
 * Taxonomia nunca vira badge forte. Não renderiza nada quando vazio.
 */
export function MetadataLine({
  area,
  subtipo,
  className,
}: {
  area: string | null;
  subtipo: string | null;
  className?: string;
}) {
  const text = metadataLine({ area, subtipo });
  if (!text) return null;
  return <span className={cn("text-[11px] text-muted-foreground", className)}>{text}</span>;
}
