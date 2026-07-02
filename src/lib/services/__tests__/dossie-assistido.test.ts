import { describe, it, expect } from "vitest";
import { buildDossieMarkdown } from "@/lib/services/dossie-assistido";

describe("buildDossieMarkdown", () => {
  it("vazio → ''", () => {
    expect(buildDossieMarkdown([], [])).toBe("");
    expect(buildDossieMarkdown([{ resumo: "" }], [""])).toBe("");
  });
  it("renderiza Drive + análises anteriores", () => {
    const d = buildDossieMarkdown(
      [{ titulo: "Denúncia", tipo: "peca", resumo: "MP imputa furto." }],
      ["Tese: insuficiência probatória."],
    );
    expect(d).toContain("Dossiê do assistido");
    expect(d).toContain("Denúncia");
    expect(d).toContain("MP imputa furto");
    expect(d).toContain("Análises anteriores");
    expect(d).toContain("insuficiência probatória");
  });
  it("resumo preferido; textoExtraido só como fallback e capado a 2000", () => {
    const comResumo = buildDossieMarkdown([{ titulo: "A", resumo: "R", textoExtraido: "X".repeat(3000) }], []);
    expect(comResumo).toContain("**A**: R");
    expect(comResumo).not.toContain("X".repeat(2001));
    const semResumo = buildDossieMarkdown([{ titulo: "B", textoExtraido: "Y".repeat(3000) }], []);
    expect(semResumo).toContain("Y".repeat(2000));
    expect(semResumo).not.toContain("Y".repeat(2001));
  });
  it("cap de 30 seções", () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ titulo: `doc${i}`, resumo: `r${i}` }));
    const d = buildDossieMarkdown(many, []);
    expect((d.match(/^- \*\*doc/gm) || []).length).toBe(30);
  });
  it("bound total 18000 com marcador", () => {
    const big = Array.from({ length: 30 }, (_, i) => ({ titulo: `d${i}`, resumo: "z".repeat(2000) }));
    const d = buildDossieMarkdown(big, []);
    expect(d.length).toBeLessThanOrEqual(18000 + 40);
    expect(d).toContain("[…dossiê truncado]");
  });
  it("null-safe", () => {
    expect(() => buildDossieMarkdown([{ titulo: null, resumo: null, textoExtraido: null }], [null as any])).not.toThrow();
  });
});
