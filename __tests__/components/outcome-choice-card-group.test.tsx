// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { OutcomeChoiceCardGroup } from "@/components/atendimentos/outcome-choice-card-group";

afterEach(() => cleanup());

describe("OutcomeChoiceCardGroup — desfecho em cards de escolha (não radios crus)", () => {
  it("renderiza os 3 desfechos como radiogroup acessível", () => {
    render(<OutcomeChoiceCardGroup value="nenhuma" onChange={() => {}} />);
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByText("Só atendimento")).toBeInTheDocument();
    expect(screen.getByText("Gerar demanda")).toBeInTheDocument();
    expect(screen.getByText("Atendimento e orientação")).toBeInTheDocument();
  });

  it("marca apenas o card selecionado (aria-checked)", () => {
    render(<OutcomeChoiceCardGroup value="demanda" onChange={() => {}} />);
    const checked = screen.getAllByRole("radio").filter((r) => r.getAttribute("aria-checked") === "true");
    expect(checked).toHaveLength(1);
    expect(checked[0]).toHaveTextContent("Gerar demanda");
  });

  it("clicar num card chama onChange com o valor", () => {
    const onChange = vi.fn();
    render(<OutcomeChoiceCardGroup value="nenhuma" onChange={onChange} />);
    fireEvent.click(screen.getByText("Gerar demanda"));
    expect(onChange).toHaveBeenCalledWith("demanda");
  });

  it("cada card é um botão focável (não input radio cru)", () => {
    const { container } = render(<OutcomeChoiceCardGroup value="nenhuma" onChange={() => {}} />);
    expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(0);
    expect(container.querySelectorAll('button[role="radio"]')).toHaveLength(3);
  });
});
