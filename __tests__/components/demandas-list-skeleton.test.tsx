// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DemandasListSkeleton } from "@/components/demandas-premium/DemandasListSkeleton";

afterEach(() => cleanup());

describe("DemandasListSkeleton", () => {
  it("renderiza 6 cards-fantasma por padrão", () => {
    render(<DemandasListSkeleton />);
    expect(screen.getAllByTestId("demanda-skeleton-card")).toHaveLength(6);
  });

  it("respeita a contagem passada", () => {
    render(<DemandasListSkeleton count={3} />);
    expect(screen.getAllByTestId("demanda-skeleton-card")).toHaveLength(3);
  });

  it("expõe estado de carregamento acessível (aria-busy + label)", () => {
    render(<DemandasListSkeleton />);
    const region = screen.getByLabelText("Carregando demandas");
    expect(region).toHaveAttribute("aria-busy", "true");
  });
});
