// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { InlineDropdown } from "../inline-dropdown";

afterEach(() => cleanup());

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
