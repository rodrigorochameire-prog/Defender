import { describe, it, expect } from "vitest";
import { parseProvidenciasCell, PROVIDENCIAS_MARKER } from "../registros-summary";

describe("parseProvidenciasCell", () => {
  it("returns null when cell empty", () => {
    expect(parseProvidenciasCell("").userNote).toBeNull();
    expect(parseProvidenciasCell(null).userNote).toBeNull();
    expect(parseProvidenciasCell(undefined).userNote).toBeNull();
  });

  it("returns null when only summary present (no marker yet)", () => {
    expect(parseProvidenciasCell("📋 Resumo:\n[29/04 Anot.] Foo").userNote).toBeNull();
  });

  it("returns null when below marker is empty", () => {
    const cell = `📋 Resumo (automático):\n(sem registros)\n\n${PROVIDENCIAS_MARKER}\n`;
    expect(parseProvidenciasCell(cell).userNote).toBeNull();
  });

  it("returns null when below marker only whitespace", () => {
    const cell = `📋 Resumo:\n[29/04 Anot.] Foo\n\n${PROVIDENCIAS_MARKER}\n   \n  \t`;
    expect(parseProvidenciasCell(cell).userNote).toBeNull();
  });

  it("captures user note below marker", () => {
    const cell = `📋 Resumo:\n[29/04 Anot.] Foo\n\n${PROVIDENCIAS_MARKER}\nLigar para advogada amanhã.`;
    expect(parseProvidenciasCell(cell).userNote).toBe("Ligar para advogada amanhã.");
  });

  it("captures multi-line user note", () => {
    const cell = `[29/04 Anot.] Foo\n\n${PROVIDENCIAS_MARKER}\nLinha 1\nLinha 2\n\nLinha 4`;
    expect(parseProvidenciasCell(cell).userNote).toBe("Linha 1\nLinha 2\n\nLinha 4");
  });
});
