// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { RegistrosToolbar } from "../registros-toolbar";

afterEach(() => cleanup());

const baseProps = {
  busca: "", onBusca: vi.fn(),
  filtroTipo: null, onFiltroTipo: vi.fn(),
  tiposComContagem: [{ tipo: "diligencia" as const, count: 2 }, { tipo: "ciencia" as const, count: 1 }],
  ordem: "recente" as const, onOrdem: vi.fn(),
};

describe("RegistrosToolbar", () => {
  it("expands search and reports typing", () => {
    const onBusca = vi.fn();
    render(<RegistrosToolbar {...baseProps} onBusca={onBusca} />);
    fireEvent.click(screen.getByRole("button", { name: /buscar/i }));
    fireEvent.change(screen.getByLabelText(/buscar registros/i), { target: { value: "resp" } });
    expect(onBusca).toHaveBeenCalledWith("resp");
  });
  it("toggles sort order", () => {
    const onOrdem = vi.fn();
    render(<RegistrosToolbar {...baseProps} ordem="recente" onOrdem={onOrdem} />);
    fireEvent.click(screen.getByRole("button", { name: /ordenar/i }));
    expect(onOrdem).toHaveBeenCalledWith("antigo");
  });
  it("filters by tipo from the dropdown", () => {
    const onFiltroTipo = vi.fn();
    render(<RegistrosToolbar {...baseProps} onFiltroTipo={onFiltroTipo} />);
    fireEvent.click(screen.getByRole("button", { name: /filtrar por tipo/i }));
    // the dropdown should list the present tipos with counts; click "Diligência"
    fireEvent.click(screen.getByText(/Diligência/i));
    expect(onFiltroTipo).toHaveBeenCalledWith("diligencia");
  });
  it("resets the filter when clicking Todos", () => {
    const onFiltroTipo = vi.fn();
    render(<RegistrosToolbar {...baseProps} filtroTipo="diligencia" onFiltroTipo={onFiltroTipo} />);
    fireEvent.click(screen.getByRole("button", { name: /filtrar por tipo/i }));
    fireEvent.click(screen.getByText(/^Todos$/));
    expect(onFiltroTipo).toHaveBeenCalledWith(null);
  });
});
