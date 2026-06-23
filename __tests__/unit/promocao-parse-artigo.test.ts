import { describe, it, expect } from "vitest";
import { parseArtigo } from "@/lib/promocao/parse-artigo";

describe("parseArtigo", () => {
  it("número só → CP, artigo, sem paragrafo/inciso", () => {
    expect(parseArtigo("121")).toEqual({
      codigoLei: "CP",
      artigo: "121",
      paragrafo: null,
      inciso: null,
    });
  });

  it("artigo + paragrafo com vírgula → '121, §2º'", () => {
    expect(parseArtigo("121, §2º")).toEqual({
      codigoLei: "CP",
      artigo: "121",
      paragrafo: "§2º",
      inciso: null,
    });
  });

  it("artigo + paragrafo + inciso → '121 §2º II'", () => {
    expect(parseArtigo("121 §2º II")).toEqual({
      codigoLei: "CP",
      artigo: "121",
      paragrafo: "§2º",
      inciso: "II",
    });
  });

  it("prefixo 'art.' → 'art. 33'", () => {
    expect(parseArtigo("art. 33")).toEqual({
      codigoLei: "CP",
      artigo: "33",
      paragrafo: null,
      inciso: null,
    });
  });

  it("lei especial + art + paragrafo → '11.343 art. 33 §4º'", () => {
    expect(parseArtigo("11.343 art. 33 §4º")).toEqual({
      codigoLei: "11.343",
      artigo: "33",
      paragrafo: "§4º",
      inciso: null,
    });
  });

  it("'caput' vira paragrafo='caput'", () => {
    expect(parseArtigo("129 caput")).toEqual({
      codigoLei: "CP",
      artigo: "129",
      paragrafo: "caput",
      inciso: null,
    });
  });

  it("paragrafo sem símbolo é normalizado para §Nº ('121 §2')", () => {
    expect(parseArtigo("121 §2")).toEqual({
      codigoLei: "CP",
      artigo: "121",
      paragrafo: "§2º",
      inciso: null,
    });
  });

  it("paragrafo escrito 'paragrafo 2' / 'par. 2' normaliza para §2º", () => {
    expect(parseArtigo("121 par. 2").paragrafo).toBe("§2º");
    expect(parseArtigo("121 parágrafo 2").paragrafo).toBe("§2º");
  });

  it("artigo com letra (217-A) preservado", () => {
    expect(parseArtigo("217-A")).toEqual({
      codigoLei: "CP",
      artigo: "217-A",
      paragrafo: null,
      inciso: null,
    });
  });

  it("paragrafo com letra (§2º-A feminicídio)", () => {
    expect(parseArtigo("121 §2º-A")).toEqual({
      codigoLei: "CP",
      artigo: "121",
      paragrafo: "§2º-A",
      inciso: null,
    });
  });

  it("lei especial sem prefixo art → '11.343, 33'", () => {
    expect(parseArtigo("11.343, 33")).toEqual({
      codigoLei: "11.343",
      artigo: "33",
      paragrafo: null,
      inciso: null,
    });
  });

  it("'CP art. 155 §4º' (código explícito 'CP')", () => {
    expect(parseArtigo("CP art. 155 §4º")).toEqual({
      codigoLei: "CP",
      artigo: "155",
      paragrafo: "§4º",
      inciso: null,
    });
  });

  it("vazio/nulo → artigo vazio, CP default", () => {
    expect(parseArtigo("")).toEqual({
      codigoLei: "CP",
      artigo: "",
      paragrafo: null,
      inciso: null,
    });
    expect(parseArtigo("   ")).toEqual({
      codigoLei: "CP",
      artigo: "",
      paragrafo: null,
      inciso: null,
    });
  });

  it("inciso romano em minúsculas é normalizado para maiúsculas", () => {
    expect(parseArtigo("121 §2º iv").inciso).toBe("IV");
  });

  it("'inc. III' prefixo de inciso reconhecido", () => {
    expect(parseArtigo("155 §4º inc. III").inciso).toBe("III");
  });

  it("artigo de lei especial com letra (24-A da 11.340)", () => {
    expect(parseArtigo("11.340 art. 24-A")).toEqual({
      codigoLei: "11.340",
      artigo: "24-A",
      paragrafo: null,
      inciso: null,
    });
  });
});
