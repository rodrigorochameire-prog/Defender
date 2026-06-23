import { describe, it, expect } from "vitest";
import { candidatosDeDepoentesLocais } from "@/lib/promocao/adaptador-depoentes-locais";

describe("candidatosDeDepoentesLocais", () => {
  it("lista vazia → []", () =>
    expect(candidatosDeDepoentesLocais(10, [])).toEqual([]));

  it("filtra testemunhas sem endereço (null/vazio/espaços)", () => {
    const out = candidatosDeDepoentesLocais(10, [
      { id: 1, nome: "A", endereco: null },
      { id: 2, nome: "B", endereco: "" },
      { id: 3, nome: "C", endereco: "   " },
      { id: 4, nome: "D", endereco: "Rua X, 10" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].enderecoCompleto).toBe("Rua X, 10");
  });

  it("mapeia para CandidatoLugar com tipo residencia-testemunha", () => {
    const out = candidatosDeDepoentesLocais(10, [
      { id: 7, nome: "Maria", endereco: "Rua A, 123, Centro" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      enderecoCompleto: "Rua A, 123, Centro",
      tipo: "residencia-testemunha",
      fonteRef: "depoentes_endereco:10",
      pessoaId: null,
    });
  });

  it("confiança ~0.75", () => {
    const out = candidatosDeDepoentesLocais(10, [
      { id: 1, nome: "A", endereco: "Rua A" },
    ]);
    expect(out[0].confianca).toBeCloseTo(0.75);
  });

  it("trim no endereço", () => {
    const out = candidatosDeDepoentesLocais(10, [
      { id: 1, nome: "A", endereco: "  Rua B, 1  " },
    ]);
    expect(out[0].enderecoCompleto).toBe("Rua B, 1");
  });

  it("fonteRef escopado por processoId", () => {
    const out = candidatosDeDepoentesLocais(99, [
      { id: 1, nome: "A", endereco: "Rua C" },
    ]);
    expect(out[0].fonteRef).toBe("depoentes_endereco:99");
  });

  it("bairro/cidade/uf/cep não inferidos do texto livre → null", () => {
    const out = candidatosDeDepoentesLocais(10, [
      { id: 1, nome: "A", endereco: "Rua D, 4" },
    ]);
    expect(out[0].bairro).toBeNull();
    expect(out[0].cidade).toBeNull();
    expect(out[0].uf).toBeNull();
    expect(out[0].cep).toBeNull();
    expect(out[0].latitude).toBeNull();
    expect(out[0].longitude).toBeNull();
  });

  it("endereço não-string (defensivo no boundary) é ignorado", () => {
    const out = candidatosDeDepoentesLocais(10, [
      { id: 1, nome: "A", endereco: 123 as unknown as string },
      { id: 2, nome: "B", endereco: "Rua E" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].enderecoCompleto).toBe("Rua E");
  });

  it("múltiplas testemunhas com endereço → um candidato cada", () => {
    const out = candidatosDeDepoentesLocais(5, [
      { id: 1, nome: "A", endereco: "Rua 1" },
      { id: 2, nome: "B", endereco: "Rua 2" },
    ]);
    expect(out.map((c) => c.enderecoCompleto)).toEqual(["Rua 1", "Rua 2"]);
    expect(out.every((c) => c.tipo === "residencia-testemunha")).toBe(true);
  });
});
