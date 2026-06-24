// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { EstrategiaConsole } from "./estrategia-console";
import { resumoEstrategia } from "@/lib/agenda/resumo-estrategia";

afterEach(() => cleanup());

describe("EstrategiaConsole", () => {
  it("mostra os 4 elementos e a contagem de extraídos", () => {
    const resumo = resumoEstrategia({ imputacao: "x", teses: [1, 2], contradicoes: [], denuncia: "" });
    render(<EstrategiaConsole resumo={resumo} />);
    expect(screen.getByText("Imputação")).toBeInTheDocument();
    expect(screen.getByText("Denúncia")).toBeInTheDocument();
    expect(screen.getByText("Teses")).toBeInTheDocument();
    expect(screen.getByText("Contradições")).toBeInTheDocument();
    expect(screen.getByText("2/4 extraídos")).toBeInTheDocument();
  });

  it("contagem aparece nos itens de lista extraídos", () => {
    const resumo = resumoEstrategia({ teses: [1, 2, 3] });
    render(<EstrategiaConsole resumo={resumo} />);
    const teses = screen.getByText("Teses").closest("span");
    expect(teses).toHaveTextContent("3");
  });

  it("itens pendentes ganham estilo tracejado de atenção", () => {
    const resumo = resumoEstrategia({});
    render(<EstrategiaConsole resumo={resumo} />);
    const imput = screen.getByText("Imputação").closest("span");
    expect(imput?.className).toMatch(/dashed/);
  });
});
