import { describe, it, expect } from "vitest";
import {
  detectRiscoRegressaoCadastral,
  detectSaidaTemporaria,
  detectLivramentoCondicional,
} from "@/lib/execucao/flags-beneficios";

const HOJE = new Date("2026-06-22T12:00:00");
const diasAtras = (n: number) =>
  new Date(HOJE.getTime() - n * 86400000).toISOString().slice(0, 10);

describe("detectRiscoRegressaoCadastral", () => {
  it("flag quando na comunidade e cadastro nunca confirmado", () => {
    const f = detectRiscoRegressaoCadastral(
      { situacao: "livramento-condicional", regimeAtual: "aberto", dataUltimaConfirmacaoCadastral: null },
      HOJE,
    );
    expect(f).toBeTruthy();
    expect(f!.nivel).toBe("amber");
  });

  it("red quando confirmação muito antiga (>120d)", () => {
    const f = detectRiscoRegressaoCadastral(
      { situacao: "monitoramento", regimeAtual: "aberto", dataUltimaConfirmacaoCadastral: diasAtras(150) },
      HOJE,
    );
    expect(f!.nivel).toBe("red");
  });

  it("não flag quando confirmação recente (30d)", () => {
    const f = detectRiscoRegressaoCadastral(
      { situacao: "monitoramento", regimeAtual: "aberto", dataUltimaConfirmacaoCadastral: diasAtras(30) },
      HOJE,
    );
    expect(f).toBeNull();
  });

  it("não flag em regime fechado (preso) — cadastro não é risco de regressão", () => {
    const f = detectRiscoRegressaoCadastral(
      { situacao: "preso", regimeAtual: "fechado", dataUltimaConfirmacaoCadastral: null },
      HOJE,
    );
    expect(f).toBeNull();
  });
});

describe("detectSaidaTemporaria", () => {
  const ok = { regimeAtual: "semiaberto", reincidente: false, hediondo: false, faltaGraveRecente: false };

  it("flag (emerald) primário em semiaberto com >1/6 cumprido", () => {
    const f = detectSaidaTemporaria({ ...ok, fracaoCumprida: 0.2 });
    expect(f).toBeTruthy();
    expect(f!.nivel).toBe("emerald");
  });

  it("não flag se abaixo de 1/6", () => {
    expect(detectSaidaTemporaria({ ...ok, fracaoCumprida: 0.1 })).toBeNull();
  });

  it("reincidente exige 1/4", () => {
    expect(detectSaidaTemporaria({ ...ok, reincidente: true, fracaoCumprida: 0.2 })).toBeNull();
    expect(detectSaidaTemporaria({ ...ok, reincidente: true, fracaoCumprida: 0.3 })).toBeTruthy();
  });

  it("não flag fora do semiaberto", () => {
    expect(detectSaidaTemporaria({ ...ok, regimeAtual: "fechado", fracaoCumprida: 0.5 })).toBeNull();
  });

  it("não flag se hediondo (conservador)", () => {
    expect(detectSaidaTemporaria({ ...ok, hediondo: true, fracaoCumprida: 0.5 })).toBeNull();
  });

  it("não flag com falta grave recente", () => {
    expect(detectSaidaTemporaria({ ...ok, faltaGraveRecente: true, fracaoCumprida: 0.5 })).toBeNull();
  });
});

describe("detectLivramentoCondicional", () => {
  const base = { reincidente: false, hediondo: false, faltaGraveRecente: false };

  it("primário não-hediondo: flag acima de 1/3", () => {
    expect(detectLivramentoCondicional({ ...base, fracaoCumprida: 0.4 })).toBeTruthy();
    expect(detectLivramentoCondicional({ ...base, fracaoCumprida: 0.3 })).toBeNull();
  });

  it("reincidente não-hediondo: exige 1/2", () => {
    expect(detectLivramentoCondicional({ ...base, reincidente: true, fracaoCumprida: 0.4 })).toBeNull();
    expect(detectLivramentoCondicional({ ...base, reincidente: true, fracaoCumprida: 0.6 })).toBeTruthy();
  });

  it("hediondo primário: exige 2/3", () => {
    expect(detectLivramentoCondicional({ ...base, hediondo: true, fracaoCumprida: 0.6 })).toBeNull();
    expect(detectLivramentoCondicional({ ...base, hediondo: true, fracaoCumprida: 0.7 })).toBeTruthy();
  });

  it("hediondo + reincidente: não flag (possível vedação do art. 83 V)", () => {
    expect(detectLivramentoCondicional({ ...base, hediondo: true, reincidente: true, fracaoCumprida: 0.9 })).toBeNull();
  });

  it("falta grave recente afasta o bom comportamento", () => {
    expect(detectLivramentoCondicional({ ...base, faltaGraveRecente: true, fracaoCumprida: 0.9 })).toBeNull();
  });
});
