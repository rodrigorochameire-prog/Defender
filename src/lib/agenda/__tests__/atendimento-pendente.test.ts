import { describe, it, expect } from "vitest";
import { isAtendimentoPendente } from "../agenda-item-visual";

const NOW = new Date("2026-06-13T12:00:00-03:00");
const ev = (o: Partial<{ fonte: string; status: string; data: string; horarioInicio: string }>) => ({
  fonte: "registros", status: "agendado", data: "2026-06-12", horarioInicio: "10:00", ...o,
});

describe("isAtendimentoPendente", () => {
  it("registros + agendado + passado = pendente", () => {
    expect(isAtendimentoPendente(ev({}), NOW)).toBe(true);
  });
  it("agendado hoje mais cedo = pendente", () => {
    expect(isAtendimentoPendente(ev({ data: "2026-06-13", horarioInicio: "09:00" }), NOW)).toBe(true);
  });
  it("agendado no futuro != pendente", () => {
    expect(isAtendimentoPendente(ev({ data: "2026-06-14" }), NOW)).toBe(false);
  });
  it("realizado != pendente", () => {
    expect(isAtendimentoPendente(ev({ status: "realizado" }), NOW)).toBe(false);
  });
  it("audiência (fonte != registros) != pendente", () => {
    expect(isAtendimentoPendente(ev({ fonte: "audiencias" }), NOW)).toBe(false);
  });
  it("sem horário usa fim do dia (não pendente no próprio dia)", () => {
    expect(isAtendimentoPendente(ev({ data: "2026-06-13", horarioInicio: "" }), NOW)).toBe(false);
  });
});
