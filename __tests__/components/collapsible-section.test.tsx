// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CollapsibleSection } from "@/components/agenda/sheet/collapsible-section";

describe("CollapsibleSection", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("renderiza fechado por default", () => {
    render(
      <CollapsibleSection id="test" label="Teste">
        <p>conteudo</p>
      </CollapsibleSection>
    );
    // Radix hides content via data-state and display:none animation; we check it's not in accessibility tree
    const content = screen.queryByText("conteudo");
    // Content may be in DOM (Radix renders it) but aria-hidden or data-state="closed"
    const panel = document.querySelector('[data-state="closed"]');
    expect(panel).toBeTruthy();
  });

  it("abre ao clicar no header", () => {
    render(
      <CollapsibleSection id="test2" label="Teste2">
        <p>conteudo2</p>
      </CollapsibleSection>
    );
    fireEvent.click(screen.getByRole("button", { name: /teste2/i }));
    expect(screen.getByText("conteudo2")).toBeInTheDocument();
    expect(document.querySelector('[data-state="open"]')).toBeTruthy();
  });

  it("respeita defaultOpen", () => {
    render(
      <CollapsibleSection id="test3" label="Teste3" defaultOpen>
        <p>conteudo3</p>
      </CollapsibleSection>
    );
    expect(document.querySelector('[data-state="open"]')).toBeTruthy();
  });

  it("persiste estado em localStorage", () => {
    const { unmount } = render(
      <CollapsibleSection id="persistente" label="P">
        <p>c</p>
      </CollapsibleSection>
    );
    fireEvent.click(screen.getByRole("button", { name: /p/i }));
    unmount();
    render(
      <CollapsibleSection id="persistente" label="P">
        <p>c2</p>
      </CollapsibleSection>
    );
    expect(document.querySelector('[data-state="open"]')).toBeTruthy();
  });

  it("exibe count quando fornecido", () => {
    render(
      <CollapsibleSection id="x" label="Depoentes" count={3}>
        <p>c</p>
      </CollapsibleSection>
    );
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
