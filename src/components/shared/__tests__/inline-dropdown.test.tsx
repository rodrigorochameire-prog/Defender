// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { InlineDropdown } from "../inline-dropdown";

afterEach(() => cleanup());

describe("InlineDropdown — Scroll dentro de modal (scroll-lock do Radix)", () => {
  const manyOptions = Array.from({ length: 40 }, (_, i) => ({
    value: `v${i}`,
    label: `Opção ${i}`,
  }));

  it("consome o wheel no portal (preventDefault) para scrollar programaticamente", () => {
    render(
      <InlineDropdown
        value="v0"
        displayValue={<span>Trigger</span>}
        options={manyOptions}
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Trigger"));

    const portal = document.querySelector(
      '[data-inline-dropdown-portal="true"]',
    ) as HTMLElement;
    expect(portal).not.toBeNull();

    // fireEvent retorna false quando preventDefault foi chamado pelo handler
    expect(fireEvent.wheel(portal, { deltaY: 40, cancelable: true })).toBe(false);
  });

  it("acompanha o item destacado com scrollIntoView na navegação por teclado", () => {
    const spy = vi.fn();
    Element.prototype.scrollIntoView = spy;
    render(
      <InlineDropdown
        value="v0"
        displayValue={<span>Trigger</span>}
        options={manyOptions}
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Trigger"));
    fireEvent.keyDown(document, { key: "ArrowDown" });

    expect(spy).toHaveBeenCalled();
  });
});

describe("InlineDropdown — Portal rendering", () => {
  it("renderiza opções no document.body (fora do parent overflow-hidden)", () => {
    const onChange = vi.fn();
    render(
      <div style={{ overflow: "hidden", width: 100, height: 50 }} data-testid="parent">
        <InlineDropdown
          value="A"
          displayValue={<span>A</span>}
          options={[
            { value: "A", label: "Alpha" },
            { value: "B", label: "Beta" },
            { value: "C", label: "Gamma" },
          ]}
          onChange={onChange}
        />
      </div>,
    );

    const trigger = screen.getByText("A");
    fireEvent.click(trigger);

    const beta = screen.getByText("Beta");
    const parent = screen.getByTestId("parent");

    // Beta existe e NÃO é descendente do parent overflow-hidden
    expect(beta).toBeInTheDocument();
    expect(parent.contains(beta)).toBe(false);
  });

  it("dispara onChange ao clicar opção", () => {
    const onChange = vi.fn();
    render(
      <InlineDropdown
        value="A"
        displayValue={<span>A</span>}
        options={[
          { value: "A", label: "Alpha" },
          { value: "B", label: "Beta" },
        ]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByText("A"));
    fireEvent.click(screen.getByText("Beta"));

    expect(onChange).toHaveBeenCalledWith("B");
  });
});

describe("InlineDropdown — Barra de busca visível", () => {
  it("mostra placeholder ao abrir e filtra ao digitar", () => {
    render(
      <InlineDropdown
        value="A"
        displayValue={<span>Trigger</span>}
        options={[
          { value: "A", label: "Alpha" },
          { value: "B", label: "Beta" },
        ]}
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Trigger"));

    expect(screen.getByText("Digite para filtrar…")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "b" });
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.queryByText("Digite para filtrar…")).not.toBeInTheDocument();
  });
});
