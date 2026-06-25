/**
 * F1 — Consolidação de cor de atribuição (8 stragglers → registry central).
 *
 * Trava arquitetural: nenhum arquivo fora de `src/lib/config/` pode declarar a
 * sua própria paleta de atribuição (`const ATRIBUICAO_COLORS` / `ATRIBUICAO_BORDERS`)
 * nem literais de cor de atribuição. Todos consomem `getAtribuicaoColors` /
 * `SOLID_COLOR_MAP` / `getAtribuicaoHex` do registry único.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  SOLID_COLOR_MAP,
  getAtribuicaoHex,
} from "@/lib/config/atribuicoes";

const ROOT = join(__dirname, "..", "..");

// Os 8 stragglers conhecidos (F1). Devem ficar livres de paleta local.
const STRAGGLERS = [
  "src/app/(dashboard)/admin/beneficios/page.tsx",
  "src/app/(dashboard)/admin/settings/enrichment/page.tsx",
  "src/app/(dashboard)/admin/settings/drive/auto-vincular/page.tsx",
  "src/components/shared/floating-demandas.tsx",
  "src/components/shared/floating-agenda.tsx",
  "src/components/casos/case-card.tsx",
  "src/components/cadastro/cadastro-mapa.tsx",
  "src/components/demandas-premium/dynamic-charts.tsx",
];

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("F1: nenhuma paleta de atribuição local fora de src/lib/config/", () => {
  // (a) Declaração de registry local de atribuição.
  const LOCAL_PALETTE_RE = /\bconst\s+(ATRIBUICAO_COLORS|ATRIBUICAO_BORDERS)\b/;

  it.each(STRAGGLERS)(
    "%s não declara ATRIBUICAO_COLORS/ATRIBUICAO_BORDERS local",
    (rel) => {
      const src = read(rel);
      expect(
        LOCAL_PALETTE_RE.test(src),
        `${rel} ainda declara uma paleta de atribuição local — deve importar do registry`,
      ).toBe(false);
    },
  );
});

describe("F1: nenhum literal de cor de atribuição nos componentes", () => {
  // (b) Literais de cor de atribuição que divergem do registry.
  // Execução Penal sozinha tem 4 azuis hoje: #60a5fa (registry), #0284c7 (floating),
  // #6A9EC5 (charts), blue-600 (benefícios). Nenhum literal divergente deve sobrar
  // nos arquivos que renderizam cor de atribuição.
  const ATTRIBUTION_LITERALS = [
    // Execução Penal — azuis divergentes
    "#0284c7",
    "#0369a1",
    "#6A9EC5",
    "#1e3a8a",
    // Júri — verdes/emerald divergentes
    "#059669",
    "#047857",
    "#5CB87A",
    "#4ade80",
    "#86efac",
    "#166534",
    // VVD — amber divergentes
    "#b45309",
    "#D4A84A",
    "#fbbf24",
    "#78350f",
    // Grupo Júri / Substituição / Cível
    "#C48A50",
    "#9B84B8",
  ];

  // Arquivos cuja superfície de atribuição era 100% hex/borda local. Devem
  // ficar livres de QUALQUER literal de cor de atribuição.
  const COLOR_LITERAL_FILES = [
    "src/components/shared/floating-demandas.tsx",
    "src/components/shared/floating-agenda.tsx",
    "src/components/cadastro/cadastro-mapa.tsx",
  ];

  it.each(COLOR_LITERAL_FILES)(
    "%s não contém literais de cor de atribuição divergentes",
    (rel) => {
      const src = read(rel);
      const found = ATTRIBUTION_LITERALS.filter((lit) => src.includes(lit));
      expect(
        found,
        `${rel} ainda contém literais de cor de atribuição: ${found.join(", ")}`,
      ).toEqual([]);
    },
  );

  it("dynamic-charts.tsx pinta atribuição via getAtribuicaoHex (registry), não map local", () => {
    const src = read("src/components/demandas-premium/dynamic-charts.tsx");
    // Sem paleta de atribuição local…
    expect(/\bconst\s+ATRIBUICAO_COLORS\b/.test(src)).toBe(false);
    // …e o gráfico de atribuições resolve a cor pelo registry.
    expect(src.includes("getAtribuicaoHex")).toBe(true);
    // Os azuis/verdes divergentes de atribuição (EP/Júri) saíram do arquivo.
    // (#5CB87A, #6A9EC5 etc. permanecem APENAS no bloco de situação prisional,
    //  que é outra dimensão — severidade prisional, fora do escopo de atribuição.)
    expect(src.includes('"Execução Penal": "#6A9EC5"')).toBe(false);
    expect(src.includes('"Tribunal do Júri": "#5CB87A"')).toBe(false);
  });

  it("beneficios/page.tsx não usa text-blue-600/bg-blue-600 como cor de atribuição (Execução Penal)", () => {
    const src = read("src/app/(dashboard)/admin/beneficios/page.tsx");
    // `requerido`/`Requeridos` mapeavam Execução Penal para text-blue-600.
    // Após consolidação, a cor de atribuição (azul EP) vem do registry.
    expect(/text-blue-600/.test(src)).toBe(false);
    expect(/bg-blue-600/.test(src)).toBe(false);
  });

  it("case-card.tsx não declara paleta de atribuição local", () => {
    const src = read("src/components/casos/case-card.tsx");
    expect(/\bconst\s+ATRIBUICAO_COLORS\b/.test(src)).toBe(false);
  });
});

describe("F1: registry consistente — Execução Penal resolve para um único hex", () => {
  it("SOLID_COLOR_MAP tem o mesmo hex para todas as chaves de Execução Penal", () => {
    const canonical = SOLID_COLOR_MAP.EXECUCAO_PENAL;
    expect(canonical).toBe("#60a5fa");
    expect(SOLID_COLOR_MAP.EXECUCAO).toBe(canonical);
    expect(SOLID_COLOR_MAP["Execução Penal"]).toBe(canonical);
  });

  it("getAtribuicaoHex deriva do MESMO source (SOLID_COLOR_MAP)", () => {
    expect(getAtribuicaoHex("EXECUCAO_PENAL")).toBe(SOLID_COLOR_MAP.EXECUCAO_PENAL);
    expect(getAtribuicaoHex("EXECUCAO")).toBe(SOLID_COLOR_MAP.EXECUCAO_PENAL);
    expect(getAtribuicaoHex("Execução Penal")).toBe(SOLID_COLOR_MAP.EXECUCAO_PENAL);
    expect(getAtribuicaoHex("JURI")).toBe(SOLID_COLOR_MAP.JURI);
    expect(getAtribuicaoHex("VVD")).toBe(SOLID_COLOR_MAP.VVD);
    // fallback estável (cor "all") para chave desconhecida ou nula
    expect(getAtribuicaoHex("DESCONHECIDA")).toBe(SOLID_COLOR_MAP.all);
    expect(getAtribuicaoHex(null)).toBe(SOLID_COLOR_MAP.all);
  });
});
