// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { CollapsibleSection } from "../collapsible-section";

afterEach(() => { cleanup(); localStorage.clear(); });

describe("CollapsibleSection", () => {
  it("não-controlado: persiste no storageKey informado", () => {
    render(
      <CollapsibleSection id="s1" label="Seção" storageKey="demandas-sheet-sections-open">
        <p>conteúdo</p>
      </CollapsibleSection>
    );
    fireEvent.click(screen.getByRole("button", { name: /Seção/i }));
    const raw = JSON.parse(localStorage.getItem("demandas-sheet-sections-open") || "{}");
    expect(raw.s1).toBe(true);
    expect(localStorage.getItem("agenda-sheet-sections-open")).toBeNull();
  });

  it("controlado: não escreve localStorage e chama onOpenChange", () => {
    const onOpenChange = vi.fn();
    render(
      <CollapsibleSection
        id="s2" label="Sec2" open={false} onOpenChange={onOpenChange}
        storageKey="demandas-sheet-sections-open"
      >
        <p>c</p>
      </CollapsibleSection>
    );
    fireEvent.click(screen.getByRole("button", { name: /Sec2/i }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(localStorage.getItem("demandas-sheet-sections-open")).toBeNull();
  });

  it("default storageKey continua sendo o da Agenda", () => {
    render(<CollapsibleSection id="s3" label="Sec3"><p>c</p></CollapsibleSection>);
    fireEvent.click(screen.getByRole("button", { name: /Sec3/i }));
    expect(localStorage.getItem("agenda-sheet-sections-open")).not.toBeNull();
  });
});
