import { describe, it, expect } from "vitest";
import { computeVisibleCasoTabs } from "@/lib/hierarquia/visible-caso-tabs";

describe("computeVisibleCasoTabs", () => {
  it("inclui abas sempre em qualquer area", () => {
    const tabs = computeVisibleCasoTabs("SUBSTITUICAO").map((t) => t.key);
    expect(tabs).toContain("geral");
    expect(tabs).toContain("pessoas");
    expect(tabs).toContain("audiencias");
    expect(tabs).toContain("demandas");
    expect(tabs).toContain("documentos");
  });

  it("JURI mostra Delitos + Institutos", () => {
    const tabs = computeVisibleCasoTabs("JURI").map((t) => t.key);
    expect(tabs).toContain("delitos");
    expect(tabs).toContain("institutos");
    expect(tabs).not.toContain("mpu");
    expect(tabs).not.toContain("atos-infracionais");
    expect(tabs).not.toContain("execucao-penal");
  });

  it("VIOLENCIA_DOMESTICA mostra MPU + Delitos", () => {
    const tabs = computeVisibleCasoTabs("VIOLENCIA_DOMESTICA").map((t) => t.key);
    expect(tabs).toContain("mpu");
    expect(tabs).toContain("delitos");
    expect(tabs).not.toContain("institutos");
    expect(tabs).not.toContain("atos-infracionais");
  });

  it("EXECUCAO_PENAL mostra Execução Penal + Delitos", () => {
    const tabs = computeVisibleCasoTabs("EXECUCAO_PENAL").map((t) => t.key);
    expect(tabs).toContain("execucao-penal");
    expect(tabs).toContain("delitos");
    expect(tabs).not.toContain("institutos");
  });

  it("INFANCIA_JUVENTUDE mostra Atos Infracionais", () => {
    const tabs = computeVisibleCasoTabs("INFANCIA_JUVENTUDE").map((t) => t.key);
    expect(tabs).toContain("atos-infracionais");
    expect(tabs).not.toContain("delitos");
    expect(tabs).not.toContain("mpu");
  });

  it("CIVEL e FAMILIA — sem condicionais penais", () => {
    const tabsCivel = computeVisibleCasoTabs("CIVEL").map((t) => t.key);
    expect(tabsCivel).not.toContain("delitos");
    expect(tabsCivel).not.toContain("mpu");
    const tabsFam = computeVisibleCasoTabs("FAMILIA").map((t) => t.key);
    expect(tabsFam).not.toContain("delitos");
  });

  it("CRIMINAL mostra Delitos + Institutos", () => {
    const tabs = computeVisibleCasoTabs("CRIMINAL").map((t) => t.key);
    expect(tabs).toContain("delitos");
    expect(tabs).toContain("institutos");
  });

  it("primeira aba é sempre 'geral'", () => {
    const tabs = computeVisibleCasoTabs("JURI");
    expect(tabs[0].key).toBe("geral");
  });
});
