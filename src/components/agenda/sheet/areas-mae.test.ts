import { describe, it, expect } from "vitest";
import {
  AREA_ORDER,
  AREA_LABELS,
  SECAO_TO_AREA,
  areaDaSecao,
  secoesDaArea,
  type AreaMae,
} from "./areas-mae";
import { SECOES_DEFAULT, SECOES_JUSTIFICACAO, SECOES_INSTRUCAO, type SecaoId } from "./secoes-manifest";

describe("áreas-mãe (mapeamento de seções → modos de trabalho)", () => {
  it("define exatamente 5 áreas, na ordem do workspace", () => {
    expect(AREA_ORDER).toEqual(["resumo", "estrategia", "prova-oral", "documentos", "execucao"]);
  });

  it("tem rótulo legível para cada área", () => {
    for (const a of AREA_ORDER) {
      expect(AREA_LABELS[a]).toBeTruthy();
      expect(typeof AREA_LABELS[a]).toBe("string");
    }
  });

  it("mapeia TODA seção usada nos manifestos para uma área válida", () => {
    const todas = new Set<SecaoId>([
      ...SECOES_DEFAULT,
      ...SECOES_JUSTIFICACAO,
      ...SECOES_INSTRUCAO,
    ]);
    for (const id of todas) {
      const area = SECAO_TO_AREA[id];
      expect(area, `seção '${id}' sem área`).toBeDefined();
      expect(AREA_ORDER).toContain(area);
    }
  });

  it("areaDaSecao resolve a área de uma seção", () => {
    expect(areaDaSecao("depoentes")).toBe("prova-oral");
    expect(areaDaSecao("teses")).toBe("estrategia");
    expect(areaDaSecao("documentos")).toBe("documentos");
    expect(areaDaSecao("ata")).toBe("execucao");
    expect(areaDaSecao("resumo")).toBe("resumo");
  });

  it("secoesDaArea filtra preservando a ordem de entrada", () => {
    const visiveis: SecaoId[] = ["resumo", "depoentes", "teses", "depoimentos", "documentos"];
    expect(secoesDaArea("prova-oral", visiveis)).toEqual(["depoentes", "depoimentos"]);
    expect(secoesDaArea("resumo", visiveis)).toEqual(["resumo"]);
    expect(secoesDaArea("execucao", visiveis)).toEqual([]);
  });

  it("cada área do AREA_ORDER tem ao menos uma seção atribuível", () => {
    const usadas = new Set<AreaMae>(Object.values(SECAO_TO_AREA));
    for (const a of AREA_ORDER) expect(usadas.has(a), `área '${a}' vazia`).toBe(true);
  });
});
