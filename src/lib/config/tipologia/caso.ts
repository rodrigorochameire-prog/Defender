/**
 * Tipologia de Caso — status e prioridade.
 *
 * Fonte única de verdade para as cores/rótulos de `casos.status` e
 * `casos.prioridade`, hoje renderizados como strings cruas na aba Casos.
 * Puro (sem React): expõe config + helpers que caem num fallback neutro.
 *
 * Estilo "Padrão Defender" denso: `badge` = pílula completa (bg + text),
 * `dot` = classe de cor para o ponto/indicador.
 */

export interface VisualTipo {
  /** Rótulo legível em pt-BR. */
  label: string;
  /** Classes da pílula (bg + text), para badges. */
  badge: string;
  /** Classe de cor de fundo para o ponto/indicador. */
  dot: string;
}

const NEUTRO: VisualTipo = {
  label: "—",
  badge: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  dot: "bg-neutral-400",
};

// ── Status do caso ──────────────────────────────────────────────────
export const CASO_STATUS_CONFIG: Record<string, VisualTipo> = {
  ativo: {
    label: "Ativo",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  suspenso: {
    label: "Suspenso",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  arquivado: {
    label: "Arquivado",
    badge: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
    dot: "bg-neutral-400",
  },
  encerrado: {
    label: "Encerrado",
    badge: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
    dot: "bg-neutral-400",
  },
};

export function statusCasoInfo(status: string | null | undefined): VisualTipo {
  if (!status) return { ...NEUTRO, label: "—" };
  return CASO_STATUS_CONFIG[status.toLowerCase()] ?? { ...NEUTRO, label: status };
}

// ── Prioridade do caso ──────────────────────────────────────────────
// Enum: BAIXA, NORMAL, ALTA, URGENTE, REU_PRESO (réu preso = máxima urgência).
export const CASO_PRIORIDADE_CONFIG: Record<string, VisualTipo> = {
  BAIXA: {
    label: "Baixa",
    badge: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
    dot: "bg-neutral-400",
  },
  NORMAL: {
    label: "Normal",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  ALTA: {
    label: "Alta",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  URGENTE: {
    label: "Urgente",
    badge: "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  REU_PRESO: {
    label: "Réu preso",
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

/** Ordem decrescente de urgência — para ordenar/priorizar visualmente. */
export const CASO_PRIORIDADE_ORDEM = ["REU_PRESO", "URGENTE", "ALTA", "NORMAL", "BAIXA"] as const;

export function prioridadeCasoInfo(prioridade: string | null | undefined): VisualTipo {
  if (!prioridade) return { ...NEUTRO, label: "—" };
  return CASO_PRIORIDADE_CONFIG[prioridade.toUpperCase()] ?? { ...NEUTRO, label: prioridade };
}

/** Peso numérico p/ ordenação (maior = mais urgente); desconhecido = 0. */
export function pesoPrioridadeCaso(prioridade: string | null | undefined): number {
  if (!prioridade) return 0;
  const idx = CASO_PRIORIDADE_ORDEM.indexOf(prioridade.toUpperCase() as (typeof CASO_PRIORIDADE_ORDEM)[number]);
  return idx === -1 ? 0 : CASO_PRIORIDADE_ORDEM.length - idx;
}
