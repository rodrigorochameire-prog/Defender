// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { SheetModeTabs } from "@/components/demandas-premium/sheet/SheetModeTabs";

afterEach(() => cleanup());

const MODES = [
  { key: "registros", label: "Registros", count: 3 },
  { key: "dados", label: "Dados" },
  { key: "autos", label: "Autos", count: 0 },
  { key: "producao", label: "Produção" },
];

describe("SheetModeTabs", () => {
  it("renderiza uma aba por modo com role=tab", () => {
    render(<SheetModeTabs modes={MODES} active="registros" onChange={() => {}} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
    expect(screen.getByText("Registros")).toBeInTheDocument();
    expect(screen.getByText("Produção")).toBeInTheDocument();
  });

  it("marca a aba ativa com aria-selected", () => {
    render(<SheetModeTabs modes={MODES} active="dados" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /Dados/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Registros/ })).toHaveAttribute("aria-selected", "false");
  });

  it("chama onChange com a key ao clicar numa aba", () => {
    const onChange = vi.fn();
    render(<SheetModeTabs modes={MODES} active="registros" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: /Autos/ }));
    expect(onChange).toHaveBeenCalledWith("autos");
  });

  it("mostra badge de count só quando > 0", () => {
    render(<SheetModeTabs modes={MODES} active="registros" onChange={() => {}} />);
    expect(screen.getByText("3")).toBeInTheDocument(); // registros count=3
    expect(screen.queryByText("0")).not.toBeInTheDocument(); // autos count=0 → escondido
  });

  it("retorna null sem modos", () => {
    const { container } = render(<SheetModeTabs modes={[]} active="" onChange={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
