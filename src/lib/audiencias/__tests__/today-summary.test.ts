import { describe, it, expect } from "vitest";
import { summarizeToday, hearingsToday, type HearingLike } from "../today-summary";

const NOW = new Date("2026-06-25T09:00:00").getTime();
const h = (id: number, iso: string, extra: Partial<HearingLike> = {}): HearingLike => ({
  id,
  dataHora: iso,
  ...extra,
});

describe("summarizeToday", () => {
  it("counts only hearings that fall on the current day", () => {
    const list = [
      h(1, "2026-06-25T10:00:00"),
      h(2, "2026-06-25T14:00:00"),
      h(3, "2026-06-26T10:00:00"), // amanhã
      h(4, "2026-06-24T10:00:00"), // ontem
    ];
    expect(summarizeToday(list, NOW).count).toBe(2);
  });

  it("returns zero (and no label) when nothing is today", () => {
    const s = summarizeToday([h(1, "2026-06-26T10:00:00")], NOW);
    expect(s.count).toBe(0);
    expect(s.proximaLabel).toBeNull();
  });

  it("labels the next still-upcoming hearing of today", () => {
    const list = [
      h(1, "2026-06-25T08:00:00", { tipo: "CUSTODIA" }), // já passou (08h < 09h)
      h(2, "2026-06-25T14:00:00", { tipo: "AIJ", assistido: { nome: "Fulano" } }),
    ];
    const s = summarizeToday(list, NOW);
    expect(s.count).toBe(2);
    expect(s.proximaLabel).toContain("AIJ");
    expect(s.proximaLabel).toContain("Fulano");
    expect(s.proximaLabel).toContain("14:00");
  });

  it("prefers the explicit horario string when present", () => {
    const s = summarizeToday(
      [h(1, "2026-06-25T14:00:00", { tipo: "AIJ", horario: "14:30" })],
      NOW,
    );
    expect(s.proximaLabel).toContain("14:30");
  });

  it("falls back to the first of the day if all already passed", () => {
    const s = summarizeToday(
      [h(1, "2026-06-25T07:00:00", { tipo: "CUSTODIA" })],
      NOW,
    );
    expect(s.count).toBe(1);
    expect(s.proximaLabel).toContain("CUSTODIA");
  });

  it("tolerates null/invalid dates and empty input", () => {
    expect(summarizeToday(null, NOW).count).toBe(0);
    expect(summarizeToday([h(1, "not-a-date"), { id: 2, dataHora: null }], NOW).count).toBe(0);
  });
});

describe("hearingsToday", () => {
  it("returns today's hearings sorted by time, with processo id and upcoming flag", () => {
    const list = [
      h(1, "2026-06-25T14:00:00", { tipo: "AIJ", assistido: { nome: "Fulano" }, processo: { id: 99 } }),
      h(2, "2026-06-25T08:00:00", { tipo: "CUSTODIA" }), // já passou (08h < 09h NOW)
      h(3, "2026-06-26T10:00:00"), // amanhã — excluída
    ];
    const items = hearingsToday(list, NOW);
    expect(items.map((i) => i.id)).toEqual([2, 1]); // ordenado por hora
    expect(items[0].upcoming).toBe(false);
    expect(items[1]).toMatchObject({ processoId: 99, tipo: "AIJ", assistidoNome: "Fulano", upcoming: true });
  });

  it("returns empty for no hearings today / null input", () => {
    expect(hearingsToday([h(1, "2026-06-26T10:00:00")], NOW)).toEqual([]);
    expect(hearingsToday(null, NOW)).toEqual([]);
  });
});
