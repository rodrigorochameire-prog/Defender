import { describe, it, expect } from "vitest";
import { ATENDIMENTO_MODOS, modeFilters } from "../atendimento-modos";

describe("ATENDIMENTO_MODOS — segmentação semântica estável", () => {
  it("ordem fixa: geral · a_registrar · agenda · historico", () => {
    expect(ATENDIMENTO_MODOS.map((m) => m.key)).toEqual(["geral", "a_registrar", "agenda", "historico"]);
  });

  it("rótulos legíveis", () => {
    const byKey = Object.fromEntries(ATENDIMENTO_MODOS.map((m) => [m.key, m.label]));
    expect(byKey.geral).toBe("Visão geral");
    expect(byKey.a_registrar).toBe("A registrar");
    expect(byKey.historico).toBe("Histórico");
  });
});

describe("modeFilters — cada modo deriva status + pendência", () => {
  it("geral = tudo, sem pendência forçada", () => {
    expect(modeFilters("geral")).toEqual({ status: "todos", apenasPendentes: false });
  });

  it("a_registrar = fila de pendência (status livre)", () => {
    expect(modeFilters("a_registrar")).toEqual({ status: "todos", apenasPendentes: true });
  });

  it("agenda = agendados (próximos)", () => {
    expect(modeFilters("agenda")).toEqual({ status: "agendado", apenasPendentes: false });
  });

  it("historico = realizados (passado)", () => {
    expect(modeFilters("historico")).toEqual({ status: "realizado", apenasPendentes: false });
  });

  it("só a_registrar liga apenasPendentes", () => {
    const ligados = ATENDIMENTO_MODOS.filter((m) => modeFilters(m.key).apenasPendentes).map((m) => m.key);
    expect(ligados).toEqual(["a_registrar"]);
  });
});
