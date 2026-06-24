// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { PrazoCockpitBar } from "@/components/demandas-premium/PrazoCockpitBar";

afterEach(() => cleanup());

describe("PrazoCockpitBar", () => {
  it("renderiza os 4 chips com rótulo e contagem", () => {
    render(<PrazoCockpitBar counts={{ atrasados: 3, hoje: 1, semana: 7, sem_prazo: 2 }} activeFilters={[]} onToggle={() => {}} />);
    expect(screen.getByText("Atrasados")).toBeInTheDocument();
    expect(screen.getByText("Vencem hoje")).toBeInTheDocument();
    expect(screen.getByText("Esta semana")).toBeInTheDocument();
    expect(screen.getByText("Sem prazo")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("headline 'exige(m) ação' quando há urgência (atrasados+hoje)", () => {
    render(<PrazoCockpitBar counts={{ atrasados: 2, hoje: 1 }} activeFilters={[]} onToggle={() => {}} />);
    expect(screen.getByText(/3 exigem ação/)).toBeInTheDocument();
  });

  it("headline 'Prazos em dia' sem urgência", () => {
    render(<PrazoCockpitBar counts={{ semana: 5 }} activeFilters={[]} onToggle={() => {}} />);
    expect(screen.getByText("Prazos em dia")).toBeInTheDocument();
  });

  it("clicar num chip chama onToggle com a key", () => {
    const onToggle = vi.fn();
    render(<PrazoCockpitBar counts={{ atrasados: 1 }} activeFilters={[]} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: /Atrasados/ }));
    expect(onToggle).toHaveBeenCalledWith("atrasados");
  });

  it("aria-pressed reflete o filtro ativo", () => {
    render(<PrazoCockpitBar counts={{ hoje: 1 }} activeFilters={["hoje"]} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: /Vencem hoje/ })).toHaveAttribute("aria-pressed", "true");
  });
});
