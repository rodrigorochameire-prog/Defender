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
