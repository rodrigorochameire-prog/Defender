import { describe, it, expect } from "vitest";
import {
  ATENDIMENTO_STATUS_CONFIG,
  resolveStatusAtendimento,
  statusAtendimentoInfo,
} from "@/lib/config/tipologia/atendimento";

const NOW = new Date("2026-06-24T12:00:00");
const PASSADO = "2026-06-20T09:00:00";
const FUTURO = "2026-06-28T09:00:00";

describe("resolveStatusAtendimento — status operacional (forte) prioriza pendência", () => {
  it('agendado no futuro permanece "agendado"', () => {
    expect(resolveStatusAtendimento({ status: "agendado", dataRegistro: FUTURO }, NOW)).toBe("agendado");
  });

  it('agendado vencido vira "a_registrar" (fila prioritária)', () => {
    expect(resolveStatusAtendimento({ status: "agendado", dataRegistro: PASSADO }, NOW)).toBe("a_registrar");
  });

  it("realizado e cancelado são preservados, mesmo no passado", () => {
    expect(resolveStatusAtendimento({ status: "realizado", dataRegistro: PASSADO }, NOW)).toBe("realizado");
    expect(resolveStatusAtendimento({ status: "cancelado", dataRegistro: PASSADO }, NOW)).toBe("cancelado");
  });

  it("status nulo cai no padrão agendado", () => {
    expect(resolveStatusAtendimento({ status: null, dataRegistro: FUTURO }, NOW)).toBe("agendado");
  });
});

describe("ATENDIMENTO_STATUS_CONFIG — cor só p/ pendência, falha e ação", () => {
  it("A registrar e Cancelado são fortes; Realizado e Agendado são contidos", () => {
    expect(ATENDIMENTO_STATUS_CONFIG.a_registrar.strength).toBe("strong");
    expect(ATENDIMENTO_STATUS_CONFIG.cancelado.strength).toBe("strong");
    expect(ATENDIMENTO_STATUS_CONFIG.realizado.strength).toBe("soft");
    expect(ATENDIMENTO_STATUS_CONFIG.agendado.strength).toBe("soft");
  });

  it("mapeia cada status ao tom semântico da spec", () => {
    expect(ATENDIMENTO_STATUS_CONFIG.a_registrar.tone).toBe("attention");
    expect(ATENDIMENTO_STATUS_CONFIG.cancelado.tone).toBe("danger");
    expect(ATENDIMENTO_STATUS_CONFIG.realizado.tone).toBe("positive");
    expect(ATENDIMENTO_STATUS_CONFIG.agendado.tone).toBe("neutral");
  });

  it("classes de badge usam a paleta esperada por tom", () => {
    expect(ATENDIMENTO_STATUS_CONFIG.a_registrar.badge).toMatch(/amber/);
    expect(ATENDIMENTO_STATUS_CONFIG.cancelado.badge).toMatch(/rose/);
    expect(ATENDIMENTO_STATUS_CONFIG.realizado.badge).toMatch(/emerald/);
    expect(ATENDIMENTO_STATUS_CONFIG.agendado.badge).toMatch(/sky|neutral/);
  });

  it("rótulos legíveis", () => {
    expect(ATENDIMENTO_STATUS_CONFIG.a_registrar.label).toBe("A registrar");
    expect(ATENDIMENTO_STATUS_CONFIG.realizado.label).toBe("Realizado");
  });
});

describe("statusAtendimentoInfo — resolve item → visual num passo", () => {
  it("item agendado vencido resolve para o visual de A registrar", () => {
    const info = statusAtendimentoInfo({ status: "agendado", dataRegistro: PASSADO }, NOW);
    expect(info.label).toBe("A registrar");
    expect(info.badge).toMatch(/amber/);
  });
});
