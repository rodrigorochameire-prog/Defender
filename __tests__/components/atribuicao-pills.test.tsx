// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AtribuicaoPills } from "@/components/demandas-premium/AtribuicaoPills";

afterEach(() => cleanup());

const OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "Tribunal do Júri", label: "Tribunal do Júri" },
  { value: "Execução Penal", label: "Execução Penal" },
];

describe("AtribuicaoPills (iconOnly/dark)", () => {
  it("renderiza um botão por atribuição + 'Todas' (por title)", () => {
    render(<AtribuicaoPills options={OPTIONS} selectedValues={[]} onToggle={() => {}} onClear={() => {}} variant="dark" iconOnly />);
    expect(screen.getByTitle("Todas")).toBeInTheDocument();
    expect(screen.getByTitle("Tribunal do Júri")).toBeInTheDocument();
    expect(screen.getByTitle("Execução Penal")).toBeInTheDocument();
  });

  it("clicar numa atribuição chama onToggle com o value", () => {
    const onToggle = vi.fn();
    render(<AtribuicaoPills options={OPTIONS} selectedValues={[]} onToggle={onToggle} onClear={() => {}} variant="dark" iconOnly />);
    fireEvent.click(screen.getByTitle("Execução Penal"));
    expect(onToggle).toHaveBeenCalledWith("Execução Penal");
  });

  it("clicar em 'Todas' chama onClear", () => {
    const onClear = vi.fn();
    render(<AtribuicaoPills options={OPTIONS} selectedValues={["Tribunal do Júri"]} onToggle={() => {}} onClear={onClear} variant="dark" iconOnly />);
    fireEvent.click(screen.getByTitle("Todas"));
    expect(onClear).toHaveBeenCalled();
  });

  it("botão de limpar (X) aparece com seleção e chama onClear (multi-select)", () => {
    const onClear = vi.fn();
    const { container } = render(
      <AtribuicaoPills options={OPTIONS} selectedValues={["Tribunal do Júri"]} onToggle={() => {}} onClear={onClear} variant="dark" iconOnly />,
    );
    const buttons = container.querySelectorAll("button");
    fireEvent.click(buttons[buttons.length - 1]);
    expect(onClear).toHaveBeenCalled();
  });

  it("em singleSelect não dispara onToggle ao reclicar a já selecionada", () => {
    const onToggle = vi.fn();
    render(<AtribuicaoPills options={OPTIONS} selectedValues={["Tribunal do Júri"]} onToggle={onToggle} onClear={() => {}} singleSelect variant="dark" iconOnly />);
    fireEvent.click(screen.getByTitle("Tribunal do Júri"));
    expect(onToggle).not.toHaveBeenCalled();
  });
});
