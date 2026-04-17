// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { HistoricoSubTabs } from "@/components/agenda/registro-audiencia/historico/historico-sub-tabs";

afterEach(() => cleanup());

describe("HistoricoSubTabs", () => {
  it("renderiza ambas as tabs", () => {
    render(<HistoricoSubTabs active="edicao" anterioresCount={2} completudeCount={3} onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /em edição/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /anteriores/i })).toBeInTheDocument();
  });

  it("mostra contador de anteriores", () => {
    render(<HistoricoSubTabs active="edicao" anterioresCount={4} completudeCount={3} onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /anteriores/i }).textContent).toContain("4");
  });

  it("mostra badge de completude na tab Em edição", () => {
    render(<HistoricoSubTabs active="edicao" anterioresCount={0} completudeCount={3} onChange={() => {}} />);
    const emEdicaoTab = screen.getByRole("tab", { name: /em edição/i });
    expect(emEdicaoTab.textContent).toContain("3/5");
  });

  it("badge emerald quando completo", () => {
    render(<HistoricoSubTabs active="edicao" anterioresCount={0} completudeCount={5} onChange={() => {}} />);
    const emEdicaoTab = screen.getByRole("tab", { name: /em edição/i });
    expect(emEdicaoTab.textContent).toContain("Completo");
  });

  it("tab ativa tem aria-selected=true", () => {
    render(<HistoricoSubTabs active="anteriores" anterioresCount={2} completudeCount={3} onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /anteriores/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /em edição/i })).toHaveAttribute("aria-selected", "false");
  });

  it("chama onChange ao clicar", () => {
    const onChange = vi.fn();
    render(<HistoricoSubTabs active="edicao" anterioresCount={2} completudeCount={3} onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: /anteriores/i }));
    expect(onChange).toHaveBeenCalledWith("anteriores");
  });
});
