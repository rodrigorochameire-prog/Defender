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
