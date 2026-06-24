// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { StickyActionFooter } from "../sticky-action-footer";

afterEach(() => cleanup());

describe("StickyActionFooter", () => {
  it("renderiza os filhos (ações)", () => {
    render(
      <StickyActionFooter>
        <button>Cancelar</button>
        <button>Confirmar</button>
      </StickyActionFooter>
    );
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
  });

  it("é sticky no rodapé (classe sticky bottom-0)", () => {
    const { container } = render(
      <StickyActionFooter>
        <button>Ok</button>
      </StickyActionFooter>
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/sticky/);
    expect(root.className).toMatch(/bottom-0/);
  });

  it("aceita slot à esquerda (meta) além das ações à direita", () => {
    render(
      <StickyActionFooter leading={<span>3 selecionados</span>}>
        <button>Aplicar</button>
      </StickyActionFooter>
    );
    expect(screen.getByText("3 selecionados")).toBeInTheDocument();
  });
});
