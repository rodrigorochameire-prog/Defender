// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TimelineCard } from "@/components/agenda/registro-audiencia/historico/timeline-card";

afterEach(() => cleanup());

const concluida = {
  historicoId: "h1",
  eventoId: "e1",
  dataRealizacao: "2026-04-02",
  realizada: true,
  resultado: "instrucao_encerrada",
  assistidoCompareceu: true,
  depoentes: [{ id: "1", nome: "João" }, { id: "2", nome: "Maria" }],
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

const redesignada = {
  ...concluida,
  historicoId: "h2",
  realizada: false,
  resultado: "redesignada",
  motivoRedesignacao: "ausência juiz",
  dataRedesignacao: "2026-05-01",
};

describe("TimelineCard", () => {
  it("fechado mostra data e status badge", () => {
    render(<TimelineCard registro={concluida} isOpen={false} onToggle={() => {}} />);
    expect(screen.getByText(/abril|abr|04\/02|02\/04|02 de abril/i)).toBeInTheDocument();
    expect(screen.getByText(/concluída/i)).toBeInTheDocument();
  });

  it("fechado: highlight para concluída mostra resultado + contagem", () => {
    render(<TimelineCard registro={concluida} isOpen={false} onToggle={() => {}} />);
    expect(screen.getByText(/instrucao_encerrada|2 depoentes/i)).toBeInTheDocument();
  });

  it("fechado: highlight para redesignada mostra motivo", () => {
    render(<TimelineCard registro={redesignada} isOpen={false} onToggle={() => {}} />);
    expect(screen.getByText(/ausência juiz/i)).toBeInTheDocument();
  });

  it("aberto renderiza RegistroPreviewCard (mostra Presença)", () => {
    render(<TimelineCard registro={concluida} isOpen={true} onToggle={() => {}} />);
    expect(screen.getAllByText(/presença|presente/i).length).toBeGreaterThan(0);
  });

  it("chama onToggle no click", () => {
    const onToggle = vi.fn();
    render(<TimelineCard registro={concluida} isOpen={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalled();
  });

  it("border-left emerald para concluída", () => {
    const { container } = render(<TimelineCard registro={concluida} isOpen={false} onToggle={() => {}} />);
    expect(container.firstElementChild?.className ?? "").toMatch(/border-l-emerald/);
  });

  it("border-left rose para redesignada", () => {
    const { container } = render(<TimelineCard registro={redesignada} isOpen={false} onToggle={() => {}} />);
    expect(container.firstElementChild?.className ?? "").toMatch(/border-l-rose/);
  });
});
