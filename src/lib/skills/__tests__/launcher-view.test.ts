import { describe, it, expect } from "vitest";
import { buildLauncherItems, groupByCategoria } from "../launcher-view";

describe("buildLauncherItems", () => {
  it("produces a trigger payload carrying the slug and context ids", () => {
    const items = buildLauncherItems({
      entity: "processo",
      atribuicao: "JURI_CAMACARI",
      assistidoId: 7,
      processoId: 42,
    });
    const juri = items.find((i) => i.slug === "juri");
    expect(juri).toBeTruthy();
    expect(juri!.triggerInput).toMatchObject({
      skill: "juri",
      assistidoId: 7,
      processoId: 42,
    });
  });

  it("omits every item when no assistidoId is resolvable (criarTask requires it)", () => {
    const items = buildLauncherItems({
      entity: "processo",
      atribuicao: "JURI_CAMACARI",
      processoId: 42,
      // assistidoId ausente
    });
    expect(items).toEqual([]);
  });

  it("does not put processoId in the payload for an assistido-context launch", () => {
    const items = buildLauncherItems({
      entity: "assistido",
      atribuicao: "VVD_CAMACARI",
      assistidoId: 9,
    });
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.triggerInput.assistidoId).toBe(9);
      expect(item.triggerInput.processoId).toBeUndefined();
    }
  });

  it("carries casoId when provided", () => {
    const items = buildLauncherItems({
      entity: "caso",
      atribuicao: "EXECUCAO_PENAL",
      assistidoId: 3,
      casoId: 100,
    });
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].triggerInput.casoId).toBe(100);
  });

  it("carries label, description and icon from the catalog", () => {
    const items = buildLauncherItems({
      entity: "processo",
      atribuicao: "VVD_CAMACARI",
      assistidoId: 1,
      processoId: 2,
    });
    const vvd = items.find((i) => i.slug === "vvd")!;
    expect(vvd.label).toBeTruthy();
    expect(vvd.description).toBeTruthy();
    expect(vvd.icon).toBeTruthy();
    expect(vvd.category).toBe("analise");
  });
});

describe("groupByCategoria", () => {
  it("groups items by category preserving catalog category order", () => {
    const items = buildLauncherItems({
      entity: "processo",
      atribuicao: "JURI_CAMACARI",
      assistidoId: 1,
      processoId: 2,
    });
    const groups = groupByCategoria(items);
    const categorias = groups.map((g) => g.category);
    // "analise" precede "peca" precede demais
    expect(categorias.indexOf("analise")).toBeLessThan(categorias.indexOf("peca"));
    // nenhuma categoria vazia
    for (const g of groups) expect(g.items.length).toBeGreaterThan(0);
  });
});
