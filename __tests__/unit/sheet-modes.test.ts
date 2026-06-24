import { describe, it, expect } from "vitest";
import { buildSheetModes, SHEET_MODES } from "@/components/demandas-premium/sheet/sheet-modes";
import type { SecoesMap, SecaoId } from "@/components/demandas-premium/sheet/secoes-manifest";

// Fixture: monta um SecoesMap com controle de temDado/count por seção.
function makeMap(over: Partial<Record<SecaoId, { temDado?: boolean; count?: number }>> = {}): SecoesMap {
  const ids: SecaoId[] = ["registros", "proxima-audiencia", "identificacao", "cronologia", "oficio", "autos", "recursos"];
  const map = {} as SecoesMap;
  for (const id of ids) {
    map[id] = {
      label: id,
      temDado: over[id]?.temDado ?? true,
      count: over[id]?.count,
      node: null,
    };
  }
  return map;
}

describe("sheet-modes · buildSheetModes", () => {
  it("sempre retorna os 4 modos na ordem fixa (nav estável)", () => {
    const modes = buildSheetModes(makeMap());
    expect(modes.map((m) => m.key)).toEqual(["registros", "dados", "autos", "producao"]);
    expect(modes.map((m) => m.label)).toEqual(["Registros", "Dados", "Autos", "Produção"]);
  });

  it("agrupa as seções certas em cada modo quando todas têm dado", () => {
    const modes = buildSheetModes(makeMap());
    const by = Object.fromEntries(modes.map((m) => [m.key, m.secoes]));
    expect(by.registros).toEqual(["registros"]);
    expect(by.dados).toEqual(["proxima-audiencia", "identificacao", "cronologia"]);
    expect(by.autos).toEqual(["autos", "recursos"]);
    expect(by.producao).toEqual(["oficio"]);
  });

  it("filtra seções sem dado dentro do modo, mas mantém o modo presente", () => {
    const modes = buildSheetModes(makeMap({ "proxima-audiencia": { temDado: false }, recursos: { temDado: false } }));
    const dados = modes.find((m) => m.key === "dados")!;
    const autos = modes.find((m) => m.key === "autos")!;
    expect(dados.secoes).toEqual(["identificacao", "cronologia"]); // sem proxima-audiencia
    expect(autos.secoes).toEqual(["autos"]); // sem recursos
    expect(modes).toHaveLength(4); // nav continua com 4 abas
  });

  it("soma os counts das seções visíveis no badge do modo", () => {
    const modes = buildSheetModes(makeMap({ registros: { count: 3 }, autos: { count: 2 }, recursos: { count: 5 } }));
    expect(modes.find((m) => m.key === "registros")!.count).toBe(3);
    expect(modes.find((m) => m.key === "autos")!.count).toBe(7); // 2 + 5
    expect(modes.find((m) => m.key === "dados")!.count).toBeUndefined(); // sem counts → undefined
  });

  it("SHEET_MODES cobre todas as 7 seções do manifesto sem repetir", () => {
    const todas = SHEET_MODES.flatMap((m) => m.secoes);
    expect(new Set(todas).size).toBe(todas.length); // sem duplicata
    // recursos/autos/oficio/registros/identificacao/cronologia/proxima-audiencia = 7
    expect(new Set(todas)).toEqual(
      new Set(["registros", "proxima-audiencia", "identificacao", "cronologia", "autos", "recursos", "oficio"]),
    );
  });
});
