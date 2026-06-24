// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { SheetToC } from "@/components/agenda/sheet/sheet-toc";

// Radix DropdownMenu depende de APIs de PointerCapture/scrollIntoView que o
// happy-dom não implementa por padrão. Os shims abaixo permitem que o menu
// abra de fato no ambiente de teste.
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

afterEach(() => cleanup());

const sections = [
  { id: "fatos", label: "Fatos" },
  { id: "depoentes", label: "Depoentes", count: 3 },
  { id: "teses", label: "Teses" },
];

// Abre o dropdown via o gatilho (botão único da nav).
function openMenu() {
  const trigger = screen.getByRole("button", { name: /ir para seção/i });
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
  fireEvent.pointerUp(trigger, { button: 0 });
  fireEvent.click(trigger);
  return trigger;
}

describe("SheetToC", () => {
  it("gatilho compacto mostra a seção ativa como rótulo", () => {
    render(<SheetToC sections={sections} activeId="depoentes" onJump={() => {}} />);
    const trigger = screen.getByRole("button", { name: /ir para seção/i });
    expect(trigger).toHaveTextContent("Depoentes");
  });

  it("sem seção ativa, o rótulo cai na primeira seção", () => {
    render(<SheetToC sections={sections} onJump={() => {}} />);
    const trigger = screen.getByRole("button", { name: /ir para seção/i });
    expect(trigger).toHaveTextContent("Fatos");
  });

  it("ao abrir, lista todas as seções no menu", () => {
    render(<SheetToC sections={sections} onJump={() => {}} />);
    openMenu();
    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("Fatos")).toBeInTheDocument();
    expect(within(menu).getByText("Depoentes")).toBeInTheDocument();
    expect(within(menu).getByText("Teses")).toBeInTheDocument();
  });

  it("mostra count quando presente", () => {
    render(<SheetToC sections={sections} onJump={() => {}} />);
    openMenu();
    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("3")).toBeInTheDocument();
  });

  it("chama onJump com id do item clicado", () => {
    const onJump = vi.fn();
    render(<SheetToC sections={sections} onJump={onJump} />);
    openMenu();
    const menu = screen.getByRole("menu");
    fireEvent.click(within(menu).getByText("Teses"));
    expect(onJump).toHaveBeenCalledWith("teses");
  });

  it("indica a seção ativa no menu (item marcado)", () => {
    render(<SheetToC sections={sections} activeId="depoentes" onJump={() => {}} />);
    openMenu();
    const menu = screen.getByRole("menu");
    const item = within(menu).getByText("Depoentes").closest('[role="menuitem"]') as HTMLElement;
    // O item ativo recebe o tom de texto sólido (neutral-900 / dark:neutral-100).
    expect(item.className).toMatch(/text-neutral-900/);
  });

  it("não renderiza nada quando sections está vazio", () => {
    const { container } = render(<SheetToC sections={[]} onJump={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
