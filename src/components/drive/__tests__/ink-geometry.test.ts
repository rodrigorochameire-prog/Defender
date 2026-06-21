import { describe, it, expect } from "vitest";
import {
  normalizePoint,
  denormalizePoint,
  simplify,
  toSvgPath,
  type Point,
} from "../ink-geometry";

describe("normalizePoint / denormalizePoint", () => {
  it("normaliza para [0,1] relativo ao tamanho", () => {
    expect(normalizePoint({ x: 50, y: 25 }, 100, 100)).toEqual([0.5, 0.25]);
    expect(normalizePoint({ x: 0, y: 0 }, 100, 100)).toEqual([0, 0]);
    expect(normalizePoint({ x: 100, y: 100 }, 100, 100)).toEqual([1, 1]);
  });

  it("faz clamp fora dos limites", () => {
    expect(normalizePoint({ x: -10, y: 200 }, 100, 100)).toEqual([0, 1]);
  });

  it("roundtrip normalize→denormalize ≈ identidade", () => {
    const p = { x: 37, y: 81 };
    const back = denormalizePoint(normalizePoint(p, 200, 300), 200, 300);
    expect(back.x).toBeCloseTo(37, 6);
    expect(back.y).toBeCloseTo(81, 6);
  });

  it("largura/altura zero não gera NaN", () => {
    expect(normalizePoint({ x: 10, y: 10 }, 0, 0)).toEqual([0, 0]);
  });
});

describe("simplify (Ramer–Douglas–Peucker)", () => {
  it("remove pontos colineares preservando extremos", () => {
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ];
    expect(simplify(line, 0.01)).toEqual([
      { x: 0, y: 0 },
      { x: 3, y: 0 },
    ]);
  });

  it("preserva vértice que desvia além do epsilon", () => {
    const v: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
    ];
    expect(simplify(v, 0.5)).toEqual(v);
  });

  it("retorna a entrada quando tem ≤ 2 pontos", () => {
    expect(simplify([], 1)).toEqual([]);
    const one = [{ x: 1, y: 1 }];
    expect(simplify(one, 1)).toEqual(one);
  });
});

describe("toSvgPath", () => {
  it("vazio → string vazia", () => {
    expect(toSvgPath([])).toBe("");
  });

  it("um ponto → moveto", () => {
    expect(toSvgPath([{ x: 3, y: 4 }])).toBe("M 3 4");
  });

  it("começa com M e contém os extremos", () => {
    const path = toSvgPath([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ]);
    expect(path.startsWith("M 0 0")).toBe(true);
    expect(path).toContain("20");
  });
});
