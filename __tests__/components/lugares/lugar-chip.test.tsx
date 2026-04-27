// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { LugarChip } from "@/components/lugares/lugar-chip";

afterEach(() => cleanup());

describe("LugarChip", () => {
  it("renderiza endereço + bairro em badge", () => {
    render(<LugarChip enderecoCompleto="Rua X, 123" bairro="Centro" />);
    expect(screen.getByText(/Rua X, 123/i)).toBeInTheDocument();
    expect(screen.getByText(/Centro/i)).toBeInTheDocument();
  });

  it("sem bairro não renderiza badge", () => {
    const { container } = render(<LugarChip enderecoCompleto="Rua X" />);
    expect(container.textContent).not.toContain("Centro");
  });

  it("click dispara onClick com lugarId", () => {
    let received: number | null = null;
    render(<LugarChip lugarId={42} enderecoCompleto="Rua X" onClick={(r) => { received = r.id ?? null; }} />);
    fireEvent.click(screen.getByRole("button"));
    expect(received).toBe(42);
  });

  it("clickable=false não vira button", () => {
    const { container } = render(<LugarChip enderecoCompleto="Rua X" clickable={false} />);
    expect(container.querySelector("button")).toBeNull();
  });
});
