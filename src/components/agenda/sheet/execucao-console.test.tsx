// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ExecucaoConsole } from "./execucao-console";

afterEach(() => cleanup());

describe("ExecucaoConsole", () => {
  it("mostra 'Em aberto' e gravações quando não concluída", () => {
    render(<ExecucaoConsole resumo={{ concluida: false, pendencias: 0, gravacoes: 2 }} />);
    expect(screen.getByText("Em aberto")).toBeInTheDocument();
    expect(screen.getByText("gravações")).toBeInTheDocument();
  });

  it("mostra 'Concluída' quando concluída", () => {
    render(<ExecucaoConsole resumo={{ concluida: true, pendencias: 0, gravacoes: 0 }} />);
    expect(screen.getByText("Concluída")).toBeInTheDocument();
  });

  it("sinaliza pendências em aberto (atenção)", () => {
    render(<ExecucaoConsole resumo={{ concluida: false, pendencias: 3, gravacoes: 0 }} />);
    expect(screen.getByText(/pendências/i)).toBeInTheDocument();
  });

  it("sem pendências, não mostra o alerta", () => {
    render(<ExecucaoConsole resumo={{ concluida: false, pendencias: 0, gravacoes: 1 }} />);
    expect(screen.queryByText(/pendência/i)).toBeNull();
  });
});
