// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TabHistorico } from "@/components/agenda/registro-audiencia/tabs/tab-historico";

afterEach(() => cleanup());

const atualVazio = {
  eventoId: "e1",
  dataRealizacao: "",
  realizada: true,
  assistidoCompareceu: undefined,
  resultado: "",
  depoentes: [],
  manifestacaoMP: "",
  manifestacaoDefesa: "",
  decisaoJuiz: "",
  encaminhamentos: "",
  anotacoesGerais: "",
  atendimentoReuAntes: "",
  estrategiasDefesa: "",
  registradoPor: "",
  dataRegistro: "",
} as any;

const anterior = {
  historicoId: "h1",
  ...atualVazio,
  dataRealizacao: "2026-04-02",
  resultado: "instrucao_encerrada",
  assistidoCompareceu: true,
  realizada: true,
  depoentes: [{ id: "1", nome: "João" }],
};

describe("TabHistorico", () => {
  it("sem anteriores: default sub-tab Em edição", () => {
    render(<TabHistorico registrosAnteriores={[]} registroAtual={atualVazio} statusAtual="" />);
    expect(screen.getByRole("tab", { name: /em edição/i })).toHaveAttribute("aria-selected", "true");
  });

  it("com anteriores: default sub-tab Anteriores, primeiro aberto", () => {
    render(<TabHistorico registrosAnteriores={[anterior]} registroAtual={atualVazio} statusAtual="agendada" />);
    expect(screen.getByRole("tab", { name: /anteriores/i })).toHaveAttribute("aria-selected", "true");
    // Card aberto renderiza RegistroPreviewCard com Presença
    expect(screen.getAllByText(/presença|presente/i).length).toBeGreaterThan(0);
  });

  it("'Registro Atual' antigo não aparece fora de Em edição (regressão Fase 3)", () => {
    render(<TabHistorico registrosAnteriores={[anterior]} registroAtual={atualVazio} statusAtual="agendada" />);
    expect(screen.queryByText(/^registro atual$/i)).toBeNull();
  });

  it("contador de registros no header", () => {
    render(<TabHistorico registrosAnteriores={[anterior, anterior]} registroAtual={atualVazio} statusAtual="agendada" />);
    expect(screen.getByText(/2 registros salvos/i)).toBeInTheDocument();
  });
});
