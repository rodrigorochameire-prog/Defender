import { describe, it, expect } from "vitest";
import {
  statusCasoInfo,
  prioridadeCasoInfo,
  pesoPrioridadeCaso,
  situacaoProcessoInfo,
  CASO_PRIORIDADE_ORDEM,
} from "@/lib/config/tipologia";

describe("tipologia · caso status", () => {
  it("mapeia status conhecidos (case-insensitive)", () => {
    expect(statusCasoInfo("ativo").label).toBe("Ativo");
    expect(statusCasoInfo("ATIVO").label).toBe("Ativo");
    expect(statusCasoInfo("arquivado").dot).toBe("bg-neutral-400");
  });
  it("status desconhecido → fallback com o próprio rótulo", () => {
    const v = statusCasoInfo("xpto");
    expect(v.label).toBe("xpto");
    expect(v.badge).toContain("neutral");
  });
  it("null/undefined → traço", () => {
    expect(statusCasoInfo(null).label).toBe("—");
    expect(statusCasoInfo(undefined).label).toBe("—");
  });
});

describe("tipologia · caso prioridade", () => {
  it("mapeia enum conhecido (case-insensitive)", () => {
    expect(prioridadeCasoInfo("REU_PRESO").label).toBe("Réu preso");
    expect(prioridadeCasoInfo("reu_preso").dot).toBe("bg-rose-500");
    expect(prioridadeCasoInfo("URGENTE").label).toBe("Urgente");
  });
  it("peso ordena por urgência decrescente", () => {
    expect(pesoPrioridadeCaso("REU_PRESO")).toBe(CASO_PRIORIDADE_ORDEM.length);
    expect(pesoPrioridadeCaso("BAIXA")).toBe(1);
    expect(pesoPrioridadeCaso("REU_PRESO")).toBeGreaterThan(pesoPrioridadeCaso("ALTA"));
    expect(pesoPrioridadeCaso("ALTA")).toBeGreaterThan(pesoPrioridadeCaso("NORMAL"));
    expect(pesoPrioridadeCaso(null)).toBe(0);
    expect(pesoPrioridadeCaso("inexistente")).toBe(0);
  });
});

describe("tipologia · processo situação", () => {
  it("ativo tem ponto emerald (lê como vivo) e paleta neutra", () => {
    const v = situacaoProcessoInfo("ativo");
    expect(v.label).toBe("Ativo");
    expect(v.dot).toBe("bg-emerald-500");
    expect(v.badge).toContain("neutral");
  });
  it("desconhecido/null → fallback", () => {
    expect(situacaoProcessoInfo("zzz").label).toBe("zzz");
    expect(situacaoProcessoInfo(null).label).toBe("—");
  });
});
