// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MergePairCard } from "@/components/pessoas/merge-pair-card";

afterEach(() => cleanup());

const pair = {
  a: { id: 42, nome: "Maria Silva", cpf: null, categoriaPrimaria: "testemunha", confidence: "0.9" },
  b: { id: 87, nome: "Maria Silva", cpf: null, categoriaPrimaria: "testemunha", confidence: "0.9" },
};

describe("MergePairCard", () => {
  it("mostra nomes dos dois lados", () => {
    render(<MergePairCard pair={pair} onMerge={() => {}} onDistinct={() => {}} />);
    expect(screen.getAllByText("Maria Silva").length).toBeGreaterThanOrEqual(2);
  });

  it("dispara onMerge com direção correta (mesclar em A)", () => {
    const onMerge = vi.fn();
    render(<MergePairCard pair={pair} onMerge={onMerge} onDistinct={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /mesclar em #42/i }));
    expect(onMerge).toHaveBeenCalledWith({ fromId: 87, intoId: 42 });
  });

  it("dispara onDistinct", () => {
    const onDistinct = vi.fn();
    render(<MergePairCard pair={pair} onMerge={() => {}} onDistinct={onDistinct} />);
    fireEvent.click(screen.getByRole("button", { name: /distintas/i }));
    expect(onDistinct).toHaveBeenCalledWith({ pessoaAId: 42, pessoaBId: 87 });
  });
});
