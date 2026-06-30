import { describe, it, expect } from "vitest";
import { statusEventoDePedido, tituloPedido, projecaoEventoDePedido } from "../projecao";
describe("statusEventoDePedido", () => {
  it("maps estado to vf status", () => {
    expect(statusEventoDePedido("solicitado")).toBe("pendente");
    expect(statusEventoDePedido("em_analise")).toBe("em_curso");
    expect(statusEventoDePedido("deferido")).toBe("concluido");
    expect(statusEventoDePedido("indeferido")).toBe("arquivado");
  });
});
describe("tituloPedido", () => {
  it("uses the assunto, with fallback", () => {
    expect(tituloPedido("Certidão de tempo de serviço")).toBe("Certidão de tempo de serviço");
    expect(tituloPedido("  ")).toBe("Solicitação administrativa");
  });
});
describe("projecaoEventoDePedido", () => {
  it("builds the projection carrying prazo, no valorCents/dataFim", () => {
    const p = projecaoEventoDePedido({ id: 4, assunto: "Auxílio-saúde", dataPedido: "2026-07-01", prazo: "2026-07-20", estado: "em_analise" });
    expect(p).toEqual({
      tipo: "SOLICITACAO_ADM", cluster: "administrativo", titulo: "Auxílio-saúde",
      dataEvento: "2026-07-01", prazo: "2026-07-20", status: "em_curso", dados: { pedidoId: 4 },
    });
    expect("valorCents" in p).toBe(false);
    expect("dataFim" in p).toBe(false);
  });
  it("accepts null id + null prazo", () => {
    const p = projecaoEventoDePedido({ id: null, assunto: "X", dataPedido: "2026-07-01", prazo: null, estado: "solicitado" });
    expect(p.dados.pedidoId).toBeNull();
    expect(p.prazo).toBeNull();
    expect(p.status).toBe("pendente");
  });
});
