// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CaseSwitcher } from "@/components/hierarquia/caso-switcher";

afterEach(() => cleanup());

const mockUseQuery = vi.fn();

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    casos: {
      getCasosDoAssistido: {
        useQuery: (...args: any[]) => mockUseQuery(...args),
      },
    },
  },
}));

describe("CaseSwitcher", () => {
  it("mostra título do caso ativo", () => {
    mockUseQuery.mockReturnValue({
      data: [
        { id: 1, titulo: "Caso A", status: "ativo" },
        { id: 2, titulo: "Caso B", status: "ativo" },
      ],
      isLoading: false,
    });
    render(<CaseSwitcher assistidoId={100} activeCasoId={1} />);
    expect(screen.getByText("Caso A")).toBeInTheDocument();
  });

  it("click abre dropdown listando outros casos", () => {
    mockUseQuery.mockReturnValue({
      data: [
        { id: 1, titulo: "Caso A", status: "ativo" },
        { id: 2, titulo: "Caso B", status: "ativo" },
      ],
      isLoading: false,
    });
    render(<CaseSwitcher assistidoId={100} activeCasoId={1} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Caso B")).toBeInTheDocument();
  });

  it("com 1 caso, botão fica disabled (sem chevron clicável)", () => {
    mockUseQuery.mockReturnValue({
      data: [{ id: 1, titulo: "Único caso", status: "ativo" }],
      isLoading: false,
    });
    render(<CaseSwitcher assistidoId={100} activeCasoId={1} />);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
  });
});
