import { describe, it, expect } from "vitest";
import { buildActiveFilterChips, hasActiveFilters } from "@/components/demandas-premium/active-filters";

describe("active-filters · buildActiveFilterChips", () => {
  it("sem filtros → nenhum chip", () => {
    expect(buildActiveFilterChips({})).toEqual([]);
    expect(buildActiveFilterChips({ searchTerm: "  ", atribuicoes: [] })).toEqual([]);
    expect(hasActiveFilters({})).toBe(false);
  });

  it("busca vira chip com aspas e key 'search'", () => {
    const chips = buildActiveFilterChips({ searchTerm: "  joão  " });
    expect(chips).toEqual([{ key: "search", label: '"joão"' }]);
    expect(hasActiveFilters({ searchTerm: "x" })).toBe(true);
  });

  it("um chip por atribuição, com key atrib:<valor> para clear individual", () => {
    const chips = buildActiveFilterChips({ atribuicoes: ["JURI", "VVD"] });
    expect(chips.map((c) => c.key)).toEqual(["atrib:JURI", "atrib:VVD"]);
  });

  it("mapeia rótulo de prazo conhecido; passa cru o desconhecido", () => {
    expect(buildActiveFilterChips({ prazo: "atrasados" })[0].label).toBe("Atrasados");
    expect(buildActiveFilterChips({ prazo: "reu_preso" })[0].label).toBe("Réu preso");
    expect(buildActiveFilterChips({ prazo: "xpto" })[0]).toEqual({ key: "prazo", label: "xpto" });
  });

  it("usa resolvers de rótulo quando fornecidos (status/atribuição/prisional)", () => {
    const chips = buildActiveFilterChips(
      { statusGroup: "diligencias", atribuicoes: ["JURI"], estadoPrisional: "preso" },
      {
        statusLabel: (g) => (g === "diligencias" ? "Diligências" : g),
        atribLabel: (a) => (a === "JURI" ? "Tribunal do Júri" : a),
        prisionalLabel: (e) => (e === "preso" ? "Preso" : e),
      },
    );
    const byKey = Object.fromEntries(chips.map((c) => [c.key, c.label]));
    expect(byKey.status).toBe("Diligências");
    expect(byKey["atrib:JURI"]).toBe("Tribunal do Júri");
    expect(byKey.prisional).toBe("Preso");
  });

  it("inclui tipoAto e tipoProcesso com keys próprias", () => {
    const chips = buildActiveFilterChips({ tipoAto: "Manifestação", tipoProcesso: "AP" });
    const byKey = Object.fromEntries(chips.map((c) => [c.key, c.label]));
    expect(byKey.ato).toBe("Manifestação");
    expect(byKey.tipoProc).toBe("AP");
  });

  it("ordem: busca → status → atribuições → prazo → prisional → ato → tipoProc", () => {
    const chips = buildActiveFilterChips({
      searchTerm: "x", statusGroup: "triagem", atribuicoes: ["A"], prazo: "hoje",
      estadoPrisional: "solto", tipoAto: "ato", tipoProcesso: "AP",
    });
    expect(chips.map((c) => c.key)).toEqual(["search", "status", "atrib:A", "prazo", "prisional", "ato", "tipoProc"]);
  });

  it("adiciona chips dos pills (cockpit) com key pill:<k> ao final", () => {
    const chips = buildActiveFilterChips({ pills: [{ key: "atrasados", label: "Atrasados" }, { key: "reu_preso", label: "Réu preso" }] });
    expect(chips.map((c) => c.key)).toEqual(["pill:atrasados", "pill:reu_preso"]);
    expect(chips[0].label).toBe("Atrasados");
  });
});
