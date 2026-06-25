// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DistribuicaoBar } from "../distribuicao-bar";

afterEach(() => cleanup());

const entries = [
  { label: "Dr. Rodrigo", value: 7, colorClass: "bg-emerald-500", initial: "R" },
  { label: "Dra. Juliane", value: 3, colorClass: "bg-violet-500", initial: "J" },
];

describe("DistribuicaoBar", () => {
  it("exibe o rótulo e o valor de cada entrada", () => {
    render(<DistribuicaoBar entries={entries} />);
    expect(screen.getByText("Dr. Rodrigo")).toBeInTheDocument();
    expect(screen.getByText("Dra. Juliane")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renderiza barras com largura proporcional ao valor (7 vs 3)", () => {
    const { container } = render(<DistribuicaoBar entries={entries} />);
    const bars = Array.from(
      container.querySelectorAll<HTMLElement>("[data-distribuicao-bar]")
    );
    expect(bars).toHaveLength(2);
    // max = 7 → Rodrigo 100%, Juliane 3/7 ≈ 42.857%
    expect(bars[0].style.width).toBe("100%");
    expect(parseFloat(bars[1].style.width)).toBeCloseTo((3 / 7) * 100, 1);
  });

  it("a cor de cada segmento vem da prop (não é literal no componente)", () => {
    const { container } = render(
      <DistribuicaoBar
        entries={[
          { label: "A", value: 1, colorClass: "bg-fuchsia-700", initial: "A" },
          { label: "B", value: 1, colorClass: "bg-lime-700", initial: "B" },
        ]}
      />
    );
    const bars = Array.from(
      container.querySelectorAll<HTMLElement>("[data-distribuicao-bar]")
    );
    expect(bars[0].className).toContain("bg-fuchsia-700");
    expect(bars[1].className).toContain("bg-lime-700");
  });

  it("indica paridade quando os dois primeiros valores são iguais", () => {
    render(
      <DistribuicaoBar
        entries={[
          { label: "A", value: 5, colorClass: "bg-emerald-500", initial: "A" },
          { label: "B", value: 5, colorClass: "bg-violet-500", initial: "B" },
        ]}
      />
    );
    expect(screen.getByText("=")).toBeInTheDocument();
    expect(screen.getByText(/Paridade/i)).toBeInTheDocument();
  });

  it("mostra a diferença com sinal quando há desequilíbrio (7 vs 3 → +4)", () => {
    render(<DistribuicaoBar entries={entries} />);
    expect(screen.getByText("+4")).toBeInTheDocument();
    expect(screen.getByText(/Diferença/i)).toBeInTheDocument();
  });
});
