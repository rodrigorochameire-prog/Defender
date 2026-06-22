import { describe, it, expect } from "vitest";
import {
  isAnnotating,
  showFullToolbar,
  showCompactPalette,
  reconcileCollapsed,
  type AnnotationMode,
} from "../annotation-toolbar";

const MODES: AnnotationMode[] = ["none", "highlight", "underline", "note", "ink"];

describe("isAnnotating", () => {
  it("none é o único modo não-anotando", () => {
    expect(isAnnotating("none")).toBe(false);
    expect(isAnnotating("highlight")).toBe(true);
    expect(isAnnotating("underline")).toBe(true);
    expect(isAnnotating("note")).toBe(true);
    expect(isAnnotating("ink")).toBe(true);
  });
});

describe("showFullToolbar / showCompactPalette", () => {
  it("não mostra nada quando não está anotando", () => {
    expect(showFullToolbar("none", false)).toBe(false);
    expect(showCompactPalette("none", false)).toBe(false);
    expect(showFullToolbar("none", true)).toBe(false);
    expect(showCompactPalette("none", true)).toBe(false);
  });

  it("anotando e expandida → barra cheia", () => {
    expect(showFullToolbar("highlight", false)).toBe(true);
    expect(showCompactPalette("highlight", false)).toBe(false);
  });

  it("anotando e colapsada → pílula compacta (grifo segue ativo)", () => {
    expect(showFullToolbar("highlight", true)).toBe(false);
    expect(showCompactPalette("highlight", true)).toBe(true);
  });

  it("full e compact são mutuamente exclusivas em qualquer combinação", () => {
    for (const mode of MODES) {
      for (const collapsed of [true, false]) {
        const full = showFullToolbar(mode, collapsed);
        const compact = showCompactPalette(mode, collapsed);
        expect(full && compact).toBe(false);
      }
    }
  });
});

describe("reconcileCollapsed", () => {
  it("preserva o colapso enquanto está anotando (colapsar não muda o modo)", () => {
    expect(reconcileCollapsed("highlight", true)).toBe(true);
    expect(reconcileCollapsed("underline", false)).toBe(false);
    expect(reconcileCollapsed("note", true)).toBe(true);
  });

  it("força expandir ao sair da anotação (none)", () => {
    expect(reconcileCollapsed("none", true)).toBe(false);
    expect(reconcileCollapsed("none", false)).toBe(false);
  });
});
