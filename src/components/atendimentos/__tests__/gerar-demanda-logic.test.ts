import { describe, it, expect } from "vitest";
import { getAtoOptionsAgrupados } from "@/config/atos-por-atribuicao";
import {
  montarRegistroDoAtendimento,
  atribuicaoAtosLabel,
  filtrarAtos,
  addDiasISO,
  prazoPreview,
  buildCreateFromFormPayload,
  type BuildCreatePayloadInput,
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

describe("buildCreateFromFormPayload — firewall do payload de createFromForm", () => {
  const base: BuildCreatePayloadInput = {
    assistidoNome: "Fulano",
    assistidoId: 7,
    processoId: "",
    processoNumeroAutos: null,
    atribuicao: "JURI_CAMACARI",
    ato: "  Apelação  ",
    urgente: false,
    prazo: "",
    reuPreso: false,
    registro: "",
    vincular: true,
  };

  it("com processoId usa processoId numérico (sem numeroAutos)", () => {
    const p = buildCreateFromFormPayload({ ...base, processoId: "42", processoNumeroAutos: "0001" });
    expect(p.processoId).toBe(42);
    expect("numeroAutos" in p).toBe(false);
  });

  it("sem processoId cai em numeroAutos do processo", () => {
    const p = buildCreateFromFormPayload({ ...base, processoId: "", processoNumeroAutos: "0001234-55" });
    expect(p).toMatchObject({ numeroAutos: "0001234-55" });
    expect("processoId" in p).toBe(false);
  });

  it("sem processoId e sem numeroAutos → numeroAutos undefined", () => {
    const p = buildCreateFromFormPayload({ ...base, processoId: "", processoNumeroAutos: null });
    expect("numeroAutos" in p).toBe(true);
    expect((p as { numeroAutos?: string }).numeroAutos).toBeUndefined();
  });

  it("ato é trimado; status segue urgente", () => {
    expect(buildCreateFromFormPayload(base).ato).toBe("Apelação");
    expect(buildCreateFromFormPayload(base).status).toBe("triagem");
    expect(buildCreateFromFormPayload({ ...base, urgente: true }).status).toBe("urgente");
  });

  it("prazo vazio é omitido; preenchido entra", () => {
    expect("prazo" in buildCreateFromFormPayload(base)).toBe(false);
    expect(buildCreateFromFormPayload({ ...base, prazo: "2026-07-01" })).toMatchObject({ prazo: "2026-07-01" });
  });

  it("providencias só com texto (trimado)", () => {
    expect("providencias" in buildCreateFromFormPayload({ ...base, registro: "   " })).toBe(false);
    expect(buildCreateFromFormPayload({ ...base, registro: "  nota  " })).toMatchObject({ providencias: "nota" });
  });

  it("atendimentoId só entra com vincular=true", () => {
    expect("atendimentoId" in buildCreateFromFormPayload({ ...base, atendimentoId: 9, vincular: false })).toBe(false);
    expect(buildCreateFromFormPayload({ ...base, atendimentoId: 9, vincular: true })).toMatchObject({ atendimentoId: 9 });
  });
});
