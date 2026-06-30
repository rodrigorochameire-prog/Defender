import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regression guard (F3-C): the Cosmovisão page must use accented PT-BR body
 * copy, and the completeness metric must read "Ficha %" (canonical glossary
 * term), never the legacy "Cadastro %".
 */

const COSMOVISAO = join(__dirname, "page.tsx");
const STATE = join(
  __dirname,
  "../../../../../lib/assistidos/state.ts",
);
const PREVIEW_PANEL = join(
  __dirname,
  "../../assistidos/_components/assistido-preview-panel.tsx",
);

function read(file: string) {
  return readFileSync(file, "utf8");
}

describe("Cosmovisão page — accented body strings", () => {
  const src = read(COSMOVISAO);

  // Unaccented forms that must NOT appear as VISIBLE body copy.
  // These fragments are chosen to match rendered text only, not TS
  // identifiers / type fields / data values (e.g. `taxaAbsolvicao`,
  // `DuracaoRow`, the "Nao informado" data compare, `porDuracao` route).
  const forbidden = [
    " sessoes", // "{n} sessoes"
    "de Sessoes", // "Total de Sessoes"
    "para Sessoes", // "Ir para Sessoes"
    "estatisticas",
    "padroes",
    "automaticos",
    "Automaticos", // "Insights Automaticos"
    "Evolucao Mensal",
    "Absolvicoes", // KPI label
    "Condenacoes", // KPI label
    "`Absolvicao:", // chart title attr
    "`Condenacao:", // chart title attr
    ">Absolvicao<", // legend span
    ">Condenacao<", // legend span
    "Taxa Absolvicao",
    "Desclassificacoes/Nulidades", // chart title attr
    "Por Duracao", // section title
    "de duracao", // "Sem dados de duracao"
    "Perfil do Reu",
    "Atores do Juri",
    "Confianca:", // insight footer
    '? "Juizes"', // tab display label
  ];

  for (const word of forbidden) {
    it(`does not contain unaccented "${word}"`, () => {
      expect(src).not.toContain(word);
    });
  }
});

describe("Completeness label — canonical term is 'Ficha'", () => {
  it("Atenção Imediata chip (state.ts) labels the metric as 'Ficha'", () => {
    const src = read(STATE);
    expect(src).toContain("Ficha ${comp.pct}%");
    expect(src).not.toContain("Cadastro ${comp.pct}%");
  });

  it("preview panel uses 'Ficha' for the completeness metric", () => {
    const src = read(PREVIEW_PANEL);
    expect(src).toContain("Ficha ${comp.pct}%");
    expect(src).not.toContain("Cadastro ${comp.pct}%");
  });
});
