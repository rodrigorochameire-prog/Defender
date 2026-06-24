// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Calendar } from "lucide-react";
import { EmptyState } from "../empty-state";

afterEach(() => cleanup());

describe("EmptyState", () => {
  it("renderiza título e descrição", () => {
    render(
      <EmptyState
        icon={Calendar}
        title="Nenhuma audiência"
        description="Sua pauta deste dia está livre."
      />
    );
    expect(screen.getByText("Nenhuma audiência")).toBeInTheDocument();
    expect(screen.getByText("Sua pauta deste dia está livre.")).toBeInTheDocument();
  });

  it("renderiza uma única ação opcional e dispara onClick", () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        icon={Calendar}
        title="Vazio"
        action={{ label: "Nova audiência", onClick }}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Nova audiência/i }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("sem ação, não renderiza botão (evita CTA-spam)", () => {
    render(<EmptyState icon={Calendar} title="Vazio" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("usa role status para acessibilidade", () => {
    render(<EmptyState icon={Calendar} title="Vazio" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
