import { describe, it, expect } from "vitest";
import { agendarAtendimentoInput } from "@/lib/trpc/routers/registros";

describe("agendarAtendimentoInput", () => {
  it("aceita payload válido com assistido + data + processo opcional", () => {
    const r = agendarAtendimentoInput.safeParse({
      assistidoId: 7,
      dataRegistro: "2026-05-28T14:30:00.000Z",
      titulo: "Orientação",
      local: "presencial",
      processoId: 3,
    });
    expect(r.success).toBe(true);
  });
  it("rejeita sem assistidoId", () => {
    const r = agendarAtendimentoInput.safeParse({ dataRegistro: "2026-05-28T14:30:00.000Z" });
    expect(r.success).toBe(false);
  });
  it("rejeita sem dataRegistro", () => {
    const r = agendarAtendimentoInput.safeParse({ assistidoId: 7 });
    expect(r.success).toBe(false);
  });
});
