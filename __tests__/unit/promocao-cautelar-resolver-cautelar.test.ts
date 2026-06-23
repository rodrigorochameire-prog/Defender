import { describe, it, expect } from "vitest";
import { resolverCautelar } from "@/lib/promocao/resolver-cautelar";
import type { CandidatoCautelar } from "@/lib/promocao/tipos-cautelar";

const cand = (medida: string): CandidatoCautelar => ({
  medida,
  fonteRef: "analysis:1",
  confianca: 0.75,
});

describe("resolverCautelar", () => {
  it("texto vazio → sem-correspondencia", () => {
    expect(resolverCautelar(cand("   ")).acao).toBe("sem-correspondencia");
  });

  it("'monitoração eletrônica' → vincular MONITORACAO_ELETRONICA", () => {
    const r = resolverCautelar(cand("Monitoração eletrônica (tornozeleira)"));
    expect(r).toMatchObject({ acao: "vincular", codigo: "MONITORACAO_ELETRONICA", especie: "diversa" });
    if (r.acao === "vincular") expect(r.confianca).toBeCloseTo(0.75);
  });

  it("'tornozeleira' (gatilho alternativo) → MONITORACAO_ELETRONICA", () => {
    const r = resolverCautelar(cand("uso de tornozeleira"));
    expect(r).toMatchObject({ acao: "vincular", codigo: "MONITORACAO_ELETRONICA" });
  });

  it("'prisão preventiva' → vincular PRISAO_PREVENTIVA especie prisao", () => {
    const r = resolverCautelar(cand("Prisão preventiva decretada"));
    expect(r).toMatchObject({ acao: "vincular", codigo: "PRISAO_PREVENTIVA", especie: "prisao" });
  });

  it("'fiança' → vincular FIANCA com artigo 319, VIII", () => {
    const r = resolverCautelar(cand("Arbitrada fiança"));
    expect(r).toMatchObject({ acao: "vincular", codigo: "FIANCA", artigo: "319, VIII" });
  });

  it("'comparecimento periódico' → COMPARECIMENTO_PERIODICO", () => {
    const r = resolverCautelar(cand("comparecimento periódico em juízo"));
    expect(r).toMatchObject({ acao: "vincular", codigo: "COMPARECIMENTO_PERIODICO" });
  });

  it("case/acentos insensível (usa normalizar)", () => {
    const r = resolverCautelar(cand("PROIBIÇÃO DE MANTER CONTATO COM A VÍTIMA"));
    expect(r).toMatchObject({ acao: "vincular", codigo: "PROIBICAO_CONTATO" });
  });

  it("medida sem gatilho conhecido → sem-correspondencia", () => {
    const r = resolverCautelar(cand("obrigação totalmente atípica xyz"));
    expect(r.acao).toBe("sem-correspondencia");
  });

  it("prisão domiciliar vence recolhimento noturno (ordem do catálogo)", () => {
    const r = resolverCautelar(cand("prisão domiciliar"));
    expect(r).toMatchObject({ acao: "vincular", codigo: "PRISAO_DOMICILIAR" });
  });
});
