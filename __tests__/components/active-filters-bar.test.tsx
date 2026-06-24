// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ActiveFiltersBar } from "@/components/demandas-premium/ActiveFiltersBar";

afterEach(() => cleanup());

const CHIPS = [
  { key: "status", label: "Diligências" },
  { key: "atrib:JURI", label: "Tribunal do Júri" },
  { key: "prazo", label: "Atrasados" },
];

describe("ActiveFiltersBar", () => {
  it("renderiza um chip por filtro", () => {
    render(<ActiveFiltersBar chips={CHIPS} onClear={() => {}} onClearAll={() => {}} />);
    expect(screen.getByText("Diligências")).toBeInTheDocument();
    expect(screen.getByText("Tribunal do Júri")).toBeInTheDocument();
    expect(screen.getByText("Atrasados")).toBeInTheDocument();
  });

  it("clicar num chip chama onClear com a key do filtro", () => {
    const onClear = vi.fn();
    render(<ActiveFiltersBar chips={CHIPS} onClear={onClear} onClearAll={() => {}} />);
    fireEvent.click(screen.getByTitle("Remover filtro: Tribunal do Júri"));
    expect(onClear).toHaveBeenCalledWith("atrib:JURI");
  });

  it("'Limpar tudo' aparece com >1 chip e chama onClearAll", () => {
    const onClearAll = vi.fn();
    render(<ActiveFiltersBar chips={CHIPS} onClear={() => {}} onClearAll={onClearAll} />);
    fireEvent.click(screen.getByText("Limpar tudo"));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it("com 1 chip, não mostra 'Limpar tudo'", () => {
    render(<ActiveFiltersBar chips={[{ key: "prazo", label: "Hoje" }]} onClear={() => {}} onClearAll={() => {}} />);
    expect(screen.queryByText("Limpar tudo")).not.toBeInTheDocument();
  });

  it("sem chips → não renderiza nada", () => {
    const { container } = render(<ActiveFiltersBar chips={[]} onClear={() => {}} onClearAll={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
