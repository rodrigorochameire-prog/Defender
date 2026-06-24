// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AreaTabs } from "./area-tabs";
import { AREA_ORDER } from "./areas-mae";

afterEach(() => cleanup());

describe("AreaTabs", () => {
  it("renderiza um tab por área informada, com rótulo legível", () => {
    render(<AreaTabs areas={AREA_ORDER} active="resumo" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /Resumo/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Estratégia/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Prova oral/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Documentos/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Execução/i })).toBeInTheDocument();
  });

  it("marca o tab ativo com aria-selected", () => {
    render(<AreaTabs areas={AREA_ORDER} active="prova-oral" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /Prova oral/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Resumo/i })).toHaveAttribute("aria-selected", "false");
  });

  it("dispara onChange com a área ao clicar", () => {
    const onChange = vi.fn();
    render(<AreaTabs areas={AREA_ORDER} active="resumo" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: /Documentos/i }));
    expect(onChange).toHaveBeenCalledWith("documentos");
  });

  it("mostra contagem por área quando fornecida", () => {
    render(
      <AreaTabs
        areas={["resumo", "prova-oral"]}
        active="resumo"
        onChange={() => {}}
        counts={{ "prova-oral": 3 }}
      />
    );
    expect(screen.getByRole("tab", { name: /Prova oral/i })).toHaveTextContent("3");
  });

  it("só renderiza as áreas passadas (esconde modos vazios)", () => {
    render(<AreaTabs areas={["resumo", "execucao"]} active="resumo" onChange={() => {}} />);
    expect(screen.queryByRole("tab", { name: /Estratégia/i })).toBeNull();
    expect(screen.getByRole("tab", { name: /Execução/i })).toBeInTheDocument();
  });
});
