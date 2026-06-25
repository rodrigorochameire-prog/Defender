// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Calendar, Plus } from "lucide-react";
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

  it("aplica a cor da variante search (azul) ao halo do ícone", () => {
    const { container } = render(
      <EmptyState icon={Calendar} title="Busca vazia" variant="search" />
    );
    const halo = container.querySelector(".rounded-full");
    expect(halo?.className).toContain("text-blue-500");
  });

  it("aplica a cor da variante error (rose) ao halo do ícone", () => {
    const { container } = render(
      <EmptyState icon={Calendar} title="Erro" variant="error" />
    );
    const halo = container.querySelector(".rounded-full");
    expect(halo?.className).toContain("text-rose-500");
  });

  it("variante default usa halo neutro", () => {
    const { container } = render(<EmptyState icon={Calendar} title="Vazio" />);
    const halo = container.querySelector(".rounded-full");
    expect(halo?.className).toContain("bg-neutral-100");
  });

  it("size sm reduz a densidade vertical do container", () => {
    const { container: sm } = render(
      <EmptyState icon={Calendar} title="Vazio" size="sm" />
    );
    expect((sm.firstChild as HTMLElement).className).toContain("py-8");
    cleanup();
    const { container: lg } = render(
      <EmptyState icon={Calendar} title="Vazio" size="lg" />
    );
    expect((lg.firstChild as HTMLElement).className).toContain("py-16");
  });

  it("compact equivale a size sm (compat)", () => {
    const { container } = render(
      <EmptyState icon={Calendar} title="Vazio" compact />
    );
    expect((container.firstChild as HTMLElement).className).toContain("py-8");
  });

  it("renderiza ícone da ação quando fornecido", () => {
    render(
      <EmptyState
        icon={Calendar}
        title="Vazio"
        action={{ label: "Criar", onClick: () => {}, icon: Plus }}
      />
    );
    const btn = screen.getByRole("button", { name: /Criar/i });
    expect(btn.querySelector("svg")).not.toBeNull();
  });

  it("renderiza ação secundária e dispara onClick", () => {
    const onClear = vi.fn();
    render(
      <EmptyState
        icon={Calendar}
        title="Vazio"
        action={{ label: "Criar", onClick: () => {} }}
        secondaryAction={{ label: "Limpar filtros", onClick: onClear }}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Limpar filtros/i }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
