import { describe, it, expect } from "vitest";
import { aplicarLote } from "../pje-review-bulk";
import type { PjeReviewRow } from "@/components/demandas-premium/pje-review-table";

function makeRow(overrides: Partial<PjeReviewRow> = {}): PjeReviewRow {
  return {
    assistidoNome: "Fulano",
    numeroProcesso: "0000001-00.2026.8.05.0039",
    dataExpedicao: "01/06/2026",
    ordemOriginal: 0,
    ato: "",
    atoConfidence: "low",
    status: "triagem",
    prazo: "",
    estadoPrisional: "Solto",
    excluded: false,
    prazoManual: false,
    providencias: "",
    assistidoMatch: { type: "new" },
    ...overrides,
  };
}

describe("aplicarLote", () => {
  const rows = [
    makeRow({ ordemOriginal: 0 }),
    makeRow({ ordemOriginal: 1 }),
    makeRow({ ordemOriginal: 2, excluded: true }),
    makeRow({ ordemOriginal: 3, prazoManual: true, prazo: "10/06/2026" }),
  ];

  it("com seleção, aplica só às selecionadas", () => {
    const out = aplicarLote(rows, new Set([1]), { status: "fazer" });
    expect(out[0].status).toBe("triagem");
    expect(out[1].status).toBe("fazer");
  });

  it("sem seleção, aplica a todas as não-excluídas", () => {
    const out = aplicarLote(rows, new Set(), { status: "fazer" });
    expect(out[0].status).toBe("fazer");
    expect(out[1].status).toBe("fazer");
    expect(out[3].status).toBe("fazer");
  });

  it("linha excluída nunca é tocada, mesmo selecionada", () => {
    const out = aplicarLote(rows, new Set([2]), { status: "fazer" });
    expect(out[2].status).toBe("triagem");
  });

  it("ato em lote recalcula prazo, exceto prazoManual", () => {
    const out = aplicarLote(rows, new Set(), { ato: "Resposta à Acusação" });
    expect(out[0].ato).toBe("Resposta à Acusação");
    expect(out[3].ato).toBe("Resposta à Acusação");
    expect(out[3].prazo).toBe("10/06/2026"); // prazoManual preservado
  });

  it("prazo em lote marca prazoManual", () => {
    const out = aplicarLote(rows, new Set([0]), { prazoIso: "2026-06-15" });
    expect(out[0].prazo).toBe("15/06/26"); // converterISOParaBR usa ano de 2 dígitos
    expect(out[0].prazoManual).toBe(true);
    expect(out[1].prazoManual).toBe(false);
  });

  it("aplicar um campo não toca os demais", () => {
    const out = aplicarLote(rows, new Set([0]), { estadoPrisional: "preso" });
    expect(out[0].estadoPrisional).toBe("preso");
    expect(out[0].status).toBe("triagem");
    expect(out[0].ato).toBe("");
  });
});
