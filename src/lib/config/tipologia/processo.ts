/**
 * Tipologia de Processo — situação.
 *
 * Centraliza `SITUACAO_CONFIGS` (hoje inline em admin/processos/page.tsx).
 * Paleta deliberadamente neutra para "reduzir poluição visual" — só `ativo`
 * recebe um ponto emerald para ler como "vivo". Puro, com fallback.
 */

import type { VisualTipo } from "./caso";

const NEUTRO: VisualTipo = {
  label: "—",
  badge: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  dot: "bg-neutral-400",
};

export const PROCESSO_SITUACAO_CONFIG: Record<string, VisualTipo> = {
  ativo: {
    label: "Ativo",
    badge: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    dot: "bg-emerald-500",
  },
  suspenso: {
    label: "Suspenso",
    badge: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
    dot: "bg-amber-500",
  },
  arquivado: {
    label: "Arquivado",
    badge: "bg-neutral-50 text-neutral-400 dark:bg-neutral-900 dark:text-neutral-500",
    dot: "bg-neutral-400",
  },
  baixado: {
    label: "Baixado",
    badge: "bg-neutral-50 text-neutral-400 dark:bg-neutral-900 dark:text-neutral-500",
    dot: "bg-neutral-400",
  },
};

export function situacaoProcessoInfo(situacao: string | null | undefined): VisualTipo {
  if (!situacao) return { ...NEUTRO, label: "—" };
  return PROCESSO_SITUACAO_CONFIG[situacao.toLowerCase()] ?? { ...NEUTRO, label: situacao };
}
