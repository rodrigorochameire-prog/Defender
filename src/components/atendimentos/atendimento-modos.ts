// Modos operacionais da pauta de Atendimentos (Fase 2 do redesign).
//
// Substituem as antigas pills de status (Todos/Agendados/Realizados/Cancelados)
// por uma segmentação semântica de intenção: o que estou olhando agora.
// Cada modo deriva o filtro subjacente (status + "a registrar"). Puro/testável;
// não toca em React. Período/tipo/área seguem independentes (no popover).

export type AtendimentoModo = "geral" | "a_registrar" | "agenda" | "historico";

export const ATENDIMENTO_MODOS: { key: AtendimentoModo; label: string }[] = [
  { key: "geral", label: "Visão geral" },
  { key: "a_registrar", label: "A registrar" },
  { key: "agenda", label: "Agenda" },
  { key: "historico", label: "Histórico" },
];

export type StatusFiltro = "todos" | "agendado" | "realizado" | "cancelado";

export interface ModoFiltros {
  /** Filtro de status enviado à query. */
  status: StatusFiltro;
  /** Isola agendados vencidos sem registro (fila "a registrar"). */
  apenasPendentes: boolean;
}

/**
 * Mapeia um modo ao filtro subjacente:
 *  - geral       → tudo (sem pendência forçada).
 *  - a_registrar → fila de pendência (agendados vencidos), status livre.
 *  - agenda      → agendados (próximos compromissos).
 *  - historico   → realizados (interações passadas).
 */
export function modeFilters(modo: AtendimentoModo): ModoFiltros {
  switch (modo) {
    case "a_registrar":
      return { status: "todos", apenasPendentes: true };
    case "agenda":
      return { status: "agendado", apenasPendentes: false };
    case "historico":
      return { status: "realizado", apenasPendentes: false };
    case "geral":
    default:
      return { status: "todos", apenasPendentes: false };
  }
}
