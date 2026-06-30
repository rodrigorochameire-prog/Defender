import { describe, it, expect } from "vitest";
import {
  AREA_ORDER,
  AREA_LABELS,
  SECAO_TO_AREA,
  areaDaSecao,
  secoesDaArea,
  computeWorkspaceTabs,
  type AreaMae,
} from "./areas-mae";
import { SECOES_DEFAULT, SECOES_JUSTIFICACAO, SECOES_INSTRUCAO, type SecaoId } from "./secoes-manifest";

describe("áreas-mãe (mapeamento de seções → modos de trabalho)", () => {
  it("define exatamente 5 áreas, na ordem do workspace", () => {
    expect(AREA_ORDER).toEqual(["imputacao", "depoimentos", "laudos-docs", "estrategia", "execucao"]);
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
    expect(areaDaSecao("depoentes")).toBe("imputacao");
    expect(areaDaSecao("teses")).toBe("estrategia");
    expect(areaDaSecao("documentos")).toBe("laudos-docs");
    expect(areaDaSecao("ata")).toBe("execucao");
    expect(areaDaSecao("resumo")).toBe("imputacao");
  });

  it("secoesDaArea filtra preservando a ordem de entrada", () => {
    const visiveis: SecaoId[] = ["resumo", "depoentes", "teses", "depoimentos", "documentos"];
    expect(secoesDaArea("imputacao", visiveis)).toEqual(["resumo", "depoentes"]);
    expect(secoesDaArea("depoimentos", visiveis)).toEqual(["depoimentos"]);
    expect(secoesDaArea("execucao", visiveis)).toEqual([]);
  });

  it("cada área do AREA_ORDER tem ao menos uma seção atribuível", () => {
    const usadas = new Set<AreaMae>(Object.values(SECAO_TO_AREA));
    for (const a of AREA_ORDER) expect(usadas.has(a), `área '${a}' vazia`).toBe(true);
  });
});

describe("computeWorkspaceTabs (partição do workspace)", () => {
  it("conta seções por área e expõe só as áreas com conteúdo", () => {
    const r = computeWorkspaceTabs({
      secoesVisiveis: ["resumo", "depoentes", "depoimentos", "documentos"],
      espinhaVisiveis: ["resumo", "depoentes", "depoimentos", "documentos"],
      contextoIds: [],
      activeTab: "imputacao",
    });
    expect(r.areaCounts.imputacao).toBe(2);
    expect(r.areaCounts.depoimentos).toBe(1);
    expect(r.areaCounts["laudos-docs"]).toBe(1);
    expect(r.areaCounts.estrategia).toBe(0);
    // estratégia e execução não têm conteúdo → fora das abas
    expect(r.areasComConteudo).toEqual(["imputacao", "depoimentos", "laudos-docs"]);
  });

  it("mantém a aba pedida quando ela tem conteúdo", () => {
    const r = computeWorkspaceTabs({
      secoesVisiveis: ["resumo", "depoentes", "depoimentos"],
      espinhaVisiveis: ["resumo", "depoentes", "depoimentos"],
      contextoIds: [],
      activeTab: "depoimentos",
    });
    expect(r.tabAtiva).toBe("depoimentos");
    expect(r.espinhaDaTab).toEqual(["depoimentos"]);
  });

  it("cai na 1ª aba com conteúdo quando a pedida está vazia", () => {
    const r = computeWorkspaceTabs({
      secoesVisiveis: ["depoentes", "documentos"],
      espinhaVisiveis: ["depoentes", "documentos"],
      contextoIds: [],
      activeTab: "estrategia", // vazia
    });
    expect(r.tabAtiva).toBe("imputacao"); // 1ª com conteúdo na ordem
  });

  it("preserva o split espinha/Contexto do AIJ dentro da aba ativa", () => {
    // imputacao: 'fatos' na espinha, 'resumo' no Contexto
    const r = computeWorkspaceTabs({
      secoesVisiveis: ["fatos", "resumo", "laudos", "teses"],
      espinhaVisiveis: ["fatos", "teses"],
      contextoIds: ["resumo", "laudos"],
      activeTab: "imputacao",
    });
    expect(r.espinhaDaTab).toEqual(["fatos"]);
    expect(r.contextoDaTab).toEqual(["resumo"]);
  });

  it("dia/ato sem seções: aba 'imputacao', listas vazias, sem crash", () => {
    const r = computeWorkspaceTabs({
      secoesVisiveis: [],
      espinhaVisiveis: [],
      contextoIds: [],
      activeTab: "imputacao",
    });
    expect(r.areasComConteudo).toEqual([]);
    expect(r.tabAtiva).toBe("imputacao");
    expect(r.espinhaDaTab).toEqual([]);
    expect(r.contextoDaTab).toEqual([]);
  });
});
