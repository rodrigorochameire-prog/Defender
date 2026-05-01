import { describe, it, expect } from "vitest";
import { registrosRouter } from "@/lib/trpc/routers/registros";

// ─── Smoke / structure ───────────────────────────────────────────────────

describe("registrosRouter — structure", () => {
  it("exposes list/create/update/delete procedures", () => {
    expect(registrosRouter).toBeDefined();
    expect(registrosRouter._def.procedures).toBeDefined();

    const procs = registrosRouter._def.procedures as Record<string, unknown>;
    expect(procs.list).toBeDefined();
    expect(procs.create).toBeDefined();
    expect(procs.update).toBeDefined();
    expect(procs.delete).toBeDefined();
  });
});

// ─── Helper: pull the zod input schema from a tRPC procedure ─────────────
// tRPC v11 stores parsers in _def.inputs (array) on the built procedure.
function getInputSchema(proc: any) {
  // v11: procedure._def.inputs is an array of zod schemas
  const inputs = proc?._def?.inputs;
  if (Array.isArray(inputs) && inputs.length > 0) return inputs[0];
  // fallback for other shapes
  return proc?._def?.input ?? null;
}

// ─── list — filter inputs ────────────────────────────────────────────────

describe("registrosRouter.list input", () => {
  const schema = getInputSchema((registrosRouter as any)._def.procedures.list);

  it("accepts no filters (all optional)", () => {
    expect(schema).toBeTruthy();
    const parsed = schema.safeParse({});
    expect(parsed.success).toBe(true);
  });

  it("accepts assistidoId filter", () => {
    const parsed = schema.safeParse({ assistidoId: 42 });
    expect(parsed.success).toBe(true);
  });

  it("accepts processoId filter", () => {
    const parsed = schema.safeParse({ processoId: 7 });
    expect(parsed.success).toBe(true);
  });

  it("accepts demandaId filter", () => {
    const parsed = schema.safeParse({ demandaId: 100 });
    expect(parsed.success).toBe(true);
  });

  it("accepts audienciaId filter", () => {
    const parsed = schema.safeParse({ audienciaId: 5 });
    expect(parsed.success).toBe(true);
  });

  it("accepts tipo filter from the 7-tipo enum", () => {
    for (const tipo of [
      "atendimento",
      "diligencia",
      "anotacao",
      "providencia",
      "delegacao",
      "pesquisa",
      "elaboracao",
    ]) {
      const parsed = schema.safeParse({ tipo });
      expect(parsed.success).toBe(true);
    }
  });

  it("rejects an invalid tipo on list", () => {
    const parsed = schema.safeParse({ tipo: "foo" });
    expect(parsed.success).toBe(false);
  });

  it("clamps limit to a max of 100", () => {
    const ok = schema.safeParse({ limit: 100 });
    expect(ok.success).toBe(true);
    const bad = schema.safeParse({ limit: 200 });
    expect(bad.success).toBe(false);
  });
});

// ─── create — input validation ───────────────────────────────────────────

describe("registrosRouter.create input", () => {
  const schema = getInputSchema((registrosRouter as any)._def.procedures.create);

  it("requires assistidoId", () => {
    const parsed = schema.safeParse({
      tipo: "atendimento",
      conteudo: "lorem",
    });
    expect(parsed.success).toBe(false);
  });

  it("requires conteudo", () => {
    const parsed = schema.safeParse({
      tipo: "atendimento",
      assistidoId: 1,
    });
    expect(parsed.success).toBe(false);
  });

  it("requires tipo", () => {
    const parsed = schema.safeParse({
      assistidoId: 1,
      conteudo: "lorem",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects tipo 'foo' (must be one of the 7-tipo enum)", () => {
    const parsed = schema.safeParse({
      assistidoId: 1,
      tipo: "foo",
      conteudo: "lorem",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts each of the 7 valid tipos", () => {
    for (const tipo of [
      "atendimento",
      "diligencia",
      "anotacao",
      "providencia",
      "delegacao",
      "pesquisa",
      "elaboracao",
    ]) {
      const parsed = schema.safeParse({
        assistidoId: 1,
        tipo,
        conteudo: "lorem",
      });
      expect(parsed.success).toBe(true);
    }
  });

  it("accepts a delegacao with demandaId + delegadoParaId + motivoDelegacao", () => {
    const parsed = schema.safeParse({
      assistidoId: 1,
      tipo: "delegacao",
      conteudo: "delegado para Estagiária X",
      demandaId: 99,
      delegadoParaId: 4,
      motivoDelegacao: "Acúmulo de prazos",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts optional context fields (processoId, audienciaId, titulo, dataRegistro, interlocutor)", () => {
    const parsed = schema.safeParse({
      assistidoId: 1,
      tipo: "atendimento",
      conteudo: "lorem",
      processoId: 10,
      audienciaId: 5,
      titulo: "Reunião",
      dataRegistro: new Date().toISOString(),
      interlocutor: "familiar",
    });
    expect(parsed.success).toBe(true);
  });
});

// ─── update — input validation ───────────────────────────────────────────

describe("registrosRouter.update input", () => {
  const schema = getInputSchema((registrosRouter as any)._def.procedures.update);

  it("requires id", () => {
    const parsed = schema.safeParse({ titulo: "novo" });
    expect(parsed.success).toBe(false);
  });

  it("accepts partial updates (titulo only)", () => {
    const parsed = schema.safeParse({ id: 1, titulo: "novo" });
    expect(parsed.success).toBe(true);
  });

  it("accepts partial updates (conteudo only)", () => {
    const parsed = schema.safeParse({ id: 1, conteudo: "atualizado" });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid tipo on update", () => {
    const parsed = schema.safeParse({ id: 1, tipo: "foo" });
    expect(parsed.success).toBe(false);
  });

  it("accepts a valid tipo on update", () => {
    const parsed = schema.safeParse({ id: 1, tipo: "providencia" });
    expect(parsed.success).toBe(true);
  });
});

// ─── delete — input validation ───────────────────────────────────────────

describe("registrosRouter.delete input", () => {
  const schema = getInputSchema((registrosRouter as any)._def.procedures.delete);

  it("requires id", () => {
    const parsed = schema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it("accepts a numeric id", () => {
    const parsed = schema.safeParse({ id: 1 });
    expect(parsed.success).toBe(true);
  });
});
