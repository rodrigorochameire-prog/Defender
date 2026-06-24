// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { DemandasEmptyState } from "@/components/demandas-premium/DemandasEmptyState";

afterEach(() => cleanup());

describe("DemandasEmptyState", () => {
  it("com filtros ativos: mensagem de filtros + ação 'Limpar filtros' que dispara", () => {
    const onClearFilters = vi.fn();
    render(<DemandasEmptyState hasActiveFilters onClearFilters={onClearFilters} />);
    expect(screen.getByText("Nenhuma demanda para estes filtros")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("arquivadas vazias: mensagem própria, sem ação de limpar", () => {
    render(<DemandasEmptyState showArchived />);
    expect(screen.getByText("Nenhuma demanda arquivada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument();
  });

  it("caso geral: convida a criar quando onCreate é passado", () => {
    const onCreate = vi.fn();
    render(<DemandasEmptyState onCreate={onCreate} />);
    expect(screen.getByText("Nenhuma demanda ainda")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Nova demanda/ }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("filtros ativos têm prioridade sobre arquivadas", () => {
    render(<DemandasEmptyState hasActiveFilters showArchived onClearFilters={() => {}} />);
    expect(screen.getByText("Nenhuma demanda para estes filtros")).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma demanda arquivada")).not.toBeInTheDocument();
  });
});
