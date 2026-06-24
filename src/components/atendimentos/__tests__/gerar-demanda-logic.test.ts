import { describe, it, expect } from "vitest";
import { getAtoOptionsAgrupados } from "@/config/atos-por-atribuicao";
import {
  montarRegistroDoAtendimento,
  atribuicaoAtosLabel,
  filtrarAtos,
} from "../gerar-demanda-logic";

describe("montarRegistroDoAtendimento — texto importado limpo de HTML", () => {
  it("compõe Assunto/Pedido/conteúdo sem tags", () => {
    expect(
      montarRegistroDoAtendimento({ assunto: "<b>Furto</b>", pedido: "<p>Defesa</p>", conteudo: "relato" }),
    ).toBe("Assunto: Furto\nPedido: Defesa\nrelato");
  });

  it("ctx nulo → vazio", () => {
    expect(montarRegistroDoAtendimento(null)).toBe("");
  });

  it("campos vazios são omitidos", () => {
    expect(montarRegistroDoAtendimento({ assunto: null, pedido: null, conteudo: "só relato" })).toBe("só relato");
  });
});

describe("atribuicaoAtosLabel", () => {
  it("mapeia enum conhecido ao rótulo do catálogo", () => {
    expect(atribuicaoAtosLabel("JURI_CAMACARI")).toBe("Tribunal do Júri");
    expect(atribuicaoAtosLabel("VVD_CAMACARI")).toBe("Violência Doméstica");
  });

  it("enum desconhecido cai em Criminal Geral", () => {
    expect(atribuicaoAtosLabel("INEXISTENTE")).toBe("Criminal Geral");
  });
});

describe("filtrarAtos — busca + agrupamento por categoria", () => {
  const flatJuri = getAtoOptionsAgrupados("Tribunal do Júri");

  it("sem query: agrupa todos os atos da atribuição (sem perder nenhum)", () => {
    const grupos = filtrarAtos("JURI_CAMACARI", "");
    expect(grupos.length).toBeGreaterThan(0);
    const total = grupos.reduce((n, g) => n + g.options.length, 0);
    expect(total).toBe(flatJuri.length);
    expect(grupos.every((g) => g.options.length > 0)).toBe(true);
  });

  it("query sem correspondência → nenhum grupo", () => {
    expect(filtrarAtos("JURI_CAMACARI", "xqzwk-nao-existe")).toEqual([]);
  });

  it("filtra por substring do rótulo", () => {
    const alvo = flatJuri[0].label;
    const grupos = filtrarAtos("JURI_CAMACARI", alvo.slice(0, 4));
    const labels = grupos.flatMap((g) => g.options.map((o) => o.label));
    expect(labels).toContain(alvo);
  });

  it("busca é acento/caixa-insensível", () => {
    const alvo = flatJuri[0].label;
    const semAcento = alvo.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase();
    const grupos = filtrarAtos("JURI_CAMACARI", semAcento.slice(0, 5));
    const labels = grupos.flatMap((g) => g.options.map((o) => o.label));
    expect(labels).toContain(alvo);
  });
});
