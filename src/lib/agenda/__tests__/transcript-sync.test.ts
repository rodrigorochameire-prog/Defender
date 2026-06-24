import { describe, it, expect } from "vitest";
import { segmentoAtivo } from "../transcript-sync";

// Cada fixture imita um segmento do whisper (jsonb `depoimento_segments`):
// { start, end, text } em segundos. `segmentoAtivo` retorna o índice do
// segmento que contém o tempo `t` (intervalo [start, end)), ou -1.
const segs = [
  { start: 0, end: 3, text: "Bom dia, doutor." }, // idx 0
  { start: 3, end: 7.5, text: "Eu estava em casa." }, // idx 1
  { start: 10, end: 14, text: "Depois ouvi um barulho." }, // idx 2 (gap 7.5→10)
];

describe("segmentoAtivo", () => {
  it("retorna o índice no exato start do segmento (limite inferior inclusivo)", () => {
    expect(segmentoAtivo(segs, 0)).toBe(0);
    expect(segmentoAtivo(segs, 3)).toBe(1);
    expect(segmentoAtivo(segs, 10)).toBe(2);
  });

  it("retorna o índice no meio do segmento", () => {
    expect(segmentoAtivo(segs, 1.5)).toBe(0);
    expect(segmentoAtivo(segs, 5)).toBe(1);
    expect(segmentoAtivo(segs, 12)).toBe(2);
  });

  it("retorna -1 quando t cai num gap entre segmentos", () => {
    expect(segmentoAtivo(segs, 8)).toBe(-1); // 7.5 → 10 é gap
    expect(segmentoAtivo(segs, 9.99)).toBe(-1);
  });

  it("retorna -1 antes do primeiro segmento", () => {
    expect(segmentoAtivo(segs, -1)).toBe(-1);
  });

  it("retorna -1 depois do último segmento (end exclusivo)", () => {
    expect(segmentoAtivo(segs, 14)).toBe(-1); // end exclusivo
    expect(segmentoAtivo(segs, 99)).toBe(-1);
  });

  it("retorna -1 para lista vazia", () => {
    expect(segmentoAtivo([], 1)).toBe(-1);
  });

  it("lida defensivamente com segmentos fora de ordem", () => {
    const fora = [
      { start: 10, end: 14, text: "c" },
      { start: 0, end: 3, text: "a" },
      { start: 3, end: 7.5, text: "b" },
    ];
    expect(segmentoAtivo(fora, 1)).toBe(1); // índice original do segmento [0,3)
    expect(segmentoAtivo(fora, 12)).toBe(0); // índice original do segmento [10,14)
    expect(segmentoAtivo(fora, 8)).toBe(-1); // gap
  });

  it("ignora segmentos com tempos inválidos (NaN/invertidos) sem casar", () => {
    const ruins = [
      { start: Number.NaN, end: 5, text: "x" },
      { start: 8, end: 4, text: "y" }, // end < start
    ];
    expect(segmentoAtivo(ruins, 3)).toBe(-1);
    expect(segmentoAtivo(ruins, 6)).toBe(-1);
  });
});
