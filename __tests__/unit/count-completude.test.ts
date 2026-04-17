import { describe, it, expect } from "vitest";
import { countCompletude } from "@/components/agenda/registro-audiencia/historico/count-completude";

describe("countCompletude", () => {
  const empty = {
    resultado: "",
    assistidoCompareceu: undefined,
    anotacoesGerais: "",
    depoentes: [],
  };

  it("retorna 1 quando só status está preenchido", () => {
    expect(countCompletude(empty, "agendada")).toBe(1);
  });

  it("retorna 5 quando tudo preenchido", () => {
    expect(countCompletude(
      { resultado: "instrucao_encerrada", assistidoCompareceu: true, anotacoesGerais: "abc", depoentes: [{ id: "1", nome: "João" }] },
      "concluida"
    )).toBe(5);
  });

  it("assistidoCompareceu=false ainda conta como preenchido", () => {
    expect(countCompletude(
      { resultado: "", assistidoCompareceu: false, anotacoesGerais: "", depoentes: [] },
      "concluida"
    )).toBe(2);
  });

  it("depoentes vazio não conta", () => {
    expect(countCompletude(empty, "concluida")).toBe(1);
  });

  it("depoentes com 1 item conta", () => {
    expect(countCompletude(
      { ...empty, depoentes: [{ id: "1", nome: "Maria" }] },
      "concluida"
    )).toBe(2);
  });
});
