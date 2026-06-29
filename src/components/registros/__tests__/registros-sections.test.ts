// src/components/registros/__tests__/registros-sections.test.ts
import { describe, it, expect } from "vitest";
import { splitRegistros, type RegistroLike } from "../registros-sections";

const reg = (o: Partial<RegistroLike>): RegistroLike => ({
  id: 1, tipo: "anotacao", status: "realizado", prazo: null,
  dataRegistro: "2026-06-26T12:00:00Z", titulo: null, conteudo: "x", ...o,
});

describe("splitRegistros", () => {
  it("pins open diligências (status=agendado) as pendências, sorted by prazo asc, nulls last", () => {
    const r = splitRegistros([
      reg({ id: 1, tipo: "diligencia", status: "agendado", prazo: "2026-07-20" }),
      reg({ id: 2, tipo: "diligencia", status: "agendado", prazo: "2026-07-11" }),
      reg({ id: 3, tipo: "diligencia", status: "agendado", prazo: null }),
      reg({ id: 4, tipo: "ciencia", status: "realizado" }),
    ]);
    expect(r.pendencias.map((x) => x.id)).toEqual([2, 1, 3]);
  });
  it("excludes realizado diligências from pendências", () => {
    const r = splitRegistros([reg({ id: 9, tipo: "diligencia", status: "realizado", prazo: "2026-07-01" })]);
    expect(r.pendencias).toHaveLength(0);
    expect(r.historico).toHaveLength(1);
  });
  it("groups histórico by calendar day, newest day first", () => {
    const r = splitRegistros([
      reg({ id: 1, dataRegistro: "2026-06-29T09:00:00Z" }),
      reg({ id: 2, dataRegistro: "2026-06-26T09:00:00Z" }),
      reg({ id: 3, dataRegistro: "2026-06-29T15:00:00Z" }),
    ]);
    expect(r.historico.map((g) => g.dayKey)).toEqual(["2026-06-29", "2026-06-26"]);
    expect(r.historico[0].registros.map((x) => x.id)).toEqual([3, 1]); // newest first within day
  });
});
