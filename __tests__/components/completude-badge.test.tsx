// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { CompletudeBadge } from "@/components/agenda/registro-audiencia/historico/completude-badge";

afterEach(() => cleanup());

describe("CompletudeBadge", () => {
  it("mostra X/Y quando incompleto", () => {
    render(<CompletudeBadge count={3} total={5} />);
    expect(screen.getByText(/3\/5/i)).toBeInTheDocument();
  });

  it("mostra ✓ Completo quando count === total", () => {
    render(<CompletudeBadge count={5} total={5} />);
    expect(screen.getByText(/completo/i)).toBeInTheDocument();
  });

  it("classe emerald quando completo", () => {
    const { container } = render(<CompletudeBadge count={5} total={5} />);
    expect(container.firstElementChild?.className ?? "").toMatch(/emerald/);
  });

  it("classe neutral quando incompleto", () => {
    const { container } = render(<CompletudeBadge count={2} total={5} />);
    expect(container.firstElementChild?.className ?? "").toMatch(/neutral/);
  });
});
