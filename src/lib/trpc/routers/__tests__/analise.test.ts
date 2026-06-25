import { describe, it, expect } from "vitest";
import { analiseRouter } from "@/lib/trpc/routers/analise";

// ─── Helper: pull the zod input schema from a tRPC procedure ─────────────
// tRPC v11 stores parsers in _def.inputs (array) on the built procedure.
function getInputSchema(proc: any) {
  const inputs = proc?._def?.inputs;
  if (Array.isArray(inputs) && inputs.length > 0) return inputs[0];
  return proc?._def?.input ?? null;
}

// ─── Smoke / structure ───────────────────────────────────────────────────

describe("analiseRouter — structure", () => {
  it("exposes the analysis-read procedures", () => {
    expect(analiseRouter).toBeDefined();
    const procs = analiseRouter._def.procedures as Record<string, unknown>;
    expect(procs.getAnaliseDoCaso).toBeDefined();
    expect(procs.getAnaliseDoProcesso).toBeDefined();
    expect(procs.getAnaliseCoworkDoProcesso).toBeDefined();
  });
});

// ─── getAnaliseCoworkDoProcesso — input (Fase 0) ─────────────────────────

describe("analiseRouter.getAnaliseCoworkDoProcesso input", () => {
  const schema = getInputSchema(
    (analiseRouter as any)._def.procedures.getAnaliseCoworkDoProcesso,
  );

  it("requires processoId", () => {
    expect(schema).toBeTruthy();
    expect(schema.safeParse({}).success).toBe(false);
  });

  it("accepts a numeric processoId", () => {
    expect(schema.safeParse({ processoId: 7 }).success).toBe(true);
  });

  it("rejects a non-numeric processoId", () => {
    expect(schema.safeParse({ processoId: "7" }).success).toBe(false);
  });
});

// ─── recentForEntity — structure + input (skill task history) ─────────────

describe("analiseRouter.recentForEntity", () => {
  it("is exposed", () => {
    const procs = analiseRouter._def.procedures as Record<string, unknown>;
    expect(procs.recentForEntity).toBeDefined();
  });

  const schema = getInputSchema(
    (analiseRouter as any)._def.procedures.recentForEntity,
  );

  it("requires at least one entity id", () => {
    expect(schema).toBeTruthy();
    expect(schema.safeParse({}).success).toBe(false);
  });

  it("accepts a processoId alone", () => {
    expect(schema.safeParse({ processoId: 7 }).success).toBe(true);
  });

  it("accepts an assistidoId alone", () => {
    expect(schema.safeParse({ assistidoId: 3 }).success).toBe(true);
  });

  it("defaults limit to 5 and caps it at 50", () => {
    const ok = schema.safeParse({ processoId: 1 });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.limit).toBe(5);
    expect(schema.safeParse({ processoId: 1, limit: 51 }).success).toBe(false);
    expect(schema.safeParse({ processoId: 1, limit: 0 }).success).toBe(false);
  });
});

// ─── retryTask + cancelarTask — structure + input ─────────────────────────

describe("analiseRouter retry/cancel", () => {
  const procs = analiseRouter._def.procedures as Record<string, unknown>;

  it("exposes retryTask and cancelarTask", () => {
    expect(procs.retryTask).toBeDefined();
    expect(procs.cancelarTask).toBeDefined();
  });

  it("retryTask requires a numeric taskId", () => {
    const schema = getInputSchema((analiseRouter as any)._def.procedures.retryTask);
    expect(schema).toBeTruthy();
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ taskId: 10 }).success).toBe(true);
    expect(schema.safeParse({ taskId: "10" }).success).toBe(false);
  });
});

describe("analiseRouter.enqueueVarredura", () => {
  const procs = analiseRouter._def.procedures as Record<string, unknown>;
  const schema = getInputSchema((analiseRouter as any)._def.procedures.enqueueVarredura);

  it("is exposed", () => {
    expect(procs.enqueueVarredura).toBeDefined();
  });

  it("accepts an empty input (varre tudo) and optional atribuicao/since/limit", () => {
    expect(schema).toBeTruthy();
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ atribuicao: "VVD_CAMACARI" }).success).toBe(true);
    expect(schema.safeParse({ limit: 50 }).success).toBe(true);
  });

  it("rejects a non-positive or over-cap limit", () => {
    expect(schema.safeParse({ limit: 0 }).success).toBe(false);
    expect(schema.safeParse({ limit: 501 }).success).toBe(false);
  });
});
