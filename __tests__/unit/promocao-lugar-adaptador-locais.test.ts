import { describe, it, expect } from "vitest";
import { candidatosDeLocais } from "@/lib/promocao/adaptador-analysis-locais";

describe("candidatosDeLocais", () => {
  it("null → []", () => expect(candidatosDeLocais(10, null)).toEqual([]));
  it("sem chave locais → []", () =>
    expect(candidatosDeLocais(10, { faseAtual: "x" })).toEqual([]));
  it("locais não-array → []", () =>
    expect(candidatosDeLocais(10, { locais: "oops" })).toEqual([]));

  it("extrai endereço + tipo mapeado + fonteRef", () => {
    const out = candidatosDeLocais(10, {
      locais: [{ tipo: "FATO", descricao: "Local do fato", endereco: "Rua A, 123" }],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      enderecoCompleto: "Rua A, 123",
      tipo: "local-do-fato",
      fonteRef: "analysis:10",
    });
    expect(out[0].confianca).toBeGreaterThan(0);
  });

  it("mapeia RESIDENCIA_DEFENDIDO → endereco-assistido", () => {
    const out = candidatosDeLocais(10, {
      locais: [{ tipo: "RESIDENCIA_DEFENDIDO", endereco: "Rua B, 1" }],
    });
    expect(out[0].tipo).toBe("endereco-assistido");
  });

  it("ignora locais sem endereço", () => {
    const out = candidatosDeLocais(10, {
      locais: [{ tipo: "FATO" }, { tipo: "OUTRO", endereco: "  " }, { tipo: "DELEGACIA", endereco: "Rua C, 3" }],
    });
    expect(out).toHaveLength(1);
    expect(out[0].enderecoCompleto).toBe("Rua C, 3");
  });

  it("propaga bairro/cidade/uf/cep quando strings", () => {
    const out = candidatosDeLocais(10, {
      locais: [{ tipo: "FATO", endereco: "Rua A", bairro: "Centro", cidade: "Camaçari", uf: "BA", cep: "42800-000" }],
    });
    expect(out[0]).toMatchObject({ bairro: "Centro", cidade: "Camaçari", uf: "BA", cep: "42800-000" });
  });

  it("extrai coordenadas lat/lng numéricas", () => {
    const out = candidatosDeLocais(10, {
      locais: [{ tipo: "FATO", endereco: "Rua A", coordenadas: { lat: -12.7, lng: -38.3 } }],
    });
    expect(out[0].latitude).toBeCloseTo(-12.7);
    expect(out[0].longitude).toBeCloseTo(-38.3);
  });

  it("coordenadas malformadas → lat/lng null (defensivo)", () => {
    const out = candidatosDeLocais(10, {
      locais: [{ tipo: "FATO", endereco: "Rua A", coordenadas: { lat: "x", lng: null } }],
    });
    expect(out[0].latitude).toBeNull();
    expect(out[0].longitude).toBeNull();
  });

  it("sem coordenadas → lat/lng null", () => {
    const out = candidatosDeLocais(10, { locais: [{ tipo: "FATO", endereco: "Rua A" }] });
    expect(out[0].latitude).toBeNull();
    expect(out[0].longitude).toBeNull();
  });

  it("campos opcionais ausentes → null", () => {
    const out = candidatosDeLocais(10, { locais: [{ tipo: "FATO", endereco: "Rua A" }] });
    expect(out[0].bairro).toBeNull();
    expect(out[0].cep).toBeNull();
  });
});
