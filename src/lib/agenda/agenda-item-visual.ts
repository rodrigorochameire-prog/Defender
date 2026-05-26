export type AgendaItemVisual = {
  natureza: "audiencia" | "atendimento";
  dashed: boolean;
  icon: "Gavel" | "Users";
};

export function agendaItemVisual(item: { fonte?: string }): AgendaItemVisual {
  if (item.fonte === "registros") {
    return { natureza: "atendimento", dashed: true, icon: "Users" };
  }
  return { natureza: "audiencia", dashed: false, icon: "Gavel" };
}
