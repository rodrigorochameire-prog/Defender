"use client";

/**
 * DS compartilhado — renderização de sinais de atenção (doutrina §10.7/§10.13).
 *
 * Fonte única de ícone/tom/rota por sinal, consumida por todas as superfícies que
 * exibem `attentionSignals` do estado canônico (preview, overview, etc.).
 */

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Phone,
  Scale,
  Calendar,
  AlertCircle,
  IdCard,
  ChevronRight,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { COLORS, FOCUS_RING } from "@/lib/config/design-tokens";
import type { AttentionKind, AttentionSignal, Severity } from "@/lib/assistidos/state";

export const SEV_TONE: Record<Severity, (typeof COLORS)[keyof typeof COLORS]> = {
  critical: COLORS.danger,
  warning: COLORS.warning,
  // info fica neutro (calmo) — vermelho/âmbar reservados a urgência real.
  info: COLORS.neutral,
};

export const KIND_ICON: Record<AttentionKind, LucideIcon> = {
  "demanda-atrasada": AlertCircle,
  "preso-sem-audiencia": Lock,
  "audiencia-proxima": Calendar,
  "processo-orfao": Scale,
  "cadastro-critico": IdCard,
  "sem-contato": Phone,
};

/** Rota de correção de cada sinal. `assistidoId` (não `assistido`) — convenção do app. */
export function ctaHref(kind: AttentionKind | "ver", id: number): string {
  switch (kind) {
    case "demanda-atrasada":
      return `/admin/demandas?assistidoId=${id}`;
    case "preso-sem-audiencia":
    case "audiencia-proxima":
      return `/admin/assistidos/${id}/audiencias`;
    case "processo-orfao":
      return `/admin/assistidos/${id}/casos`;
    case "cadastro-critico":
    case "sem-contato":
      return `/admin/assistidos/${id}/editar`;
    default:
      return `/admin/assistidos/${id}`;
  }
}

/** Linha de pendência (variante densa — usada no preview). */
export function AttentionSignalRow({ signal, href }: { signal: AttentionSignal; href: string }) {
  const tone = SEV_TONE[signal.severity];
  const Icon = KIND_ICON[signal.kind];
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-2 rounded-xl border transition-colors cursor-pointer group",
        tone.border,
        tone.bg,
        "hover:brightness-[0.98] dark:hover:brightness-110",
        FOCUS_RING,
      )}
    >
      <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/70 dark:bg-neutral-900/40">
        <Icon className={cn("w-3.5 h-3.5", tone.text)} />
      </span>
      <span className={cn("text-xs font-medium flex-1 min-w-0 truncate", tone.text)}>{signal.label}</span>
      <span className="text-[10px] text-muted-foreground group-hover:text-foreground/70 flex items-center gap-0.5 shrink-0">
        {signal.cta.label}
        <ChevronRight className="w-3 h-3" />
      </span>
    </Link>
  );
}

/** Chip de pendência (variante compacta — usada em faixas/headers). */
export function AttentionSignalChip({ signal, href }: { signal: AttentionSignal; href: string }) {
  const tone = SEV_TONE[signal.severity];
  const Icon = KIND_ICON[signal.kind];
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 h-7 pl-2 pr-2.5 rounded-full border text-[11px] font-medium transition-colors cursor-pointer",
        tone.border,
        tone.bg,
        tone.text,
        "hover:brightness-[0.98] dark:hover:brightness-125",
        FOCUS_RING,
      )}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {signal.label}
    </Link>
  );
}
