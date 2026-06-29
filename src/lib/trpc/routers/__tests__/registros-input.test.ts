import { describe, it, expect } from "vitest";
import { createRegistroInput, statusForTipo } from "../registros";

describe("createRegistroInput", () => {
  it("accepts an optional prazo date string", () => {
    const parsed = createRegistroInput.parse({
      assistidoId: 1, tipo: "diligencia", conteudo: "x", prazo: "2026-07-11",
    });
    expect(parsed.prazo).toBe("2026-07-11");
  });
  it("defaults prazo to undefined when omitted", () => {
    const parsed = createRegistroInput.parse({ assistidoId: 1, tipo: "ciencia", conteudo: "x" });
    expect(parsed.prazo).toBeUndefined();
  });
  it("rejects a malformed prazo", () => {
    expect(() =>
      createRegistroInput.parse({
        assistidoId: 1, tipo: "diligencia", conteudo: "x", prazo: "2026-7-11",
      }),
    ).toThrow();
  });
});

describe("statusForTipo", () => {
  it("marks a diligência as agendado (so it pins to Pendências)", () => {
    expect(statusForTipo("diligencia")).toBe("agendado");
  });
  it("marks other tipos as realizado", () => {
    expect(statusForTipo("ciencia")).toBe("realizado");
    expect(statusForTipo("anotacao")).toBe("realizado");
  });
});
