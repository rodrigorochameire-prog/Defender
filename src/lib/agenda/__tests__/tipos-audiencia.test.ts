import { describe, it, expect } from "vitest";
import {
  TIPOS_AUDIENCIA,
  detectarSlug,
  tipoPorSlug,
  resolverTipo,
  buildTipoAbreviacoes,
} from "../tipos-audiencia";

describe("catálogo de tipos de audiência", () => {
  it("slugs e descrições são únicos", () => {
    const slugs = TIPOS_AUDIENCIA.map((t) => t.slug);
    const descs = TIPOS_AUDIENCIA.map((t) => t.descricao);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(descs).size).toBe(descs.length);
  });

  it("toda descrição canônica resolve para o próprio slug", () => {
    for (const t of TIPOS_AUDIENCIA) {
      expect(resolverTipo(t.descricao).slug).toBe(t.slug);
    }
  });

  it("tipoPorSlug cai em indefinido para slug desconhecido", () => {
    expect(tipoPorSlug("xpto").slug).toBe("indefinido");
  });
});

describe("detectarSlug — ordem de especificidade", () => {
  it("Sessão de Julgamento vence AIJ", () => {
    expect(detectarSlug("SESSÃO DE JULGAMENTO DO TRIBUNAL DO JÚRI")).toBe("plenario_juri");
  });
  it("Oitiva/Depoimento Especial vence Justificação e AIJ", () => {
    expect(detectarSlug("DEPOIMENTO ESPECIAL")).toBe("oitiva_especial");
  });
  it("Instrução + Depoimento Especial (mutirão) vence oitiva e aij", () => {
    expect(detectarSlug("INSTRUÇÃO + DEPOIMENTO ESPECIAL")).toBe("instrucao_oitiva");
  });
  it("Justificação quebrada (Ç|Ã) detecta", () => {
    expect(detectarSlug("(1268)\nJUSTIFICAÇ\nÃO")).toBe("justificacao");
  });
  it("AIJ por INSTRUÇÃO", () => {
    expect(detectarSlug("AUDIÊNCIA DE INSTRUÇÃO E JULGAMENTO")).toBe("aij");
  });
  it("fallback por código de classe (1268 → justificação)", () => {
    expect(detectarSlug("MEDIDAS PROTETIVAS (1268) designada")).toBe("justificacao");
  });
  it("Audiência Una vence AIJ (una de conciliação, instrução e julgamento)", () => {
    expect(detectarSlug("AUDIÊNCIA UNA DE CONCILIAÇÃO, INSTRUÇÃO E JULGAMENTO")).toBe("una");
  });
  it("Audiência Preliminar detecta", () => {
    expect(detectarSlug("AUDIÊNCIA PRELIMINAR")).toBe("preliminar");
  });
  it("sem match → indefinido", () => {
    expect(detectarSlug("ALGO QUE NÃO EXISTE")).toBe("indefinido");
  });
});

describe("resolverTipo — valores sujos do banco", () => {
  it.each([
    ["Audiência de Instrução e Julgamento", "aij"],
    ["Instrução e Julgamento", "aij"],
    ["Instrução", "aij"],
    ["INSTRUCAO", "aij"],
    ["AIJ", "aij"],
    ["Continuação de Instrução / Acareação", "aij"],
    ["Oitiva Especial", "oitiva_especial"],
    ["Depoimento Especial", "oitiva_especial"],
    ["OITIVA_ESPECIALIZADA", "oitiva_especial"],
    ["Justificação", "justificacao"],
    ["Audiência de Justificação", "justificacao"],
    ["JUSTIFICAÇÃO", "justificacao"],
    ["Sessão de Julgamento do Tribunal do Júri", "plenario_juri"],
    ["Audiência Admonitória", "admonitoria"],
    ["Produção Antecipada de Provas", "pap"],
    ["Instrução + Depoimento Especial", "instrucao_oitiva"],
    ["audiencia", "indefinido"],
    ["Audiência", "indefinido"],
  ])("'%s' → %s", (bruto, slug) => {
    expect(resolverTipo(bruto).slug).toBe(slug);
  });
});

describe("buildTipoAbreviacoes", () => {
  it("descrição e aliases mapeiam para a sigla", () => {
    const m = buildTipoAbreviacoes();
    expect(m["Audiência de Instrução e Julgamento"]).toBe("AIJ");
    expect(m["Instrução e Julgamento"]).toBe("AIJ");
    expect(m["Oitiva Especial"]).toBe("Oitiva Especial");
    expect(m["Sessão de Julgamento do Tribunal do Júri"]).toBe("Júri");
  });
  it("inclui siglas legadas e NÃO inclui o typo 'Adminitória'", () => {
    const m = buildTipoAbreviacoes();
    expect(m["Audiência de Execução"]).toBe("Execução");
    expect(m["Adminitória"]).toBeUndefined();
  });
});
