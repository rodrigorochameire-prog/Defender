import { describe, it, expect } from "vitest";
import { getAtoOptionsAgrupados } from "@/config/atos-por-atribuicao";
import {
  montarRegistroDoAtendimento,
  atribuicaoAtosLabel,
  filtrarAtos,
  addDiasISO,
  prazoPreview,
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

describe("addDiasISO", () => {
  it("soma dias dentro do mês", () => {
    expect(addDiasISO("2026-06-24", 5)).toBe("2026-06-29");
  });
  it("rola para o mês seguinte", () => {
    expect(addDiasISO("2026-06-30", 5)).toBe("2026-07-05");
  });
});

describe("prazoPreview", () => {
  const HOJE = "2026-06-24";
  it("sem prazo → null", () => {
    expect(prazoPreview("", HOJE)).toBeNull();
    expect(prazoPreview(null, HOJE)).toBeNull();
  });
  it("prazo no passado → vencido/danger", () => {
    expect(prazoPreview("2026-06-20", HOJE)).toEqual({ label: "vencido", tone: "danger" });
  });
  it("prazo hoje → hoje/warn", () => {
    expect(prazoPreview("2026-06-24", HOJE)).toEqual({ label: "hoje", tone: "warn" });
  });
  it("dentro de 7 dias → neutral, plural correto", () => {
    expect(prazoPreview("2026-06-27", HOJE)).toEqual({ label: "em 3 dias", tone: "neutral" });
    expect(prazoPreview("2026-06-25", HOJE)).toEqual({ label: "em 1 dia", tone: "neutral" });
  });
  it("além de 7 dias → muted", () => {
    expect(prazoPreview("2026-07-20", HOJE)).toEqual({ label: "em 26 dias", tone: "muted" });
  });
});
