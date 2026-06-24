import { describe, it, expect } from "vitest";
import { hexToRgba, statusChipStyle } from "@/components/demandas-premium/ds";

describe("hexToRgba", () => {
  it("converte hex com # para rgba", () => {
    expect(hexToRgba("#5CB87A", 0.12)).toBe("rgba(92, 184, 122, 0.12)");
  });

  it("aceita hex sem # (mesmo resultado)", () => {
    expect(hexToRgba("5CB87A", 0.3)).toBe("rgba(92, 184, 122, 0.3)");
  });

  it("respeita o alpha passado", () => {
    expect(hexToRgba("#000000", 1)).toBe("rgba(0, 0, 0, 1)");
    expect(hexToRgba("#ffffff", 0)).toBe("rgba(255, 255, 255, 0)");
  });
});

describe("statusChipStyle", () => {
  it("monta tint de fundo, cor cheia e borda discreta a partir de uma cor", () => {
    const s = statusChipStyle("#D4A84A");
    expect(s.backgroundColor).toBe("rgba(212, 168, 74, 0.12)");
    expect(s.color).toBe("#D4A84A");
    expect(s.border).toBe("1px solid rgba(212, 168, 74, 0.3)");
  });
});
