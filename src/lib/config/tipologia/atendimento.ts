/**
 * Tipologia de Atendimento — status operacional.
 *
 * Fonte única de verdade para a cor/rótulo do status de um atendimento, hoje
 * espalhada em `components/atendimentos/config.ts` (STATUS_CONFIG) + lógica de
 * "pendente" renderizada ad-hoc nos cards. Aqui o status vira **semântico**:
 * `a_registrar` é um estado de primeira classe (agendado vencido sem registro),
 * a fila prioritária do módulo.
 *
 * Curadoria cromática (spec do redesign): cor só para pendência, falha e ação.
 *  - `strong` → A registrar (attention/âmbar) e Cancelado (danger/rosa): perceptíveis.
 *  - `soft`   → Realizado (positive/esmeralda) e Agendado (neutral/sky): contidos.
 *
 * Puro (sem React). Estende `VisualTipo` com `tone`/`strength` para que a régua
 * de badges (1 forte por item) seja testável e consistente.
 */

import type { VisualTipo } from "./caso";

export type AtendimentoStatusSemantico = "a_registrar" | "agendado" | "realizado" | "cancelado";
export type AtendimentoTone = "attention" | "danger" | "positive" | "neutral";

export interface AtendimentoStatusVisual extends VisualTipo {
  /** Tom semântico — orienta a paleta. */
  tone: AtendimentoTone;
  /** `strong` = cor perceptível (pendência/falha); `soft` = tom contido. */
  strength: "strong" | "soft";
}

export const ATENDIMENTO_STATUS_CONFIG: Record<AtendimentoStatusSemantico, AtendimentoStatusVisual> = {
  a_registrar: {
    label: "A registrar",
    tone: "attention",
    strength: "strong",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  agendado: {
    label: "Agendado",
    tone: "neutral",
    strength: "soft",
    badge: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  realizado: {
    label: "Realizado",
    tone: "positive",
    strength: "soft",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  cancelado: {
    label: "Cancelado",
    tone: "danger",
    strength: "strong",
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

/** Entrada mínima para resolver o status — só precisa de status cru + data. */
export interface AtendimentoStatusInput {
  status: string | null | undefined;
  dataRegistro: Date | string;
}

/**
 * Resolve o status cru (`agendado`/`realizado`/`cancelado`) para o status
 * **semântico**. Um agendado cuja data já passou vira `a_registrar` (pendência
 * ativa). `now` é injetável para testes determinísticos.
 */
export function resolveStatusAtendimento(
  item: AtendimentoStatusInput,
  now: Date = new Date(),
): AtendimentoStatusSemantico {
  if (item.status === "realizado") return "realizado";
  if (item.status === "cancelado") return "cancelado";
  // Default = agendado. Vencido (data no passado) → a registrar.
  const venceu = new Date(item.dataRegistro).getTime() < now.getTime();
  return venceu ? "a_registrar" : "agendado";
}

/** Atalho: resolve o item e devolve o visual correspondente num passo. */
export function statusAtendimentoInfo(
  item: AtendimentoStatusInput,
  now: Date = new Date(),
): AtendimentoStatusVisual {
  return ATENDIMENTO_STATUS_CONFIG[resolveStatusAtendimento(item, now)];
}
