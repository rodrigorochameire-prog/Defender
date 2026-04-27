import { describe, it, expect } from "vitest";
import { detectProgressaoIminente, detectIndultoAplicavel, detectLivramentoIminente } from "@/lib/execucao-penal/flags";

describe("detectProgressaoIminente", () => {
  it("retorna null quando data > 60d", () => {
    const futuro = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    expect(detectProgressaoIminente({ dataProgressaoPrevista: futuro })).toBeNull();
  });
  it("flag quando data ≤ 60d", () => {
    const futuro = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const f = detectProgressaoIminente({ dataProgressaoPrevista: futuro });
    expect(f).toBeTruthy();
    expect(f!.vencida).toBe(false);
  });
  it("flag vencida quando data passada", () => {
    const passado = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);
    const f = detectProgressaoIminente({ dataProgressaoPrevista: passado });
    expect(f).toBeTruthy();
    expect(f!.vencida).toBe(true);
  });
  it("retorna null se data ausente", () => {
    expect(detectProgressaoIminente({})).toBeNull();
  });
});

describe("detectLivramentoIminente", () => {
  it("retorna null quando data > 90d", () => {
    const futuro = new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10);
    expect(detectLivramentoIminente({ dataLivramentoPrevisto: futuro })).toBeNull();
  });
  it("flag quando data ≤ 90d", () => {
    const futuro = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
    const f = detectLivramentoIminente({ dataLivramentoPrevisto: futuro });
    expect(f).toBeTruthy();
    expect(f!.vencido).toBe(false);
  });
});

describe("detectIndultoAplicavel", () => {
  it("flag se ≥25% cumprido", () => {
    expect(detectIndultoAplicavel({ penaTotalDias: 1000, jaCumpridoDias: 300 })).toBeTruthy();
  });
  it("null se < 25%", () => {
    expect(detectIndultoAplicavel({ penaTotalDias: 1000, jaCumpridoDias: 100 })).toBeNull();
  });
  it("null se dados ausentes", () => {
    expect(detectIndultoAplicavel({})).toBeNull();
  });
  it("conta dias remidos no percentual", () => {
    // 200 cumprido + 100 remido = 300/1100 = 27% >= 25%
    expect(detectIndultoAplicavel({ penaTotalDias: 1000, jaCumpridoDias: 200, jaRemidoDias: 100 })).toBeTruthy();
  });
});
