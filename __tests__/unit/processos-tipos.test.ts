import { describe, it, expect } from "vitest";
import {
  TIPOS_PROCESSO,
  TIPOS_INCIDENTAIS,
  tipoProcessoLabel,
  mapAreaParaAtribuicao,
} from "@/lib/processos/tipos";

describe("processos/tipos", () => {
  it("rótulo por tipo, com fallback", () => {
    expect(tipoProcessoLabel("AP")).toBe("Ação Penal");
    expect(tipoProcessoLabel("HC")).toBe("Habeas Corpus");
    expect(tipoProcessoLabel("DESCONHECIDO")).toBe("DESCONHECIDO");
    expect(tipoProcessoLabel(null)).toBe("Processo");
  });

  it("todos os tipos incidentais existem na taxonomia e não são AP", () => {
    for (const t of TIPOS_INCIDENTAIS) {
      expect(TIPOS_PROCESSO[t], `falta config p/ ${t}`).toBeDefined();
      expect(t).not.toBe("AP");
    }
  });

  it("mapeia área → atribuição do caso, com fallback SUBSTITUICAO", () => {
    expect(mapAreaParaAtribuicao("JURI")).toBe("JURI_CAMACARI");
    expect(mapAreaParaAtribuicao("VIOLENCIA_DOMESTICA")).toBe("VVD_CAMACARI");
    expect(mapAreaParaAtribuicao("EXECUCAO_PENAL")).toBe("EXECUCAO_PENAL");
    expect(mapAreaParaAtribuicao("QUALQUER_OUTRA")).toBe("SUBSTITUICAO");
  });
});
