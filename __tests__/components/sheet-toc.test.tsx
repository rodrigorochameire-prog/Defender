// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SheetToC } from "@/components/agenda/sheet/sheet-toc";

afterEach(() => cleanup());

const sections = [
  { id: "fatos", label: "Fatos" },
  { id: "depoentes", label: "Depoentes", count: 3 },
  { id: "teses", label: "Teses" },
];

describe("SheetToC", () => {
  it("renderiza apenas chips passados", () => {
    render(<SheetToC sections={sections} onJump={() => {}} />);
    expect(screen.getByText("Fatos")).toBeInTheDocument();
    expect(screen.getByText("Depoentes")).toBeInTheDocument();
    expect(screen.getByText("Teses")).toBeInTheDocument();
  });

  it("mostra count quando presente", () => {
    render(<SheetToC sections={sections} onJump={() => {}} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("chama onJump com id do chip clicado", () => {
    const onJump = vi.fn();
    render(<SheetToC sections={sections} onJump={onJump} />);
    fireEvent.click(screen.getByRole("button", { name: /teses/i }));
    expect(onJump).toHaveBeenCalledWith("teses");
  });

  it("destaca chip ativo", () => {
    render(<SheetToC sections={sections} activeId="depoentes" onJump={() => {}} />);
    const chip = screen.getByRole("button", { name: /depoentes/i });
    expect(chip.className).toMatch(/bg-foreground/);
  });

  it("não renderiza nada quando sections está vazio", () => {
    const { container } = render(<SheetToC sections={[]} onJump={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
