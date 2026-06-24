// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { PjeCopyHelp } from "@/components/demandas-premium/pje-copy-help";

afterEach(() => cleanup());

describe("PjeCopyHelp", () => {
  it("vem recolhida por padrão (passos ocultos, textarea fica protagonista)", () => {
    render(<PjeCopyHelp />);
    const toggle = screen.getByRole("button", { name: /Como copiar do PJe/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/Intimações Pendentes/)).not.toBeInTheDocument();
  });

  it("expande ao clicar e revela o passo-a-passo", () => {
    render(<PjeCopyHelp />);
    const toggle = screen.getByRole("button", { name: /Como copiar do PJe/ });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/Intimações Pendentes/)).toBeInTheDocument();
  });

  it("recolhe de volta ao clicar de novo", () => {
    render(<PjeCopyHelp defaultOpen />);
    const toggle = screen.getByRole("button", { name: /Como copiar do PJe/ });
    expect(screen.getByText(/Intimações Pendentes/)).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByText(/Intimações Pendentes/)).not.toBeInTheDocument();
  });
});
