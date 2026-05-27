import { describe, it, expect } from "vitest";
import { agendaItemVisual } from "@/lib/agenda/agenda-item-visual";

describe("agendaItemVisual", () => {
  it("atendimento (fonte registros) é tracejado com ícone Users", () => {
    const v = agendaItemVisual({ fonte: "registros", tipo: "atendimento" });
    expect(v).toEqual({ natureza: "atendimento", dashed: true, icon: "Users" });
  });
  it("audiência é sólida com ícone Gavel", () => {
    expect(agendaItemVisual({ fonte: "audiencias", tipo: "audiencia" })).toEqual({ natureza: "audiencia", dashed: false, icon: "Gavel" });
  });
  it("evento de calendário não-audiência não tem ícone (other)", () => {
    expect(agendaItemVisual({ fonte: "calendar", tipo: "prazo" })).toEqual({ natureza: "other", dashed: false, icon: null });
  });
  it("evento de calendário do tipo audiencia recebe ícone Gavel", () => {
    expect(agendaItemVisual({ fonte: "calendar", tipo: "audiencia" })).toEqual({ natureza: "audiencia", dashed: false, icon: "Gavel" });
  });
});
