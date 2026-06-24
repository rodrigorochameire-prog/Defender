// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ProceduralActSelector } from "@/components/atendimentos/procedural-act-selector";
import { filtrarAtos } from "@/components/atendimentos/gerar-demanda-logic";

afterEach(() => cleanup());

const ATRIB = "JURI_CAMACARI";
const grupos = filtrarAtos(ATRIB, "");
const primeiroGrupo = grupos[0];
const primeiraOpcao = primeiroGrupo.options[0];

describe("ProceduralActSelector — seletor de ato com busca + agrupamento", () => {
  it("mostra o valor atual no campo (texto livre preservado)", () => {
    render(<ProceduralActSelector atribuicao={ATRIB} value="Ato livre qualquer" onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveValue("Ato livre qualquer");
  });

  it("renderiza atos agrupados por categoria", () => {
    render(<ProceduralActSelector atribuicao={ATRIB} value="" onChange={() => {}} />);
    expect(screen.getByText(primeiroGrupo.group)).toBeInTheDocument();
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0);
  });

  it("clicar numa opção chama onChange com o rótulo", () => {
    const onChange = vi.fn();
    render(<ProceduralActSelector atribuicao={ATRIB} value="" onChange={onChange} />);
    fireEvent.click(screen.getByRole("option", { name: primeiraOpcao.label }));
    expect(onChange).toHaveBeenCalledWith(primeiraOpcao.label);
  });

  it("digitar no campo chama onChange (busca = texto livre)", () => {
    const onChange = vi.fn();
    render(<ProceduralActSelector atribuicao={ATRIB} value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "petição" } });
    expect(onChange).toHaveBeenCalledWith("petição");
  });

  it("filtra a lista conforme o valor", () => {
    render(<ProceduralActSelector atribuicao={ATRIB} value={primeiraOpcao.label.slice(0, 5)} onChange={() => {}} />);
    const labels = screen.getAllByRole("option").map((o) => o.textContent);
    expect(labels).toContain(primeiraOpcao.label);
  });

  it("valor sem correspondência no catálogo não quebra (texto livre, sem opções)", () => {
    render(<ProceduralActSelector atribuicao={ATRIB} value="zzz-nao-existe-xyz" onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveValue("zzz-nao-existe-xyz");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });
});
