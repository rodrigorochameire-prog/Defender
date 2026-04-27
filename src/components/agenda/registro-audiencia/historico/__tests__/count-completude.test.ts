import { describe, it, expect } from "vitest";
import { countCompletude, getCompletudeBreakdown } from "../count-completude";

describe("countCompletude", () => {
  it("retorna 0 para registro vazio", () => {
    expect(countCompletude({})).toBe(0);
  });

  it("conta 5 quando todos campos preenchidos", () => {
    expect(
      countCompletude(
        {
          resultado: "audiencia realizada",
          assistidoCompareceu: true,
          anotacoesGerais: "ok",
          depoentes: [{}],
        },
        "realizada",
      ),
    ).toBe(5);
  });
});

describe("getCompletudeBreakdown", () => {
  it("marca todas empty para registro vazio", () => {
    const r = getCompletudeBreakdown({ depoentes: [] }, undefined);
    expect(r.filled).toBe(0);
    expect(r.total).toBe(5);
    expect(r.byTab.briefing).toBe("empty");
    expect(r.byTab.depoentes).toBe("empty");
    expect(r.byTab.anotacoes).toBe("empty");
    expect(r.byTab.resultado).toBe("empty");
    expect(r.byTab.historico).toBe("empty");
  });

  it("marca briefing full quando imputacao e fatos existem", () => {
    const r = getCompletudeBreakdown(
      { depoentes: [] },
      undefined,
      { imputacao: "art 121", fatos: "narrativa" },
    );
    expect(r.byTab.briefing).toBe("full");
  });

  it("marca briefing partial quando só imputacao existe", () => {
    const r = getCompletudeBreakdown(
      { depoentes: [] },
      undefined,
      { imputacao: "art 121" },
    );
    expect(r.byTab.briefing).toBe("partial");
  });

  it("marca depoentes full quando todos têm tipo", () => {
    const r = getCompletudeBreakdown(
      { depoentes: [{ nome: "A", tipo: "TESTEMUNHA" }, { nome: "B", tipo: "VITIMA" }] },
      undefined,
    );
    expect(r.byTab.depoentes).toBe("full");
  });

  it("marca depoentes partial quando algum sem tipo", () => {
    const r = getCompletudeBreakdown(
      { depoentes: [{ nome: "A", tipo: "TESTEMUNHA" }, { nome: "B" }] },
      undefined,
    );
    expect(r.byTab.depoentes).toBe("partial");
  });

  it("marca anotacoes full quando anotacoesGerais preenchida", () => {
    const r = getCompletudeBreakdown(
      { anotacoesGerais: "algo", depoentes: [] },
      undefined,
    );
    expect(r.byTab.anotacoes).toBe("full");
  });

  it("marca resultado full quando statusAudiencia é realizada", () => {
    const r = getCompletudeBreakdown({ depoentes: [] }, "realizada");
    expect(r.byTab.resultado).toBe("full");
  });

  it("marca resultado empty para status pendente ou undefined", () => {
    expect(getCompletudeBreakdown({ depoentes: [] }, "pendente").byTab.resultado).toBe("empty");
    expect(getCompletudeBreakdown({ depoentes: [] }, undefined).byTab.resultado).toBe("empty");
  });

  it("marca historico full quando hasRegistroSalvo true", () => {
    const r = getCompletudeBreakdown({ depoentes: [] }, undefined, undefined, true);
    expect(r.byTab.historico).toBe("full");
  });
});
