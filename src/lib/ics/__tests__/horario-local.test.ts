import { describe, it, expect } from "vitest";
import { combinarDataHorario } from "../horario-local";

// sessoes_juri.data_sessao existe em TRÊS formatos no banco (verificado 11/06):
//   naive-local  "2026-06-09 08:30" + horario 08:30
//   true-UTC     "2026-06-09 11:30" (= 08:30 local) + horario null
//   meia-noite   "2026-06-10 03:00" (= 00:00 local) + horario 08:30
// A coluna horario é a fonte da verdade quando presente.

describe("combinarDataHorario", () => {
  it("usa a coluna horario sobre a data local derivada (naive-local)", () => {
    const d = combinarDataHorario(new Date("2026-06-09T08:30:00Z"), "08:30");
    expect(d.toISOString()).toBe("2026-06-09T11:30:00.000Z"); // 08:30 -03
  });

  it("meia-noite local + horario → dia certo, hora da coluna", () => {
    const d = combinarDataHorario(new Date("2026-06-10T03:00:00Z"), "08:30");
    expect(d.toISOString()).toBe("2026-06-10T11:30:00.000Z");
  });

  it("sem horario, true-UTC com hora plausível → mantém a hora derivada", () => {
    const d = combinarDataHorario(new Date("2026-06-09T11:30:00Z"), null);
    expect(d.toISOString()).toBe("2026-06-09T11:30:00.000Z"); // 08:30 local
  });

  it("sem horario e meia-noite local → fallback 08:30", () => {
    const d = combinarDataHorario(new Date("2026-06-10T03:00:00Z"), null);
    expect(d.toISOString()).toBe("2026-06-10T11:30:00.000Z");
  });

  it("audiência true-UTC com horario coerente segue igual", () => {
    const d = combinarDataHorario(new Date("2026-07-14T11:30:00Z"), "08:30");
    expect(d.toISOString()).toBe("2026-07-14T11:30:00.000Z");
  });
});
