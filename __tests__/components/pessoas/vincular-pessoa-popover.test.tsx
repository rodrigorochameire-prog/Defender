// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { VincularPessoaPopover } from "@/components/pessoas/vincular-pessoa-popover";

afterEach(() => cleanup());

const selectCbMock = vi.fn();

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    pessoas: {
      searchForAutocomplete: {
        useQuery: vi.fn(() => ({
          data: [
            { id: 42, nome: "Maria Silva", categoriaPrimaria: "testemunha", confidence: "0.9" },
            { id: 87, nome: "Maria Silva", categoriaPrimaria: null, confidence: "0.5" },
          ],
          isLoading: false,
        })),
      },
      create: {
        useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
      },
    },
  },
}));

describe("VincularPessoaPopover", () => {
  beforeEach(() => { selectCbMock.mockClear(); });

  it("busca e lista matches ao digitar", () => {
    render(<VincularPessoaPopover query="maria" onSelect={selectCbMock} />);
    expect(screen.getAllByText(/maria silva/i).length).toBeGreaterThan(0);
  });

  it("selecionar match chama onSelect com pessoaId", () => {
    render(<VincularPessoaPopover query="maria" onSelect={selectCbMock} />);
    const button = screen.getAllByRole("button", { name: /maria silva/i })[0];
    fireEvent.click(button);
    expect(selectCbMock).toHaveBeenCalledWith(42);
  });

  it("mostra opção 'criar nova'", () => {
    render(<VincularPessoaPopover query="fulano novo" onSelect={selectCbMock} onCreateNew={() => {}} />);
    expect(screen.getByText(/criar nova/i)).toBeInTheDocument();
  });
});
