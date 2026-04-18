// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PessoaSheet } from "@/components/pessoas/pessoa-sheet";

afterEach(() => cleanup());

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: any) => <div>{children}</div>,
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    pessoas: {
      getById: {
        useQuery: vi.fn(() => ({
          data: {
            pessoa: {
              id: 1,
              nome: "Maria Silva",
              nomeNormalizado: "maria silva",
              cpf: null,
              fonteCriacao: "backfill",
              confidence: "0.9",
              categoriaPrimaria: "testemunha",
              createdAt: new Date("2026-01-01").toISOString(),
            },
            participacoes: [
              { id: 10, pessoaId: 1, processoId: 100, papel: "testemunha", lado: "acusacao" },
            ],
          },
          isLoading: false,
        })),
      },
    },
  },
}));

describe("PessoaSheet", () => {
  it("renderiza nome + categoria", () => {
    render(<PessoaSheet pessoaId={1} open onOpenChange={() => {}} />);
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
  });

  it("não renderiza quando pessoaId é null", () => {
    render(<PessoaSheet pessoaId={null} open={true} onOpenChange={() => {}} />);
    expect(screen.queryByText("Maria Silva")).toBeNull();
  });

  it("mostra tabs", () => {
    render(<PessoaSheet pessoaId={1} open onOpenChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /visão geral/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /processos/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /mídias/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /proveniência/i })).toBeInTheDocument();
  });

  it("tab processos mostra participações", () => {
    render(<PessoaSheet pessoaId={1} open onOpenChange={() => {}} />);
    fireEvent.click(screen.getByRole("tab", { name: /processos/i }));
    expect(screen.getAllByText(/testemunha/i).length).toBeGreaterThan(0);
  });
});
