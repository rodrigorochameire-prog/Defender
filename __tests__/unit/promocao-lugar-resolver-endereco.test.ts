import { describe, it, expect } from "vitest";
import { resolverEndereco } from "@/lib/promocao/resolver-endereco";
import type { CandidatoLugar, LugarExistente } from "@/lib/promocao/tipos-lugar";

const cand = (p: Partial<CandidatoLugar>): CandidatoLugar => ({
  enderecoCompleto: "Rua das Flores, 123, Centro",
  tipo: "local-do-fato",
  fonteRef: "analysis:1",
  confianca: 0.75,
  ...p,
});

describe("resolverEndereco", () => {
  it("endereço vazio → criar (motivo endereço ausente)", () => {
    const r = resolverEndereco(cand({ enderecoCompleto: "   " }), []);
    expect(r.acao).toBe("criar");
  });

  it("sem lugares existentes → criar", () => {
    const r = resolverEndereco(cand({}), []);
    expect(r.acao).toBe("criar");
    if (r.acao === "criar") expect(r.confianca).toBeCloseTo(0.75);
  });

  it("match exato por endereço normalizado → vincular 1.0", () => {
    const existentes: LugarExistente[] = [
      // normalização de "Rua das Flores, 123, Centro" → "rua das flores 123 centro"
      { id: 9, enderecoNormalizado: "rua das flores 123 centro" },
    ];
    const r = resolverEndereco(cand({}), existentes);
    expect(r).toMatchObject({ acao: "vincular", lugarId: 9 });
    if (r.acao === "vincular") expect(r.confianca).toBeCloseTo(1.0);
  });

  it("variação de formatação casa pelo normalizado (av. ↔ avenida, nº, cidade/UF removidas)", () => {
    // "Av. Sete, nº 500 - Camaçari/BA" → "avenida sete 500" (cidade e UF são removidas no pipeline)
    const existentes: LugarExistente[] = [
      { id: 4, enderecoNormalizado: "avenida sete 500" },
    ];
    const r = resolverEndereco(cand({ enderecoCompleto: "Av. Sete, nº 500 - Camaçari/BA" }), existentes);
    expect(r).toMatchObject({ acao: "vincular", lugarId: 4 });
  });

  it("endereço diferente → criar", () => {
    const existentes: LugarExistente[] = [
      { id: 1, enderecoNormalizado: "rua a 1" },
    ];
    const r = resolverEndereco(cand({ enderecoCompleto: "Rua B, 2" }), existentes);
    expect(r.acao).toBe("criar");
  });

  it("primeiro match vence quando há mais de um com mesmo normalizado", () => {
    const existentes: LugarExistente[] = [
      { id: 7, enderecoNormalizado: "rua das flores 123 centro" },
      { id: 8, enderecoNormalizado: "rua das flores 123 centro" },
    ];
    const r = resolverEndereco(cand({}), existentes);
    expect(r).toMatchObject({ acao: "vincular", lugarId: 7 });
  });

  it("normalizado vazio após pipeline → criar (não casa com lugares reais)", () => {
    // só cidade/UF → normaliza para "" ; não deve casar com nada e não casa "" entre si
    const existentes: LugarExistente[] = [
      { id: 1, enderecoNormalizado: "rua x 1" },
    ];
    const r = resolverEndereco(cand({ enderecoCompleto: "Camaçari/BA" }), existentes);
    expect(r.acao).toBe("criar");
  });
});
