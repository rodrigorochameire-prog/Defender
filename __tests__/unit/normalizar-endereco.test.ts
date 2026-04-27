import { describe, it, expect } from "vitest";
import { normalizarEndereco } from "@/lib/lugares/normalizar-endereco";

describe("normalizarEndereco", () => {
  it("abreviações básicas", () => {
    expect(normalizarEndereco("R. das Palmeiras, 123 - Centro")).toBe("rua das palmeiras 123 centro");
    expect(normalizarEndereco("Av. Principal 100")).toBe("avenida principal 100");
    expect(normalizarEndereco("Pça da Matriz, 10")).toBe("praca da matriz 10");
    expect(normalizarEndereco("Tv. do Saber, 5")).toBe("travessa do saber 5");
    expect(normalizarEndereco("Estr. Velha 2km")).toBe("estrada velha 2km");
    expect(normalizarEndereco("Al. dos Anjos 8")).toBe("alameda dos anjos 8");
  });

  it("remove 'nº', 'n.', 'n°'", () => {
    expect(normalizarEndereco("Rua X, nº 123")).toBe("rua x 123");
    expect(normalizarEndereco("Rua X n. 123")).toBe("rua x 123");
    expect(normalizarEndereco("Rua X n° 123")).toBe("rua x 123");
  });

  it("s/n preserva como sn", () => {
    expect(normalizarEndereco("Av. Joao Goulart S/N")).toBe("avenida joao goulart sn");
  });

  it("remove CEP", () => {
    expect(normalizarEndereco("Rua X 123, CEP 42800-000")).toBe("rua x 123");
    expect(normalizarEndereco("Rua X 123, 42800000")).toBe("rua x 123");
  });

  it("remove cidade default e UF terminal", () => {
    expect(normalizarEndereco("Rua X 123, Camaçari/BA")).toBe("rua x 123");
    expect(normalizarEndereco("Rua X 123, Camacari - BA")).toBe("rua x 123");
    expect(normalizarEndereco("Rua X 123, Camaçari, Bahia, Brasil")).toBe("rua x 123");
  });

  it("remove acentos", () => {
    expect(normalizarEndereco("Praça São João")).toBe("praca sao joao");
  });

  it("collapse espaços", () => {
    expect(normalizarEndereco("  Rua    X    123  ")).toBe("rua x 123");
  });

  it("duas formas do mesmo endereço geram mesma normalização", () => {
    const a = normalizarEndereco("R. das Palmeiras, 123 - Centro, Camaçari/BA");
    const b = normalizarEndereco("Rua das Palmeiras nº 123 - Centro");
    expect(a).toBe(b);
  });

  it("vazio retorna string vazia", () => {
    expect(normalizarEndereco("")).toBe("");
    expect(normalizarEndereco(null as any)).toBe("");
    expect(normalizarEndereco(undefined as any)).toBe("");
  });
});
