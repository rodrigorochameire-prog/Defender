// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { DemandaCardActions } from "@/components/demandas-premium/DemandaCardActions";

// Polyfills mínimos p/ o Radix DropdownMenu rodar em happy-dom.
beforeAll(() => {
  (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = vi.fn();
  (Element.prototype as unknown as { hasPointerCapture: () => boolean }).hasPointerCapture = () => false;
  (Element.prototype as unknown as { releasePointerCapture: () => void }).releasePointerCapture = vi.fn();
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => cleanup());

// Radix abre o menu por teclado de forma confiável no happy-dom (click depende de PointerEvent).
function openMenu() {
  fireEvent.keyDown(screen.getByRole("button", { name: "Mais ações" }), { key: "Enter" });
}

function setup(over: Partial<Parameters<typeof DemandaCardActions>[0]> = {}) {
  const props = {
    href: "/admin/demandas/abc",
    onEdit: vi.fn(),
    onArchive: vi.fn(),
    onUnarchive: vi.fn(),
    onDelete: vi.fn(),
    ...over,
  };
  render(<DemandaCardActions {...props} />);
  return props;
}

describe("DemandaCardActions", () => {
  it("mostra a ação principal 'Abrir' como link com o href correto", () => {
    setup();
    const link = screen.getByRole("link");
    expect(link).toHaveTextContent("Abrir");
    expect(link).toHaveAttribute("href", "/admin/demandas/abc");
  });

  it("as ações secundárias ficam recolhidas no overflow (não aparecem por padrão)", () => {
    setup();
    expect(screen.getByRole("button", { name: "Mais ações" })).toBeInTheDocument();
    expect(screen.queryByText("Editar")).not.toBeInTheDocument();
    expect(screen.queryByText("Excluir")).not.toBeInTheDocument();
    expect(screen.queryByText("Arquivar")).not.toBeInTheDocument();
  });

  it("abrir o overflow revela Editar/Arquivar/Excluir e dispara os handlers", () => {
    const props = setup();
    openMenu();
    fireEvent.click(screen.getByText("Editar"));
    expect(props.onEdit).toHaveBeenCalledTimes(1);
    openMenu();
    fireEvent.click(screen.getByText("Excluir"));
    expect(props.onDelete).toHaveBeenCalledTimes(1);
  });

  it("respeita arquivado: mostra 'Restaurar' em vez de 'Arquivar'", () => {
    const props = setup({ arquivado: true });
    openMenu();
    expect(screen.getByText("Restaurar")).toBeInTheDocument();
    expect(screen.queryByText("Arquivar")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Restaurar"));
    expect(props.onUnarchive).toHaveBeenCalledTimes(1);
  });
});
