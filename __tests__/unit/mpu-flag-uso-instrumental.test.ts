import { describe, it, expect } from "vitest";
import { avaliarUsoInstrumental } from "@/lib/mpu/flag-uso-instrumental";

// Datas relativas a um "pedido de MPU" fixo para testes determinísticos.
const PEDIDO = "2026-03-01";
const diasAntes = (n: number) => {
  const d = new Date("2026-03-01T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

describe("avaliarUsoInstrumental", () => {
  it("sem nenhum indicador → score 0, inativo", () => {
    const r = avaliarUsoInstrumental({ dataPedidoMpu: PEDIDO });
    expect(r.score).toBe(0);
    expect(r.ativo).toBe(false);
    expect(r.fatores).toEqual([]);
  });

  it("divórcio iniciado <90d antes do pedido → +2", () => {
    const r = avaliarUsoInstrumental({
      dataPedidoMpu: PEDIDO,
      divorcioEmCurso: true,
      divorcioDataInicio: diasAntes(30),
    });
    expect(r.score).toBe(2);
  });

  it("divórcio iniciado há mais de 90d → não pontua", () => {
    const r = avaliarUsoInstrumental({
      dataPedidoMpu: PEDIDO,
      divorcioEmCurso: true,
      divorcioDataInicio: diasAntes(200),
    });
    expect(r.score).toBe(0);
  });

  it("ausência de violência física E sexual → +1 (só se tipos conhecidos)", () => {
    const comTipos = avaliarUsoInstrumental({
      dataPedidoMpu: PEDIDO,
      tiposViolencia: ["psicologica", "moral"],
    });
    expect(comTipos.score).toBe(1);
    // tipos desconhecidos/vazios → conservador, não pontua
    const semTipos = avaliarUsoInstrumental({ dataPedidoMpu: PEDIDO, tiposViolencia: [] });
    expect(semTipos.score).toBe(0);
    // com violência física → não pontua
    const comFisica = avaliarUsoInstrumental({ dataPedidoMpu: PEDIDO, tiposViolencia: ["fisica"] });
    expect(comFisica.score).toBe(0);
  });

  it("retratação policial seguida de nova denúncia → +2", () => {
    const r = avaliarUsoInstrumental({
      dataPedidoMpu: PEDIDO,
      retratacaoPolicialData: diasAntes(120),
      denunciaOferecida: true,
      dataDenuncia: diasAntes(40), // denúncia depois da retratação
    });
    expect(r.score).toBe(2);
  });

  it("retratação sem nova denúncia posterior → não pontua", () => {
    const r = avaliarUsoInstrumental({
      dataPedidoMpu: PEDIDO,
      retratacaoPolicialData: diasAntes(40),
      denunciaOferecida: true,
      dataDenuncia: diasAntes(120), // denúncia ANTES da retratação
    });
    expect(r.score).toBe(0);
  });

  it("requerente recorrente → +2", () => {
    expect(avaliarUsoInstrumental({ dataPedidoMpu: PEDIDO, requerenteRecorrente: true }).score).toBe(2);
  });

  it("ativa só com score >= 3 (threshold rigoroso)", () => {
    // divórcio recente (+2) + imóvel em disputa (+1) = 3 → ativo
    const r = avaliarUsoInstrumental({
      dataPedidoMpu: PEDIDO,
      divorcioEmCurso: true,
      divorcioDataInicio: diasAntes(20),
      imovelConjugalEmDisputa: true,
    });
    expect(r.score).toBe(3);
    expect(r.ativo).toBe(true);
    expect(r.fatores.map((f) => f.peso).reduce((a, b) => a + b, 0)).toBe(3);
  });

  it("score 2 (um indicador forte) NÃO ativa", () => {
    const r = avaliarUsoInstrumental({
      dataPedidoMpu: PEDIDO,
      guardaEmDisputa: true,
      guardaDataInicio: diasAntes(10),
    });
    expect(r.score).toBe(2);
    expect(r.ativo).toBe(false);
  });

  it("sem dataPedidoMpu, os indicadores temporais não pontuam (conservador)", () => {
    const r = avaliarUsoInstrumental({
      divorcioEmCurso: true,
      divorcioDataInicio: "2026-02-01",
      guardaEmDisputa: true,
      guardaDataInicio: "2026-02-15",
    });
    expect(r.score).toBe(0); // sem referência temporal, não afirma proximidade
  });
});
