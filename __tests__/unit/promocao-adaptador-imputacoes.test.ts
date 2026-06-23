import { describe, it, expect } from "vitest";
import { candidatosDeImputacoes } from "@/lib/promocao/adaptador-imputacoes";

describe("candidatosDeImputacoes", () => {
  it("null → []", () => expect(candidatosDeImputacoes(10, null)).toEqual([]));
  it("presente sem chave imputacoes → []", () =>
    expect(candidatosDeImputacoes(10, { faseAtual: "x" })).toEqual([]));
  it("imputacoes não-array → []", () =>
    expect(candidatosDeImputacoes(10, { imputacoes: "oops" })).toEqual([]));

  it("extrai crime + artigo + fonteRef", () => {
    const out = candidatosDeImputacoes(10, {
      imputacoes: [{ crime: "Homicídio qualificado", artigo: "121, §2º" }],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      crime: "Homicídio qualificado",
      artigoBruto: "121, §2º",
      fonteRef: "analysis:10",
      qualificadoras: [],
      majorantes: [],
      minorantes: [],
    });
    expect(out[0].confianca).toBeGreaterThan(0);
  });

  it("mapeia agravantes→majorantes e atenuantes→minorantes", () => {
    const out = candidatosDeImputacoes(10, {
      imputacoes: [
        {
          crime: "Roubo",
          artigo: "157",
          qualificadoras: ["concurso de pessoas"],
          agravantes: ["reincidência"],
          atenuantes: ["confissão"],
        },
      ],
    });
    expect(out[0].qualificadoras).toEqual(["concurso de pessoas"]);
    expect(out[0].majorantes).toEqual(["reincidência"]);
    expect(out[0].minorantes).toEqual(["confissão"]);
  });

  it("ignora imputações sem crime", () => {
    const out = candidatosDeImputacoes(10, {
      imputacoes: [{ artigo: "121" }, { crime: "  " }, { crime: "Furto", artigo: "155" }],
    });
    expect(out).toHaveLength(1);
    expect(out[0].crime).toBe("Furto");
  });

  it("artigo ausente → artigoBruto null", () => {
    const out = candidatosDeImputacoes(10, { imputacoes: [{ crime: "Desacato" }] });
    expect(out[0].artigoBruto).toBeNull();
  });

  it("campos jsonb defensivos (não-array → [])", () => {
    const out = candidatosDeImputacoes(10, {
      imputacoes: [{ crime: "X", artigo: "1", qualificadoras: "oops", agravantes: 5 }],
    });
    expect(out[0].qualificadoras).toEqual([]);
    expect(out[0].majorantes).toEqual([]);
  });

  it("observacoes propagadas quando string", () => {
    const out = candidatosDeImputacoes(10, {
      imputacoes: [{ crime: "X", observacoes: "tese fraca" }],
    });
    expect(out[0].observacoes).toBe("tese fraca");
  });
});
