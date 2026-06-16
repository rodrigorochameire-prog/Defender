import { describe, it, expect } from "vitest";
import {
  SECOES_DEMANDA, resolverManifesto, toToCSections, type SecoesMap,
} from "../secoes-manifest";

describe("secoes-manifest", () => {
  it("resolverManifesto retorna a ordem default começando por registros", () => {
    expect(resolverManifesto()).toEqual(SECOES_DEMANDA);
    expect(SECOES_DEMANDA[0]).toBe("registros");
    expect(SECOES_DEMANDA).toContain("autos");
  });

  it("toToCSections filtra seções sem dado e mapeia label/count na ordem do manifesto", () => {
    const map: SecoesMap = {
      registros: { label: "Registros", temDado: true, count: 3, node: null },
      "proxima-audiencia": { label: "Próxima audiência", temDado: false, node: null },
      identificacao: { label: "Identificação", temDado: true, node: null },
      cronologia: { label: "Cronologia & Prazo", temDado: true, node: null },
      oficio: { label: "Ofício sugerido", temDado: false, node: null },
      autos: { label: "Autos & Documentos", temDado: false, node: null },
      recursos: { label: "Recursos", temDado: false, node: null },
    };
    const toc = toToCSections(SECOES_DEMANDA, map);
    expect(toc.map((s) => s.id)).toEqual(["registros", "identificacao", "cronologia"]);
    expect(toc[0]).toEqual({ id: "registros", label: "Registros", count: 3 });
  });
});
