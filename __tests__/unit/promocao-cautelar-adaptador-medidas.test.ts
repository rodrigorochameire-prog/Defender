import { describe, it, expect } from "vitest";
import { candidatosDeMedidasCautelares } from "@/lib/promocao/adaptador-medidas-cautelares";

describe("candidatosDeMedidasCautelares", () => {
  it("null → []", () => expect(candidatosDeMedidasCautelares(10, null)).toEqual([]));
  it("sem chave pessoas → []", () =>
    expect(candidatosDeMedidasCautelares(10, { faseAtual: "x" })).toEqual([]));
  it("pessoas não-array → []", () =>
    expect(candidatosDeMedidasCautelares(10, { pessoas: "oops" })).toEqual([]));

  it("achata medidas de UMA pessoa", () => {
    const out = candidatosDeMedidasCautelares(10, {
      pessoas: [{ nome: "Fulano", medidasCautelares: ["Prisão preventiva", "Fiança"] }],
    });
    expect(out).toHaveLength(2);
    expect(out.map((c) => c.medida)).toEqual(["Prisão preventiva", "Fiança"]);
    expect(out[0]).toMatchObject({ fonteRef: "analysis:10" });
    expect(out[0].confianca).toBeGreaterThan(0);
  });

  it("achata medidas de VÁRIAS pessoas (flatten ALL)", () => {
    const out = candidatosDeMedidasCautelares(10, {
      pessoas: [
        { nome: "A", medidasCautelares: ["Monitoração eletrônica"] },
        { nome: "B", medidasCautelares: ["Comparecimento periódico", "Proibição de contato"] },
      ],
    });
    expect(out.map((c) => c.medida)).toEqual([
      "Monitoração eletrônica",
      "Comparecimento periódico",
      "Proibição de contato",
    ]);
  });

  it("pessoa sem medidasCautelares é ignorada", () => {
    const out = candidatosDeMedidasCautelares(10, {
      pessoas: [{ nome: "A" }, { nome: "B", medidasCautelares: ["Fiança"] }],
    });
    expect(out).toHaveLength(1);
    expect(out[0].medida).toBe("Fiança");
  });

  it("medidasCautelares não-array é ignorada (defensivo)", () => {
    const out = candidatosDeMedidasCautelares(10, {
      pessoas: [{ nome: "A", medidasCautelares: "oops" }, { nome: "B", medidasCautelares: ["X"] }],
    });
    expect(out).toHaveLength(1);
    expect(out[0].medida).toBe("X");
  });

  it("entradas não-string ou vazias são filtradas", () => {
    const out = candidatosDeMedidasCautelares(10, {
      pessoas: [{ nome: "A", medidasCautelares: ["  ", 5, null, "Fiança", ""] }],
    });
    expect(out.map((c) => c.medida)).toEqual(["Fiança"]);
  });

  it("trim aplicado à medida", () => {
    const out = candidatosDeMedidasCautelares(10, {
      pessoas: [{ nome: "A", medidasCautelares: ["  Fiança  "] }],
    });
    expect(out[0].medida).toBe("Fiança");
  });
});
