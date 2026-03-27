import { describe, it, expect } from "vitest";
import { detectChange, classifySync, type SyncFieldState } from "@/lib/services/sync-engine";

describe("detectChange", () => {
  it("detecta que só banco mudou", () => {
    const state: SyncFieldState = {
      valorBanco: "2_ATENDER", valorPlanilha: "5_FILA",
      bancoUpdatedAt: new Date("2026-03-27T10:00:00Z"),
      planilhaUpdatedAt: new Date("2026-03-27T08:00:00Z"),
      syncedAt: new Date("2026-03-27T09:00:00Z"),
    };
    expect(detectChange(state)).toBe("BANCO_CHANGED");
  });

  it("detecta que só planilha mudou", () => {
    const state: SyncFieldState = {
      valorBanco: "5_FILA", valorPlanilha: "2_ATENDER",
      bancoUpdatedAt: new Date("2026-03-27T08:00:00Z"),
      planilhaUpdatedAt: new Date("2026-03-27T10:00:00Z"),
      syncedAt: new Date("2026-03-27T09:00:00Z"),
    };
    expect(detectChange(state)).toBe("PLANILHA_CHANGED");
  });

  it("detecta conflito quando ambos mudaram com valores diferentes", () => {
    const state: SyncFieldState = {
      valorBanco: "2_ATENDER", valorPlanilha: "7_CIENCIA",
      bancoUpdatedAt: new Date("2026-03-27T10:00:00Z"),
      planilhaUpdatedAt: new Date("2026-03-27T10:05:00Z"),
      syncedAt: new Date("2026-03-27T09:00:00Z"),
    };
    expect(detectChange(state)).toBe("CONFLICT");
  });

  it("ignora quando ambos mudaram para o mesmo valor", () => {
    const state: SyncFieldState = {
      valorBanco: "2_ATENDER", valorPlanilha: "2_ATENDER",
      bancoUpdatedAt: new Date("2026-03-27T10:00:00Z"),
      planilhaUpdatedAt: new Date("2026-03-27T10:05:00Z"),
      syncedAt: new Date("2026-03-27T09:00:00Z"),
    };
    expect(detectChange(state)).toBe("NO_CHANGE");
  });

  it("ignora quando nenhum mudou", () => {
    const state: SyncFieldState = {
      valorBanco: "5_FILA", valorPlanilha: "5_FILA",
      bancoUpdatedAt: new Date("2026-03-27T08:00:00Z"),
      planilhaUpdatedAt: new Date("2026-03-27T08:00:00Z"),
      syncedAt: new Date("2026-03-27T09:00:00Z"),
    };
    expect(detectChange(state)).toBe("NO_CHANGE");
  });
});

describe("classifySync", () => {
  it("classifica campos bidirecionais", () => {
    expect(classifySync("status")).toBe("BIDIRECTIONAL");
    expect(classifySync("providencias")).toBe("BIDIRECTIONAL");
    expect(classifySync("delegadoPara")).toBe("BIDIRECTIONAL");
    expect(classifySync("prazo")).toBe("BIDIRECTIONAL");
    expect(classifySync("reuPreso")).toBe("BIDIRECTIONAL");
  });

  it("classifica campos unidirecionais", () => {
    expect(classifySync("assistidoNome")).toBe("BANCO_TO_SHEET");
    expect(classifySync("numeroAutos")).toBe("BANCO_TO_SHEET");
    expect(classifySync("ato")).toBe("BANCO_TO_SHEET");
    expect(classifySync("dataEntrada")).toBe("BANCO_TO_SHEET");
  });
});
