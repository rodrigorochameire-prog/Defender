import { describe, it, expect } from "vitest";
import { agendaItemVisual } from "@/lib/agenda/agenda-item-visual";

describe("agendaItemVisual", () => {
  it("atendimento (fonte registros) é tracejado com ícone Users", () => {
    const v = agendaItemVisual({ fonte: "registros" });
    expect(v.natureza).toBe("atendimento");
    expect(v.dashed).toBe(true);
    expect(v.icon).toBe("Users");
  });
  it("audiência é sólida com ícone Gavel", () => {
    expect(agendaItemVisual({ fonte: "audiencias" })).toEqual({ natureza: "audiencia", dashed: false, icon: "Gavel" });
  });
  it("evento de calendário comum é sólido (não-atendimento)", () => {
    expect(agendaItemVisual({ fonte: "calendar" }).dashed).toBe(false);
  });
});
