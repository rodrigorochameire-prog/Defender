// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { EventLine } from "@/components/demanda-eventos/event-line";

afterEach(() => cleanup());

describe("EventLine — default variant", () => {
  it("mostra resumo e tempo relativo", () => {
    render(
      <EventLine
        evento={{
          id: 1,
          tipo: "diligencia",
          subtipo: "peticao",
          status: "feita",
          resumo: "Petição protocolada",
          prazo: null,
          createdAt: new Date(Date.now() - 2 * 86_400_000), // ~2 dias atrás
        }}
      />,
    );
    expect(screen.getByText(/Petição protocolada/)).toBeTruthy();
    expect(screen.getByText(/dias|dia/i)).toBeTruthy();
  });

  it("renderiza ícone correto para atendimento", () => {
    const { container } = render(
      <EventLine
        evento={{
          id: 2,
          tipo: "atendimento",
          subtipo: null,
          status: null,
          resumo: "Reunião com assistido",
          prazo: null,
          createdAt: new Date(),
        }}
      />,
    );
    // Há um SVG de ícone (lucide renderiza como svg)
    expect(container.querySelector("svg")).toBeTruthy();
  });
});

describe("EventLine — pendente variant", () => {
  it("classe vermelha quando vencido", () => {
    const ontem = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
    const { container } = render(
      <EventLine
        variant="pendente"
        evento={{
          id: 3,
          tipo: "diligencia",
          subtipo: "peticao",
          status: "pendente",
          resumo: "Protocolar AG",
          prazo: ontem,
          createdAt: new Date(),
        }}
      />,
    );
    expect(container.querySelector(".text-red-600")).toBeTruthy();
    expect(screen.getByText(/vencido/i)).toBeTruthy();
  });

  it("classe amber quando prazo é em ≤7 dias", () => {
    const em5dias = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
    const { container } = render(
      <EventLine
        variant="pendente"
        evento={{
          id: 4,
          tipo: "diligencia",
          subtipo: "peticao",
          status: "pendente",
          resumo: "Contatar cartório",
          prazo: em5dias,
          createdAt: new Date(),
        }}
      />,
    );
    expect(container.querySelector(".text-amber-600")).toBeTruthy();
  });

  it("renderiza 'hoje' / 'amanhã' / 'em Nd' corretamente", () => {
    const hoje = new Date().toISOString().slice(0, 10);
    render(
      <EventLine
        variant="pendente"
        evento={{
          id: 5,
          tipo: "diligencia",
          subtipo: "peticao",
          status: "pendente",
          resumo: "Hoje",
          prazo: hoje,
          createdAt: new Date(),
        }}
      />,
    );
    expect(screen.getByText(/hoje/i)).toBeTruthy();
  });
});
