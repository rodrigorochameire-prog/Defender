export type AgendaItemVisual = {
  natureza: "audiencia" | "atendimento" | "other";
  dashed: boolean;
  icon: "Users" | "Gavel" | null;
};

export function agendaItemVisual(item: { fonte?: string; tipo?: string }): AgendaItemVisual {
  if (item.fonte === "registros") {
    return { natureza: "atendimento", dashed: true, icon: "Users" };
  }
  if (item.tipo === "audiencia") {
    return { natureza: "audiencia", dashed: false, icon: "Gavel" };
  }
  return { natureza: "other", dashed: false, icon: null };
}

/** Cor âmbar dos atendimentos "a registrar" (mesma do KPI/sidebar). */
export const COR_ATENDIMENTO_PENDENTE = "#f59e0b";

/**
 * Atendimento (fonte registros) que já passou do horário e segue "agendado" —
 * a registrar. Usado pelas views da agenda para destacá-lo em âmbar.
 */
export function isAtendimentoPendente(
  evento: { fonte?: string; status?: string; data?: string; horarioInicio?: string },
  now: Date = new Date()
): boolean {
  if (evento.fonte !== "registros" || evento.status !== "agendado") return false;
  if (!evento.data) return false;
  // Sem horário, considera fim do dia (só fica pendente após o dia passar).
  const quando = new Date(`${evento.data}T${evento.horarioInicio || "23:59"}:00`);
  return quando.getTime() < now.getTime();
}
