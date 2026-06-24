import { describe, it, expect } from "vitest";
import { kpisPreparacao } from "../kpis-preparacao";

const NOW = new Date("2026-06-24T12:00:00").getTime();
const inHours = (h: number) => new Date(NOW + h * 3600 * 1000).toISOString();

describe("kpisPreparacao", () => {
  it("conta total e quebra por status de preparo", () => {
    const k = kpisPreparacao(
      [
        { statusPrep: "completo", dataAudiencia: inHours(48) },
        { statusPrep: "parcial", dataAudiencia: inHours(48) },
        { statusPrep: "pendente", dataAudiencia: inHours(48) },
        { statusPrep: "pendente", dataAudiencia: inHours(48) },
      ],
      NOW
    );
    expect(k.total).toBe(4);
    expect(k.completos).toBe(1);
    expect(k.parciais).toBe(1);
    expect(k.pendentes).toBe(2);
  });

  it("conta próximas 24h (dentro da janela [now, now+24h])", () => {
    const k = kpisPreparacao(
      [
        { statusPrep: "pendente", dataAudiencia: inHours(2) },   // dentro
        { statusPrep: "pendente", dataAudiencia: inHours(23) },  // dentro
        { statusPrep: "pendente", dataAudiencia: inHours(30) },  // fora
        { statusPrep: "pendente", dataAudiencia: inHours(-2) },  // passado, fora
      ],
      NOW
    );
    expect(k.proximas24h).toBe(2);
  });

  it("lista vazia / não-array → zeros", () => {
    expect(kpisPreparacao([], NOW)).toEqual({ total: 0, completos: 0, parciais: 0, pendentes: 0, proximas24h: 0 });
    // @ts-expect-error robustez
    expect(kpisPreparacao(null, NOW).total).toBe(0);
  });

  it("ignora datas inválidas sem crash", () => {
    const k = kpisPreparacao([{ statusPrep: "pendente", dataAudiencia: "xpto" }], NOW);
    expect(k.proximas24h).toBe(0);
    expect(k.total).toBe(1);
  });
});
