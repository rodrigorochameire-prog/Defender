import { describe, it, expect } from "vitest";
import { resolverVinculoRegistro } from "./footer-registro";

describe("resolverVinculoRegistro", () => {
  it("habilita o registro inline quando há assistidoId", () => {
    const r = resolverVinculoRegistro({
      assistidoId: 10,
      processoId: 20,
      audienciaId: 30,
    });
    expect(r.podeRegistrar).toBe(true);
    expect(r.assistidoId).toBe(10);
    expect(r.processoId).toBe(20);
    expect(r.audienciaId).toBe(30);
  });

  it("desabilita o registro inline sem assistidoId (vínculo obrigatório)", () => {
    const r = resolverVinculoRegistro({
      assistidoId: null,
      processoId: 20,
      audienciaId: 30,
    });
    expect(r.podeRegistrar).toBe(false);
  });

  it("normaliza ids não-numéricos/zero para undefined no contexto opcional", () => {
    const r = resolverVinculoRegistro({
      assistidoId: 10,
      processoId: 0,
      audienciaId: null,
    });
    expect(r.podeRegistrar).toBe(true);
    expect(r.processoId).toBeUndefined();
    expect(r.audienciaId).toBeUndefined();
  });

  it("mantém assistidoId mesmo quando processo/audiência ausentes", () => {
    const r = resolverVinculoRegistro({
      assistidoId: 7,
      processoId: null,
      audienciaId: null,
    });
    expect(r.podeRegistrar).toBe(true);
    expect(r.assistidoId).toBe(7);
    expect(r.processoId).toBeUndefined();
    expect(r.audienciaId).toBeUndefined();
  });

  it("trata assistidoId zero/negativo como ausente", () => {
    expect(resolverVinculoRegistro({ assistidoId: 0 }).podeRegistrar).toBe(false);
    expect(resolverVinculoRegistro({ assistidoId: -3 }).podeRegistrar).toBe(false);
  });
});
