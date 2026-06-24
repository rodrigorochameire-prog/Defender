// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PriorityBadge } from "../priority-badge";

afterEach(() => cleanup());

describe("PriorityBadge", () => {
  it("renderiza o rótulo da prioridade do caso", () => {
    render(<PriorityBadge prioridade="REU_PRESO" />);
    expect(screen.getByText("Réu preso")).toBeInTheDocument();
  });

  it("réu preso usa o tom de máxima urgência (rose)", () => {
    render(<PriorityBadge prioridade="REU_PRESO" />);
    expect(screen.getByText("Réu preso").className).toMatch(/rose/);
  });

  it("normaliza caixa (urgente minúsculo)", () => {
    render(<PriorityBadge prioridade="urgente" />);
    expect(screen.getByText("Urgente")).toBeInTheDocument();
  });

  it("não renderiza nada quando prioridade é nula", () => {
    const { container } = render(<PriorityBadge prioridade={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("omite NORMAL/BAIXA por padrão (ruído baixo) mas mostra se forçado", () => {
    const { container, rerender } = render(<PriorityBadge prioridade="NORMAL" />);
    expect(container.firstChild).toBeNull();
    rerender(<PriorityBadge prioridade="NORMAL" showLowPriority />);
    expect(screen.getByText("Normal")).toBeInTheDocument();
  });
});
