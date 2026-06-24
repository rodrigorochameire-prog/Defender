// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ProvaOralConsole } from "./prova-oral-console";

afterEach(() => cleanup());

describe("ProvaOralConsole", () => {
  it("mostra total, ouvidos e a ouvir", () => {
    render(<ProvaOralConsole resumo={{ total: 4, ouvidos: 1, aOuvir: 3, intimados: 2, semCiencia: 1 }} />);
    expect(screen.getByText("depoentes")).toBeInTheDocument();
    expect(screen.getByText("ouvidos")).toBeInTheDocument();
    expect(screen.getByText("a ouvir")).toBeInTheDocument();
  });

  it("sinaliza cerceamento (sem ciência) quando há não intimados", () => {
    render(<ProvaOralConsole resumo={{ total: 3, ouvidos: 0, aOuvir: 3, intimados: 1, semCiencia: 2 }} />);
    expect(screen.getByText(/sem ciência/i)).toBeInTheDocument();
  });

  it("não mostra o alerta quando todos têm ciência", () => {
    render(<ProvaOralConsole resumo={{ total: 2, ouvidos: 0, aOuvir: 2, intimados: 2, semCiencia: 0 }} />);
    expect(screen.queryByText(/sem ciência/i)).toBeNull();
  });

  it("não renderiza nada sem depoentes", () => {
    const { container } = render(
      <ProvaOralConsole resumo={{ total: 0, ouvidos: 0, aOuvir: 0, intimados: 0, semCiencia: 0 }} />
    );
    expect(container.firstChild).toBeNull();
  });
});
