import { describe, it, expect } from "vitest";
import { TIPO_LABELS, tipoLabel, statusLabel, TIPO_OPTIONS } from "@/lib/vida-funcional/labels";

const ALL_TIPOS = [
  "POSSE","PROMOCAO","REMOCAO","TITULARIDADE","ACUMULO","DESIGNACAO_RELEVANTE","CONVOCACAO",
  "FERIAS","LICENCA","AFASTAMENTO","COOPERACAO","OUTRA_AUSENCIA","DIARIA","FOLGA","TRABALHO_EXTRAORDINARIO",
  "SUBSTITUICAO","GRATIFICACAO","REEMBOLSO","SOLICITACAO_ADM",
];

describe("labels", () => {
  it("todo tipo tem rótulo não-vazio e único", () => {
    const seen = new Set<string>();
    for (const t of ALL_TIPOS) {
      const l = (TIPO_LABELS as Record<string, string>)[t];
      expect(l, t).toBeTruthy();
      expect(seen.has(l)).toBe(false);
      seen.add(l);
    }
  });
  it("TIPO_OPTIONS cobre todos os 19 tipos", () => {
    expect(TIPO_OPTIONS).toHaveLength(19);
    expect(TIPO_OPTIONS.map((o) => o.value).sort()).toEqual([...ALL_TIPOS].sort());
  });
  it("tipoLabel faz fallback p/ o próprio valor se desconhecido", () => {
    expect(tipoLabel("PROMOCAO")).toBe(TIPO_LABELS.PROMOCAO);
    expect(tipoLabel("XPTO")).toBe("XPTO");
  });
  it("statusLabel traduz os status conhecidos", () => {
    expect(statusLabel("previsto")).toBeTruthy();
    expect(statusLabel("concluido")).toBeTruthy();
  });
});
