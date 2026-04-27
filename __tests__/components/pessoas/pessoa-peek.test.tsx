// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PessoaPeek } from "@/components/pessoas/pessoa-peek";

afterEach(() => cleanup());

const baseSignal = {
  pessoaId: 1,
  totalCasos: 3,
  casosRecentes6m: 1, casosRecentes12m: 2,
  papeisCount: { testemunha: 3 },
  papelPrimario: "testemunha" as string | null,
  ladoAcusacao: 2, ladoDefesa: 1,
  lastSeenAt: new Date("2025-11-15"), firstSeenAt: new Date("2024-03-01"),
  sameComarcaCount: 2, ambiguityFlag: false,
  contradicoesConhecidas: 0, consistenciasDetectadas: 0, highValueFlag: false,
};

describe("PessoaPeek", () => {
  it("renderiza nome + papel", () => {
    render(<PessoaPeek nome="Maria Silva" signal={baseSignal as any} />);
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    expect(screen.getByText(/testemunha/i)).toBeInTheDocument();
  });

  it("mostra contagem de casos", () => {
    render(<PessoaPeek nome="Maria" signal={baseSignal as any} />);
    expect(screen.getByText(/3 casos/i)).toBeInTheDocument();
  });

  it("mostra distribuição acusação/defesa", () => {
    render(<PessoaPeek nome="Maria" signal={baseSignal as any} />);
    expect(screen.getByText(/2 acusação/i)).toBeInTheDocument();
    expect(screen.getByText(/1 defesa/i)).toBeInTheDocument();
  });

  it("destaca mesma comarca quando > 0", () => {
    render(<PessoaPeek nome="Maria" signal={baseSignal as any} />);
    expect(screen.getByText(/2 casos na mesma comarca/i)).toBeInTheDocument();
  });

  it("mostra alerta de ambiguidade quando flag ativa", () => {
    const sig = { ...baseSignal, ambiguityFlag: true };
    render(<PessoaPeek nome="João" signal={sig as any} />);
    expect(screen.getByText(/possível duplicata/i)).toBeInTheDocument();
  });

  it("sem signal retorna null", () => {
    const { container } = render(<PessoaPeek nome="X" signal={null} />);
    expect(container.firstChild).toBeNull();
  });
});
