import { describe, it, expect } from "vitest";
import {
  computePrisaoStatus,
  detectExcessoPrazoPreventiva,
  detectFlagranteSemCustodia,
} from "@/lib/cronologia/flags";

describe("computePrisaoStatus", () => {
  it("retorna null quando nenhuma prisão ativa", () => {
    expect(computePrisaoStatus([])).toBeNull();
    expect(computePrisaoStatus([{ tipo: "preventiva", dataInicio: "2025-01-01", dataFim: "2025-06-01", situacao: "relaxada" }])).toBeNull();
  });

  it("retorna status com diasPreso pra prisão ativa", () => {
    const res = computePrisaoStatus([
      { tipo: "preventiva", dataInicio: "2025-01-01", dataFim: null, situacao: "ativa" },
    ]);
    expect(res).toBeTruthy();
    expect(res!.tipo).toBe("preventiva");
    expect(res!.diasPreso).toBeGreaterThan(0);
  });
});

describe("detectExcessoPrazoPreventiva", () => {
  it("flag quando preventiva ativa há mais de 80 dias sem denúncia", () => {
    const fakeNow = new Date();
    const dataAntiga = new Date(fakeNow.getTime() - 90 * 86400000).toISOString().slice(0, 10);
    const flag = detectExcessoPrazoPreventiva(
      [{ tipo: "preventiva", dataInicio: dataAntiga, dataFim: null, situacao: "ativa" }],
      [],  // sem marco de denúncia
    );
    expect(flag).toBeTruthy();
    expect(flag!.diasExcedidos).toBeGreaterThanOrEqual(10);
  });

  it("não flag quando preventiva ativa há 30 dias", () => {
    const recentDate = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const flag = detectExcessoPrazoPreventiva(
      [{ tipo: "preventiva", dataInicio: recentDate, dataFim: null, situacao: "ativa" }],
      [],
    );
    expect(flag).toBeNull();
  });

  it("não flag se há marco de denúncia (depois do início)", () => {
    const dataAntiga = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const dataDenuncia = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    const flag = detectExcessoPrazoPreventiva(
      [{ tipo: "preventiva", dataInicio: dataAntiga, dataFim: null, situacao: "ativa" }],
      [{ tipo: "denuncia", data: dataDenuncia }],
    );
    expect(flag).toBeNull();
  });
});

describe("detectExcessoPrazoPreventiva — consciência de fase", () => {
  const diasAtras = (n: number) =>
    new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

  it("flag na INSTRUÇÃO quando preso há mais que o limite, mesmo com denúncia", () => {
    const flag = detectExcessoPrazoPreventiva(
      [{ tipo: "preventiva", dataInicio: diasAtras(160), dataFim: null, situacao: "ativa" }],
      [{ tipo: "recebimento-denuncia", data: diasAtras(120) }],
    );
    expect(flag).toBeTruthy();
    expect(flag!.fase).toBe("instrucao");
    expect(flag!.limiteDias).toBe(150);
    expect(flag!.diasExcedidos).toBeGreaterThanOrEqual(8);
  });

  it("não flag na instrução quando ainda dentro do limite (120d < 150d)", () => {
    const flag = detectExcessoPrazoPreventiva(
      [{ tipo: "preventiva", dataInicio: diasAtras(120), dataFim: null, situacao: "ativa" }],
      [{ tipo: "denuncia", data: diasAtras(90) }],
    );
    expect(flag).toBeNull();
  });

  it("fase pós-sentença usa limite maior e ainda detecta excesso", () => {
    const flag = detectExcessoPrazoPreventiva(
      [{ tipo: "preventiva", dataInicio: diasAtras(600), dataFim: null, situacao: "ativa" }],
      [{ tipo: "sentenca", data: diasAtras(120) }],
    );
    expect(flag).toBeTruthy();
    expect(flag!.fase).toBe("pos-sentenca");
    expect(flag!.limiteDias).toBe(540);
  });

  it("não flag pós-sentença dentro do limite (200d < 540d)", () => {
    const flag = detectExcessoPrazoPreventiva(
      [{ tipo: "preventiva", dataInicio: diasAtras(200), dataFim: null, situacao: "ativa" }],
      [{ tipo: "sentenca", data: diasAtras(150) }],
    );
    expect(flag).toBeNull();
  });

  it("severidade: pré-denúncia escala para 'red' acima de 20d de excesso", () => {
    const flag = detectExcessoPrazoPreventiva(
      [{ tipo: "preventiva", dataInicio: diasAtras(120), dataFim: null, situacao: "ativa" }],
      [],
    );
    expect(flag!.fase).toBe("pre-denuncia");
    expect(flag!.nivel).toBe("red");
  });

  it("severidade: excesso pequeno fica 'amber'", () => {
    const flag = detectExcessoPrazoPreventiva(
      [{ tipo: "preventiva", dataInicio: diasAtras(90), dataFim: null, situacao: "ativa" }],
      [],
    );
    expect(flag!.nivel).toBe("amber");
  });

  it("ignora prisão não-preventiva ativa (só flagrante)", () => {
    const flag = detectExcessoPrazoPreventiva(
      [{ tipo: "flagrante", dataInicio: diasAtras(200), dataFim: null, situacao: "ativa" }],
      [],
    );
    expect(flag).toBeNull();
  });
});

describe("detectFlagranteSemCustodia", () => {
  it("flag quando flagrante há ≥1 dia sem audiência custódia", () => {
    const ontem = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    const flag = detectFlagranteSemCustodia(
      [{ tipo: "flagrante", dataInicio: ontem, dataFim: null, situacao: "ativa" }],
      [],
    );
    expect(flag).toBeTruthy();
  });

  it("não flag se há marco de audiência custódia em 24h", () => {
    const ontem = new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10);
    const flag = detectFlagranteSemCustodia(
      [{ tipo: "flagrante", dataInicio: ontem, dataFim: null, situacao: "ativa" }],
      [{ tipo: "audiencia-custodia", data: ontem }],
    );
    expect(flag).toBeNull();
  });
});
