// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AreaTabs } from "./area-tabs";
import { AREA_ORDER } from "./areas-mae";

afterEach(() => cleanup());

describe("AreaTabs", () => {
  it("renderiza um tab por área informada, com rótulo legível", () => {
    render(<AreaTabs areas={AREA_ORDER} active="imputacao" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /Caso/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Depoimentos/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Laudos e documentos/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Estratégia e teses/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Execução/i })).toBeInTheDocument();
  });

  it("marca o tab ativo com aria-selected", () => {
    render(<AreaTabs areas={AREA_ORDER} active="depoimentos" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /Depoimentos/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Caso/i })).toHaveAttribute("aria-selected", "false");
  });

  it("dispara onChange com a área ao clicar", () => {
    const onChange = vi.fn();
    render(<AreaTabs areas={AREA_ORDER} active="imputacao" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: /Laudos e documentos/i }));
    expect(onChange).toHaveBeenCalledWith("laudos-docs");
  });

  it("mostra contagem por área quando fornecida", () => {
    render(
      <AreaTabs
        areas={["imputacao", "depoimentos"]}
        active="imputacao"
        onChange={() => {}}
        counts={{ "depoimentos": 3 }}
      />
    );
    expect(screen.getByRole("tab", { name: /Depoimentos/i })).toHaveTextContent("3");
  });

  it("só renderiza as áreas passadas (esconde modos vazios)", () => {
    render(<AreaTabs areas={["imputacao", "execucao"]} active="imputacao" onChange={() => {}} />);
    expect(screen.queryByRole("tab", { name: /Estratégia/i })).toBeNull();
    expect(screen.getByRole("tab", { name: /Execução/i })).toBeInTheDocument();
  });
});
