import { describe, it, expect } from "vitest";
import { decidir } from "../dedup";

const mapped = { situacao: "gozada", dataInicio: "2026-07-01", dataFim: "2026-07-10", motivo: "LUTO" };

describe("decidir", () => {
  it("nova when nSiga absent or unseen", () => {
    expect(decidir({ nSiga: null, mapped }, new Map())).toEqual({ decisao: "nova", matchedAusenciaId: null });
    expect(decidir({ nSiga: "SG-1", mapped }, new Map())).toEqual({ decisao: "nova", matchedAusenciaId: null });
  });
  it("ja_importada when nSiga matches and fields equal", () => {
    const m = new Map([["SG-1", { id: 9, nSiga: "SG-1", situacao: "gozada", dataInicio: "2026-07-01", dataFim: "2026-07-10", motivo: "LUTO" }]]);
    expect(decidir({ nSiga: "SG-1", mapped }, m)).toEqual({ decisao: "ja_importada", matchedAusenciaId: 9 });
  });
  it("atualizada when nSiga matches but a field differs", () => {
    const m = new Map([["SG-1", { id: 9, nSiga: "SG-1", situacao: "solicitada", dataInicio: "2026-07-01", dataFim: "2026-07-10", motivo: "LUTO" }]]);
    expect(decidir({ nSiga: "SG-1", mapped }, m)).toEqual({ decisao: "atualizada", matchedAusenciaId: 9 });
  });
});
