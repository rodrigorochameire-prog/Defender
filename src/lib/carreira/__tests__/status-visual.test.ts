import { describe, it, expect } from "vitest";
import { carreiraStatusInfo } from "../status-visual";

describe("carreiraStatusInfo", () => {
  it("labels event statuses correctly (not the audiência fallback)", () => {
    expect(carreiraStatusInfo("previsto").label).toBe("Previsto");
    expect(carreiraStatusInfo("em_curso").label).toBe("Em curso");
    expect(carreiraStatusInfo("concluido").label).toBe("Concluído");
    expect(carreiraStatusInfo("pendente").label).toBe("Pendente");
    expect(carreiraStatusInfo("arquivado").label).toBe("Arquivado");
  });

  it("labels substituição statuses correctly", () => {
    expect(carreiraStatusInfo("em_andamento").label).toBe("Em andamento");
    expect(carreiraStatusInfo("concluida").label).toBe("Concluída");
    expect(carreiraStatusInfo("oficiada").label).toBe("Oficiada");
    expect(carreiraStatusInfo("paga").label).toBe("Paga");
  });

  it("is case/spacing tolerant", () => {
    expect(carreiraStatusInfo(" EM_CURSO ").label).toBe("Em curso");
  });

  it("falls back to a neutral chip echoing the raw status", () => {
    const r = carreiraStatusInfo("qualquer_coisa");
    expect(r.label).toBe("qualquer_coisa");
    expect(r.badge).toContain("neutral");
  });

  it("returns badge + dot classes for every known status", () => {
    for (const s of ["previsto","em_curso","concluido","pendente","arquivado","em_andamento","concluida","oficiada","paga"]) {
      const r = carreiraStatusInfo(s);
      expect(r.badge.length).toBeGreaterThan(0);
      expect(r.dot.length).toBeGreaterThan(0);
    }
  });
});
