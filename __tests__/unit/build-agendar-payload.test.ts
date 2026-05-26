import { describe, it, expect } from "vitest";
import { buildAgendarPayload } from "@/lib/agenda/build-agendar-payload";

describe("buildAgendarPayload", () => {
  it("combina data + hora em ISO e repassa vínculos", () => {
    const p = buildAgendarPayload(
      { titulo: "Orientação", data: "2026-05-28", horarioInicio: "14:30", local: "sala 2", descricao: "x" },
      { assistidoId: 7, processoId: 3 }
    );
    expect(p.assistidoId).toBe(7);
    expect(p.processoId).toBe(3);
    expect(p.titulo).toBe("Orientação");
    expect(p.local).toBe("sala 2");
    expect(p.dataRegistro).toBe(new Date("2026-05-28T14:30:00").toISOString());
  });
  it("usa 00:00 quando não há horário", () => {
    const p = buildAgendarPayload(
      { titulo: "x", data: "2026-05-28", horarioInicio: "", local: "", descricao: "" },
      { assistidoId: 7 }
    );
    expect(p.dataRegistro).toBe(new Date("2026-05-28T00:00:00").toISOString());
    expect(p.processoId).toBeUndefined();
  });
});
