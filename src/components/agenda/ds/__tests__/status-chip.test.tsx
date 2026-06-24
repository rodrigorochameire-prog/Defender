// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { StatusChip } from "../status-chip";

afterEach(() => cleanup());

describe("StatusChip", () => {
  it("renderiza o rótulo do status da audiência", () => {
    render(<StatusChip kind="audiencia" status="realizada" />);
    expect(screen.getByText("Realizada")).toBeInTheDocument();
  });

  it("aplica as classes da pílula do registry", () => {
    render(<StatusChip kind="audiencia" status="cancelada" />);
    expect(screen.getByText("Cancelada").className).toMatch(/rose/);
  });

  it("mostra o ponto indicador quando dot=true", () => {
    const { container } = render(
      <StatusChip kind="preparo" status="parcial" dot />
    );
    // O dot é um <span> com classe de cor de fundo
    expect(container.querySelector("span[aria-hidden]")).not.toBeNull();
  });

  it("não depende exclusivamente de cor: o texto comunica o status", () => {
    render(<StatusChip kind="preparo" status="pendente" />);
    expect(screen.getByText(/Pendente/i)).toBeInTheDocument();
  });

  it("aceita um VisualTipo direto via prop info", () => {
    render(
      <StatusChip
        info={{ label: "Custom", badge: "bg-sky-50 text-sky-700", dot: "bg-sky-500" }}
      />
    );
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });
});
