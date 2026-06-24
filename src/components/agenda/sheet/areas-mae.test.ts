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

describe("computeWorkspaceTabs (partição do workspace)", () => {
  it("conta seções por área e expõe só as áreas com conteúdo", () => {
    const r = computeWorkspaceTabs({
      secoesVisiveis: ["resumo", "depoentes", "depoimentos", "documentos"],
      espinhaVisiveis: ["resumo", "depoentes", "depoimentos", "documentos"],
      contextoIds: [],
      activeTab: "resumo",
    });
    expect(r.areaCounts.resumo).toBe(1);
    expect(r.areaCounts["prova-oral"]).toBe(2);
    expect(r.areaCounts.documentos).toBe(1);
    expect(r.areaCounts.estrategia).toBe(0);
    // estratégia e execução não têm conteúdo → fora das abas
    expect(r.areasComConteudo).toEqual(["resumo", "prova-oral", "documentos"]);
  });

  it("mantém a aba pedida quando ela tem conteúdo", () => {
    const r = computeWorkspaceTabs({
      secoesVisiveis: ["resumo", "depoentes"],
      espinhaVisiveis: ["resumo", "depoentes"],
      contextoIds: [],
      activeTab: "prova-oral",
    });
    expect(r.tabAtiva).toBe("prova-oral");
    expect(r.espinhaDaTab).toEqual(["depoentes"]);
  });

  it("cai na 1ª aba com conteúdo quando a pedida está vazia", () => {
    const r = computeWorkspaceTabs({
      secoesVisiveis: ["depoentes", "documentos"],
      espinhaVisiveis: ["depoentes", "documentos"],
      contextoIds: [],
      activeTab: "estrategia", // vazia
    });
    expect(r.tabAtiva).toBe("prova-oral"); // 1ª com conteúdo na ordem
  });

  it("preserva o split espinha/Contexto do AIJ dentro da aba ativa", () => {
    // documentos: 'fatos' na espinha, 'laudos' no Contexto
    const r = computeWorkspaceTabs({
      secoesVisiveis: ["fatos", "laudos", "teses"],
      espinhaVisiveis: ["fatos", "teses"],
      contextoIds: ["laudos"],
      activeTab: "documentos",
    });
    expect(r.espinhaDaTab).toEqual(["fatos"]);
    expect(r.contextoDaTab).toEqual(["laudos"]);
  });

  it("dia/ato sem seções: aba 'resumo', listas vazias, sem crash", () => {
    const r = computeWorkspaceTabs({
      secoesVisiveis: [],
      espinhaVisiveis: [],
      contextoIds: [],
      activeTab: "resumo",
    });
    expect(r.areasComConteudo).toEqual([]);
    expect(r.tabAtiva).toBe("resumo");
    expect(r.espinhaDaTab).toEqual([]);
    expect(r.contextoDaTab).toEqual([]);
  });
});
