import { describe, it, expect } from "vitest";
import { computeProduzirPecaState } from "./produzir-peca-state";

describe("computeProduzirPecaState", () => {
  it("estado inicial (nada rodou): tudo pendente, sem ação sem orquestrar", () => {
    const s = computeProduzirPecaState(null, null);
    expect(s.stages.map((x) => x.state)).toEqual(["pendente", "pendente", "pendente"]);
    expect(s.running).toBe(false);
    expect(s.done).toBe(false);
    expect(s.nextAction).toBe("nenhuma");
  });

  it("orquestrando do zero → inicia análise", () => {
    const s = computeProduzirPecaState(null, null, { orchestrating: true });
    expect(s.nextAction).toBe("iniciar-analise");
  });

  it("baixando autos: autos ativo, análise pendente, running", () => {
    const s = computeProduzirPecaState("baixando_autos", null, { orchestrating: true });
    expect(s.stages[0].state).toBe("ativo");
    expect(s.stages[1].state).toBe("pendente");
    expect(s.running).toBe(true);
    expect(s.nextAction).toBe("nenhuma"); // já em andamento
  });

  it("analisando: autos feito, análise ativo", () => {
    const s = computeProduzirPecaState("analisando", null, { orchestrating: true });
    expect(s.stages[0].state).toBe("feito");
    expect(s.stages[1].state).toBe("ativo");
    expect(s.nextAction).toBe("nenhuma");
  });

  it("análise concluída + orquestrando → dispara rascunho (encadeamento)", () => {
    const s = computeProduzirPecaState("concluida", null, { orchestrating: true });
    expect(s.stages[0].state).toBe("feito");
    expect(s.stages[1].state).toBe("feito");
    expect(s.stages[2].state).toBe("pendente");
    expect(s.nextAction).toBe("iniciar-rascunho");
  });

  it("análise concluída SEM orquestrar → não dispara nada", () => {
    const s = computeProduzirPecaState("concluida", null, { orchestrating: false });
    expect(s.nextAction).toBe("nenhuma");
  });

  it("rascunhando: rascunho ativo, running, sem re-disparar", () => {
    const s = computeProduzirPecaState("concluida", "rascunhando", { orchestrating: true });
    expect(s.stages[2].state).toBe("ativo");
    expect(s.running).toBe(true);
    expect(s.nextAction).toBe("nenhuma");
  });

  it("rascunho pronto: done, tudo feito, sem próxima ação", () => {
    const s = computeProduzirPecaState("concluida", "pronto", { orchestrating: true });
    expect(s.done).toBe(true);
    expect(s.stages.every((x) => x.state === "feito")).toBe(true);
    expect(s.nextAction).toBe("nenhuma");
  });

  it("erro na análise: failedStage=analise, marca estágio Analisar", () => {
    const s = computeProduzirPecaState("erro", null, { orchestrating: true });
    expect(s.failedStage).toBe("analise");
    expect(s.stages[1].state).toBe("erro");
    expect(s.nextAction).toBe("nenhuma"); // não auto-retry
  });

  it("erro no rascunho: failedStage=rascunho", () => {
    const s = computeProduzirPecaState("concluida", "erro", { orchestrating: true });
    expect(s.failedStage).toBe("rascunho");
    expect(s.stages[2].state).toBe("erro");
    expect(s.nextAction).toBe("nenhuma");
  });
});
